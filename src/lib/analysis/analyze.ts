/**
 * Orchestrator for the AI Match Analysis feature.
 *
 * Workflow (per project spec):
 *   1. Retrieve the fixture from the football data API.
 *   2. Retrieve both teams' statistics (schedule results, standings, provider
 *      season statistics) and the head-to-head record.
 *   3. Prepare the structured dataset.
 *   4. Send it to Touchline AI through the backend AI client.
 *   5. Validate and parse the structured JSON response.
 *   6. Persist and return the analysis.
 *   7. Optionally (on request) mirror the report text into Arabic through
 *      Touchline AI, validate it against the English numbers and persist it.
 *
 * In-flight requests are de-duplicated per match so "Analyze This Match"
 * clicks from several viewers share one gateway call.
 */
import { AI_PUBLIC_NAME } from "@/lib/ai/brand";
import { getAiConfig } from "@/lib/ai/config";
import { AiError, chatComplete } from "@/lib/ai/client";
import {
  InvalidAnalysisError,
  assertSamePredictionNumbers,
  parseAnalysis,
} from "@/lib/ai/analysis-schema";
import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_TRANSLATION_SYSTEM_PROMPT,
  buildAnalysisUserMessage,
  buildTranslationUserMessage,
} from "@/lib/ai/prompt";
import {
  buildMatchDataset,
  InsufficientMatchDataError,
} from "./dataset";
import { MatchNotFinishedError } from "./retrospective-dataset";
import {
  readStoredAnalysis,
  writeStoredAnalysis,
  type StoredAnalysis,
} from "./store";

export type { StoredAnalysis } from "./store";
import { TimeoutError } from "@/lib/http";

/** Corrective re-ask limit for structurally invalid model output. */
const INVALID_RESPONSE_RETRIES = 1;

const REGENERATION_TTL_MS: Record<string, number> = {
  // Pre-match states are stable for long stretches; regenerate conservatively.
  scheduled: 6 * 60 * 60 * 1000,
  postponed: 6 * 60 * 60 * 1000,
  canceled: 24 * 60 * 60 * 1000,
  unknown: 6 * 60 * 60 * 1000,
  // Scores change while the clock runs.
  live: 15 * 60 * 1000,
  halftime: 15 * 60 * 1000,
  // A finished match's analysis is final unless the fixture itself changes.
  finished: 24 * 60 * 60 * 1000,
};

function freshnessMs(analysis: StoredAnalysis): number {
  return REGENERATION_TTL_MS[analysis.matchState] ?? 6 * 60 * 60 * 1000;
}

const inFlight = new Map<string, Promise<StoredAnalysis>>();

/** Language the caller asked the report to be readable in. */
export type AnalysisLanguage = "en" | "ar";

function ageMs(analysis: StoredAnalysis) {
  const generated = Date.parse(analysis.generatedAt);
  if (Number.isNaN(generated)) return Number.POSITIVE_INFINITY;
  return Date.now() - generated;
}

/** Whether a stored analysis is still fresh enough to serve as a POST result. */
export function isStoredFresh(analysis: StoredAnalysis): boolean {
  return ageMs(analysis) < freshnessMs(analysis);
}

export async function getStoredAnalysis(
  matchId: string,
): Promise<StoredAnalysis | null> {
  return readStoredAnalysis(matchId);
}

export async function getOrGenerateAnalysis(
  matchId: string,
  options: { refresh?: boolean } = {},
): Promise<StoredAnalysis> {
  if (!options.refresh) {
    const stored = await readStoredAnalysis(matchId);
    if (stored && isStoredFresh(stored)) return stored;
  }

  const existing = inFlight.get(matchId);
  if (existing) return existing;

  const task = generateAnalysis(matchId).finally(() => {
    inFlight.delete(matchId);
  });
  inFlight.set(matchId, task);
  return task;
}

/**
 * Language-aware entry point: returns the stored (or freshly generated)
 * analysis, translated into Arabic on demand when the caller asked for it
 * and the Arabic mirror is not stored yet.
 */
export async function ensureAnalysisLanguage(
  matchId: string,
  options: { refresh?: boolean; language?: AnalysisLanguage } = {},
): Promise<StoredAnalysis> {
  const analysis = await getOrGenerateAnalysis(matchId, options);
  if (options.language !== "ar" || analysis.translation) return analysis;
  return translateStoredAnalysis(analysis);
}

const translationInFlight = new Map<string, Promise<StoredAnalysis>>();

/**
 * One gateway call per (match, generation): the English prediction is
 * mirrored into Arabic, validated number-for-number against the original
 * (`assertSamePredictionNumbers`) and persisted on the stored document. Any
 * failure degrades silently to the English report — a translation must
 * never break or falsify the analysis it accompanies.
 */
function translateStoredAnalysis(
  source: StoredAnalysis,
): Promise<StoredAnalysis> {
  const key = `${source.matchId}:${source.generatedAt}`;
  const running = translationInFlight.get(key);
  if (running) return running;

  const task = (async () => {
    try {
      const result = await chatComplete({
        system: ANALYSIS_TRANSLATION_SYSTEM_PROMPT,
        user: buildTranslationUserMessage(source.prediction),
      });
      const translated = parseAnalysis(result.content);
      assertSamePredictionNumbers(source.prediction, translated);

      // Re-read before writing: the pass takes tens of seconds, and the user
      // may regenerate meanwhile. A mirror of an older generation must never
      // overwrite the newer stored document (or flip it back to English).
      const persisted = await readStoredAnalysis(source.matchId);
      if (!persisted || persisted.generatedAt !== source.generatedAt) {
        return source;
      }
      if (persisted.translation) return persisted;

      const withTranslation: StoredAnalysis = {
        ...persisted,
        translation: {
          translatedAt: new Date().toISOString(),
          translatedBy: AI_PUBLIC_NAME,
          prediction: translated,
        },
      };
      await writeStoredAnalysis(withTranslation);
      return withTranslation;
    } catch (error) {
      // Best-effort by design: the English report is the source of truth.
      // The reason is logged server-side only; it never contains the key.
      console.error("[analysis-translation] attempt failed:", error);
      return source;
    }
  })();

  translationInFlight.set(key, task);
  return task.finally(() => translationInFlight.delete(key));
}

async function generateAnalysis(matchId: string): Promise<StoredAnalysis> {
  const config = getAiConfig();
  // Fail fast on a missing key before doing any upstream football work.
  if (!config.apiKey || !config.baseUrl) {
    throw new AiError(
      "not_configured",
      "Touchline AI credentials are not configured on this server.",
    );
  }

  const dataset = await buildMatchDataset(matchId);

  const userMessage = buildAnalysisUserMessage(dataset);
  let lastInvalid: InvalidAnalysisError | undefined;
  let lastTruncated = false;

  for (let attempt = 0; attempt <= INVALID_RESPONSE_RETRIES; attempt += 1) {
    const correctiveNote =
      attempt === 0
        ? ""
        : lastTruncated
          ? "\n\nNote: your previous response was cut off by the token budget. Respond with exactly one complete JSON object that follows the contract, keeping every explanation to one or two concise sentences."
          : `\n\nNote: your previous response was rejected because it did not follow the JSON contract (${lastInvalid?.reason}). Respond with exactly one valid JSON object that follows the contract, using no markdown and no commentary.`;
    const result = await chatComplete({
      system: ANALYSIS_SYSTEM_PROMPT,
      user: attempt === 0 ? userMessage : `${userMessage}${correctiveNote}`,
    });
    lastTruncated = result.truncated === true;

    try {
      const prediction = parseAnalysis(result.content);
      const analysis: StoredAnalysis = {
        version: 1,
        matchId,
        provider: "touchline-ai",
        model: AI_PUBLIC_NAME,
        answeredBy: AI_PUBLIC_NAME,
        generatedAt: new Date().toISOString(),
        matchState: dataset.fixture.state,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        dataQuality: dataset.dataQuality,
        prediction,
      };
      await writeStoredAnalysis(analysis);
      return analysis;
    } catch (error) {
      if (error instanceof InvalidAnalysisError) {
        lastInvalid = error;
        // Server-side only; the reason text never contains gateway secrets.
        console.error(
          `[analysis] attempt ${attempt + 1} rejected by contract:`,
          error.message,
        );
        continue;
      }
      if (error instanceof AiError && error.kind === "invalid_response") {
        // Unusable completion (typically a token budget exhausted by hidden
        // reasoning): one corrective re-ask before giving up.
        lastInvalid = new InvalidAnalysisError(error.message);
        console.error(
          `[analysis] attempt ${attempt + 1} returned an unusable completion:`,
          error.message,
        );
        continue;
      }
      throw error;
    }
  }

  throw new AiError(
    "invalid_response",
    lastInvalid?.message ?? "Touchline AI returned an unusable analysis.",
  );
}

export interface AnalysisFailure {
  status: number;
  code: string;
  message: string;
}

interface KnownErrorShape {
  status?: number;
}

function httpStatusOf(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as KnownErrorShape).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

/** Route-friendly error translation for every failure path. */
export function analysisFailure(error: unknown): AnalysisFailure {
  if (error instanceof AiError) {
    switch (error.kind) {
      case "not_configured":
        return {
          status: 503,
          code: "ai_not_configured",
          message:
            "Touchline AI is not configured on this server. Set AI_API_KEY in .env.local and restart.",
        };
      case "auth_failed":
        return {
          status: 502,
          code: "ai_auth_failed",
          message: error.message,
        };
      case "unsupported_model":
        return {
          status: 502,
          code: "ai_unsupported_model",
          message: error.message,
        };
      case "rate_limited":
        return {
          status: 429,
          code: "ai_rate_limited",
          message: error.message,
        };
      case "timeout":
        return {
          status: 504,
          code: "ai_timeout",
          message: error.message,
        };
      case "invalid_request":
      case "invalid_response":
        return {
          status: 502,
          code: "ai_invalid_response",
          message: error.message,
        };
      case "unavailable":
      default:
        return {
          status: 502,
          code: "ai_unavailable",
          message: error.message,
        };
    }
  }

  if (error instanceof InsufficientMatchDataError) {
    return { status: 422, code: "insufficient_match_data", message: error.message };
  }
  if (error instanceof MatchNotFinishedError) {
    return { status: 409, code: "match_not_finished", message: error.message };
  }
  if (error instanceof TimeoutError) {
    return {
      status: 504,
      code: "upstream_timeout",
      message: "The football data provider timed out. Please try again.",
    };
  }

  const upstreamStatus = httpStatusOf(error);
  if (upstreamStatus === 404) {
    return {
      status: 404,
      code: "not_found",
      message: "ESPN has no summary for that match id.",
    };
  }
  if (upstreamStatus === 429) {
    return {
      status: 429,
      code: "upstream_rate_limited",
      message: "The football data provider is rate limiting requests. Please try again shortly.",
    };
  }

  return {
    status: 502,
    code: "analysis_failed",
    message: "The match analysis could not be completed. Please try again.",
  };
}

export type { AnalysisPrediction } from "@/lib/ai/analysis-schema";
