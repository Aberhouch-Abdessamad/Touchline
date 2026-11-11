/**
 * Orchestrator for the AI Historical (retrospective) match analysis feature.
 *
 * Workflow (per project spec):
 *   1. Confirm with the provider that the match has actually finished.
 *   2. Extract the deterministic facts in code: final/half-time score,
 *      chronological event list with indexed refs, in-match statistics and
 *      the pre-match context (results and meetings strictly before kick-off).
 *   3. Send the structured dataset to Touchline AI through the backend client.
 *   4. Validate the structured JSON response, including the factual echo
 *      (winner, final and half-time score) against the extracted facts.
 *   5. Persist and return the retrospective document.
 *   6. Optionally (on request) mirror the report text into Arabic through
 *      Touchline AI, validate it against the English numbers and persist it.
 *
 * The pipeline shares the prediction feature's AI client, provider config
 * and file store; only the dataset, contract and prompts are its own.
 * In-flight requests are de-duplicated per match.
 */
import { AI_PUBLIC_NAME } from "@/lib/ai/brand";
import { getAiConfig } from "@/lib/ai/config";
import { AiError, chatComplete } from "@/lib/ai/client";
import { InvalidAnalysisError } from "@/lib/ai/analysis-schema";
import {
  assertSameHistoricalNumbers,
  parseHistorical,
} from "@/lib/ai/historical-schema";
import {
  HISTORICAL_SYSTEM_PROMPT,
  HISTORICAL_TRANSLATION_SYSTEM_PROMPT,
  buildHistoricalUserMessage,
  buildHistoricalTranslationUserMessage,
} from "@/lib/ai/prompt";
import { buildRetrospectiveDataset } from "./retrospective-dataset";
import {
  readStoredHistorical,
  writeStoredHistorical,
  type StoredHistorical,
} from "./store";
import type { AnalysisLanguage } from "./analyze";

export type { StoredHistorical } from "./store";
export type { AnalysisLanguage } from "./analyze";

/** Corrective re-ask limit for structurally invalid model output. */
const INVALID_RESPONSE_RETRIES = 1;

/**
 * A finished match never changes its result: one retrospective per match
 * stays valid for a full day, after which regeneration is allowed on request
 * (e.g. to pick up a provider-side statistics or events update).
 */
const HISTORICAL_TTL_MS = 24 * 60 * 60 * 1000;

const inFlight = new Map<string, Promise<StoredHistorical>>();
const translationInFlight = new Map<string, Promise<StoredHistorical>>();

function ageMs(analysis: StoredHistorical) {
  const generated = Date.parse(analysis.generatedAt);
  if (Number.isNaN(generated)) return Number.POSITIVE_INFINITY;
  return Date.now() - generated;
}

/** Whether a stored retrospective is fresh enough to serve as a POST result. */
export function isHistoricalFresh(analysis: StoredHistorical): boolean {
  return ageMs(analysis) < HISTORICAL_TTL_MS;
}

export async function getStoredHistorical(
  matchId: string,
): Promise<StoredHistorical | null> {
  return readStoredHistorical(matchId);
}

/**
 * One gateway call per (match, translation): the English retrospective is
 * mirrored into Arabic, validated number-for-number against the original
 * (`assertSameHistoricalNumbers`) and persisted on the stored document. Any
 * failure degrades silently to the English report — a translation must
 * never break or falsify the analysis it accompanies.
 */
function translateStoredHistorical(
  source: StoredHistorical,
): Promise<StoredHistorical> {
  const key = `${source.matchId}:${source.generatedAt}`;
  const running = translationInFlight.get(key);
  if (running) return running;

  const task = (async () => {
    try {
      const result = await chatComplete({
        system: HISTORICAL_TRANSLATION_SYSTEM_PROMPT,
        user: buildHistoricalTranslationUserMessage(source.analysis),
      });
      const translated = parseHistorical(
        result.content,
        source.facts.events.length,
        {
          winner: source.fixture.winner,
          finalScore: source.fixture.finalScore,
          htScore: source.fixture.htScore,
        },
      );
      assertSameHistoricalNumbers(source.analysis, translated);

      // Re-read before writing: the pass takes tens of seconds, and the user
      // may regenerate meanwhile. A mirror of an older generation must never
      // overwrite the newer stored document (or flip it back to English).
      const persisted = await readStoredHistorical(source.matchId);
      if (!persisted || persisted.generatedAt !== source.generatedAt) {
        return source;
      }
      if (persisted.translation) return persisted;

      const withTranslation: StoredHistorical = {
        ...persisted,
        translation: {
          translatedAt: new Date().toISOString(),
          translatedBy: AI_PUBLIC_NAME,
          analysis: translated,
        },
      };
      await writeStoredHistorical(withTranslation);
      return withTranslation;
    } catch (error) {
      // Best-effort by design: the English report is the source of truth.
      // The reason is logged server-side only; it never contains the key.
      console.error("[historical-translation] attempt failed:", error);
      return source;
    }
  })();

  translationInFlight.set(key, task);
  return task.finally(() => translationInFlight.delete(key));
}

async function generateHistorical(matchId: string): Promise<StoredHistorical> {
  const config = getAiConfig();
  // Fail fast on a missing key before doing any upstream football work.
  if (!config.apiKey || !config.baseUrl) {
    throw new AiError(
      "not_configured",
      "Touchline AI credentials are not configured on this server.",
    );
  }

  const dataset = await buildRetrospectiveDataset(matchId);

  const userMessage = buildHistoricalUserMessage(dataset);
  const facts = {
    winner: dataset.fixture.winner,
    finalScore: dataset.fixture.finalScore,
    htScore: dataset.fixture.htScore,
  };
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
      system: HISTORICAL_SYSTEM_PROMPT,
      user: attempt === 0 ? userMessage : `${userMessage}${correctiveNote}`,
    });
    lastTruncated = result.truncated === true;

    try {
      const analysis = parseHistorical(
        result.content,
        dataset.events.length,
        facts,
      );
      const historical: StoredHistorical = {
        version: 1,
        kind: "historical",
        matchId,
        provider: "touchline-ai",
        model: AI_PUBLIC_NAME,
        answeredBy: AI_PUBLIC_NAME,
        generatedAt: new Date().toISOString(),
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        dataQuality: dataset.dataQuality,
        fixture: dataset.fixture,
        facts: {
          events: dataset.events,
          timelineComplete: dataset.timelineComplete,
          substitutions: dataset.substitutions,
        },
        statistics: dataset.statistics,
        context: {
          home: dataset.preMatch.home,
          away: dataset.preMatch.away,
          headToHead: dataset.preMatch.headToHead,
          marketOdds: dataset.preMatch.marketOdds,
        },
        analysis,
      };
      await writeStoredHistorical(historical);
      return historical;
    } catch (error) {
      if (error instanceof InvalidAnalysisError) {
        lastInvalid = error;
        // Server-side only; the reason text never contains gateway secrets.
        console.error(
          `[historical] attempt ${attempt + 1} rejected by contract:`,
          error.message,
        );
        continue;
      }
      if (error instanceof AiError && error.kind === "invalid_response") {
        // Unusable completion (typically a token budget exhausted by hidden
        // reasoning): one corrective re-ask before giving up.
        lastInvalid = new InvalidAnalysisError(error.message);
        console.error(
          `[historical] attempt ${attempt + 1} returned an unusable completion:`,
          error.message,
        );
        continue;
      }
      throw error;
    }
  }

  throw new AiError(
    "invalid_response",
    lastInvalid?.message ??
      "Touchline AI returned an unusable historical analysis.",
  );
}

export async function getOrGenerateHistorical(
  matchId: string,
  options: { refresh?: boolean } = {},
): Promise<StoredHistorical> {
  if (!options.refresh) {
    const stored = await readStoredHistorical(matchId);
    if (stored && isHistoricalFresh(stored)) return stored;
  }

  const existing = inFlight.get(matchId);
  if (existing) return existing;

  const task = generateHistorical(matchId).finally(() => {
    inFlight.delete(matchId);
  });
  inFlight.set(matchId, task);
  return task;
}

/**
 * Language-aware entry point: returns the stored (or freshly generated)
 * retrospective, translated into Arabic on demand when the caller asked for
 * it and the Arabic mirror is not stored yet.
 */
export async function ensureHistoricalLanguage(
  matchId: string,
  options: { refresh?: boolean; language?: AnalysisLanguage } = {},
): Promise<StoredHistorical> {
  const historical = await getOrGenerateHistorical(matchId, options);
  if (options.language !== "ar" || historical.translation) return historical;
  return translateStoredHistorical(historical);
}
