/**
 * Orchestrator for the AI Live Match Analyst feature.
 *
 * Workflow (per project spec):
 *   1. Confirm with the provider that the match is actually in play.
 *   2. Extract the deterministic live facts in code: running score, clock,
 *      chronological event list and in-match statistics.
 *   3. Decide whether this request deserves a capture: the first capture of
 *      the match, a score change, a red card, a penalty, any new event, a
 *      statistics shift past its threshold, or the configured interval.
 *   4. Send the structured dataset (including the previous live analysis,
 *      the capture trajectory and the frozen pre-match context) to
 *      Touchline AI through the backend client.
 *   5. Validate the structured JSON response, persist it as a snapshot and
 *      return the document. The in-play pipeline never blocks the UI: a
 *      failed gateway call keeps the last stored analysis (`unchanged`).
 *   6. Optionally (on request) mirror the latest snapshot into Arabic
 *      through Touchline AI, validate it number-for-number and persist it.
 *   7. After the final whistle, compute the deterministic final report that
 *      compares the pre-match prediction, every live prediction and the
 *      actual result (`finalizeLiveReport`).
 *
 * In-flight captures are de-duplicated per match so concurrent pollers share
 * one gateway call, and a fingerprint of the captured facts suppresses
 * duplicate requests that would produce an identical analysis.
 */
import { AI_PUBLIC_NAME } from "@/lib/ai/brand";
import { getAiConfig } from "@/lib/ai/config";
import { AiError, chatComplete } from "@/lib/ai/client";
import { InvalidAnalysisError } from "@/lib/ai/analysis-schema";
import { assertSameLiveNumbers, parseLive } from "@/lib/ai/live-schema";
import {
  LIVE_SYSTEM_PROMPT,
  LIVE_TRANSLATION_SYSTEM_PROMPT,
  buildLiveTranslationUserMessage,
  buildLiveUserMessage,
} from "@/lib/ai/prompt";
import type { HistoricalWinner } from "@/lib/ai/historical-schema";
import {
  analysisFailure,
  type AnalysisFailure,
  type AnalysisLanguage,
} from "./analyze";
import {
  MatchNotLiveError,
  buildLiveDataset,
  buildLiveFacts,
  detectLiveTrigger,
  liveFingerprint,
  type LiveDataset,
  type LiveFacts,
} from "./live-dataset";
import { RateLimitExceededError } from "./rate-limit";
import {
  readStoredAnalysis,
  readStoredLive,
  writeStoredLive,
  type LiveFinalReport,
  type LiveFinalReportSnapshot,
  type LiveSwing,
  type LiveTrajectoryPoint,
  type LiveTrigger,
  type StoredLive,
  type StoredLivePreMatchPrediction,
  type StoredLiveSnapshot,
} from "./store";

export type { StoredLive } from "./store";
export type { AnalysisLanguage } from "./analyze";

/** Corrective re-ask limit for structurally invalid model output. */
const INVALID_RESPONSE_RETRIES = 1;

/**
 * Minimum time between two interval-triggered captures of one match. The
 * gateway allows a small hourly budget, so the default stays conservative
 * and the environment may tighten or relax it between 30s and 30min.
 */
const DEFAULT_INTERVAL_SECONDS = 120;
const MIN_INTERVAL_SECONDS = 30;
const MAX_INTERVAL_SECONDS = 1800;

function liveIntervalMs(): number {
  const raw = Number(process.env.AI_LIVE_MIN_INTERVAL_SECONDS);
  const seconds = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INTERVAL_SECONDS;
  return Math.min(Math.max(seconds, MIN_INTERVAL_SECONDS), MAX_INTERVAL_SECONDS) * 1000;
}

const inFlight = new Map<string, Promise<LiveCaptureResult>>();
const translationInFlight = new Map<string, Promise<StoredLive | null>>();

export type LiveCaptureStatus = "captured" | "skipped" | "unchanged";

export interface LiveCaptureResult {
  status: LiveCaptureStatus;
  /** Set when a capture was decided (also the reason a snapshot exists). */
  trigger?: LiveTrigger;
  /** Set for no-op outcomes: why nothing was generated or changed. */
  reason?: string;
  doc: StoredLive | null;
  /** The facts observed for this request, even when nothing was captured. */
  facts: LiveFacts;
}

export interface LiveCaptureOptions {
  refresh?: boolean;
  language?: AnalysisLanguage;
  /**
   * Consulted immediately before the gateway call and only then: a skipped
   * or in-flight-deduplicated request must never burn a rate-limit slot.
   * Throwing here aborts the capture (the route turns it into a 429).
   */
  gate?: () => void;
}

export async function getStoredLive(
  matchId: string,
): Promise<StoredLive | null> {
  return readStoredLive(matchId);
}

/**
 * Capture the current in-play state when a trigger justifies it. Concurrent
 * callers share one capture; a `lang=ar` request additionally mirrors the
 * latest snapshot into Arabic on demand.
 */
export async function captureLive(
  matchId: string,
  options: LiveCaptureOptions = {},
): Promise<LiveCaptureResult> {
  const running = inFlight.get(matchId);
  let result: LiveCaptureResult = running
    ? await running
    : await (async () => {
        const task = runCapture(matchId, options).finally(() =>
          inFlight.delete(matchId),
        );
        inFlight.set(matchId, task);
        return task;
      })();

  if (options.language === "ar" && result.doc) {
    const translated = await ensureLiveLanguage(matchId, "ar");
    if (translated) result = { ...result, doc: translated };
  }
  return result;
}

async function runCapture(
  matchId: string,
  options: LiveCaptureOptions,
): Promise<LiveCaptureResult> {
  const config = getAiConfig();
  // Fail fast on a missing key before doing any upstream football work.
  if (!config.apiKey || !config.baseUrl) {
    throw new AiError(
      "not_configured",
      "Touchline AI credentials are not configured on this server.",
    );
  }

  const stored = await readStoredLive(matchId);
  const dataset: LiveDataset = await buildLiveDataset(matchId, stored);
  const { facts } = dataset;
  const previous = dataset.previous;

  // ---- Trigger policy -----------------------------------------------------
  let trigger: LiveTrigger | null = options.refresh
    ? "manual"
    : detectLiveTrigger(previous, facts);
  if (!trigger && previous) {
    const captured = Date.parse(previous.capturedAt);
    const age = Number.isFinite(captured)
      ? Date.now() - captured
      : Number.POSITIVE_INFINITY;
    if (age >= liveIntervalMs()) trigger = "interval";
  }
  if (!trigger) {
    return { status: "skipped", reason: "no_trigger", doc: stored, facts };
  }

  // Duplicate-request guard: identical facts (same score, events, stats)
  // would only reproduce the stored analysis. Interval and manual captures
  // run regardless, per policy.
  const fingerprint = liveFingerprint(facts);
  if (
    trigger !== "manual" &&
    trigger !== "interval" &&
    stored?.fingerprint !== undefined &&
    stored.fingerprint === fingerprint
  ) {
    return {
      status: "skipped",
      reason: "fingerprint_unchanged",
      doc: stored,
      facts,
    };
  }

  // The gateway call is the cost: consult the limiter only now.
  options.gate?.();

  const userMessage = buildLiveUserMessage(dataset);
  let lastInvalid: InvalidAnalysisError | undefined;
  let lastTruncated = false;

  try {
    for (let attempt = 0; attempt <= INVALID_RESPONSE_RETRIES; attempt += 1) {
      const correctiveNote =
        attempt === 0
          ? ""
          : lastTruncated
            ? "\n\nNote: your previous response was cut off by the token budget. Respond with exactly one complete JSON object that follows the contract, keeping every explanation to one or two concise sentences."
            : `\n\nNote: your previous response was rejected because it did not follow the JSON contract (${lastInvalid?.reason}). Respond with exactly one valid JSON object that follows the contract, using no markdown and no commentary.`;
      const result = await chatComplete({
        system: LIVE_SYSTEM_PROMPT,
        user: attempt === 0 ? userMessage : `${userMessage}${correctiveNote}`,
      });
      lastTruncated = result.truncated === true;

      try {
        const analysis = parseLive(result.content, facts.events.length);
        const capturedAt = new Date().toISOString();
        const snapshot: StoredLiveSnapshot = {
          id: capturedAt,
          capturedAt,
          trigger,
          state: facts.match.state,
          statusLabel: facts.match.statusLabel,
          minuteLabel: facts.minuteLabel,
          clockValue: facts.clockValue,
          score: facts.score,
          events: facts.events,
          timelineComplete: facts.timelineComplete,
          statistics: facts.statistics,
          model: AI_PUBLIC_NAME,
          answeredBy: AI_PUBLIC_NAME,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          analysis,
        };
        const doc = await persistCapture(matchId, stored, dataset, {
          snapshot,
          fingerprint,
        });
        return { status: "captured", trigger, doc, facts };
      } catch (error) {
        if (error instanceof InvalidAnalysisError) {
          lastInvalid = error;
          // Server-side only; the reason text never contains gateway secrets.
          console.error(
            `[live] attempt ${attempt + 1} rejected by contract:`,
            error.message,
          );
          continue;
        }
        if (error instanceof AiError && error.kind === "invalid_response") {
          // Unusable completion (typically a token budget exhausted by hidden
          // reasoning): one corrective re-ask before giving up.
          lastInvalid = new InvalidAnalysisError(error.message);
          console.error(
            `[live] attempt ${attempt + 1} returned an unusable completion:`,
            error.message,
          );
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    // The in-play pipeline must never block the UI: a gateway failure keeps
    // the last stored analysis instead of surfacing an empty dashboard.
    if (stored && stored.snapshots.length > 0) {
      console.error("[live] capture failed; keeping the last stored analysis:", error);
      return {
        status: "unchanged",
        reason: "ai_unavailable",
        trigger,
        doc: stored,
        facts,
      };
    }
    throw error;
  }

  // Every attempt produced an unusable contract. Same degradation policy.
  if (stored && stored.snapshots.length > 0) {
    return {
      status: "unchanged",
      reason: "ai_unavailable",
      trigger,
      doc: stored,
      facts,
    };
  }
  throw new AiError(
    "invalid_response",
    lastInvalid?.message ?? "Touchline AI returned an unusable live analysis.",
  );
}

async function persistCapture(
  matchId: string,
  stored: StoredLive | null,
  dataset: LiveDataset,
  capture: { snapshot: StoredLiveSnapshot; fingerprint: string },
): Promise<StoredLive> {
  // The pre-match prediction is trimmed into the document at the first
  // capture (or whenever it appears) and never refreshed afterwards.
  const preMatchPrediction =
    stored?.preMatchPrediction ?? (await loadPreMatchPrediction(matchId));

  const doc: StoredLive = {
    version: 1,
    kind: "live",
    matchId,
    provider: "touchline-ai",
    fingerprint: capture.fingerprint,
    frozenContext: dataset.context,
    ...(preMatchPrediction ? { preMatchPrediction } : {}),
    snapshots: [...(stored?.snapshots ?? []), capture.snapshot],
    updatedAt: capture.snapshot.capturedAt,
  };
  await writeStoredLive(doc);
  return doc;
}

/** Trimmed subset of the stored (or generated) pre-match prediction. */
async function loadPreMatchPrediction(
  matchId: string,
): Promise<StoredLivePreMatchPrediction | undefined> {
  const stored = await readStoredAnalysis(matchId);
  if (!stored) return undefined;
  const prediction = stored.prediction;
  return {
    generatedAt: stored.generatedAt,
    winnerProbabilities: {
      home: prediction.winnerProbabilities.home,
      draw: prediction.winnerProbabilities.draw,
      away: prediction.winnerProbabilities.away,
    },
    predictedScore: {
      home: prediction.predictedScore.home,
      away: prediction.predictedScore.away,
    },
    expectedGoals: {
      home: prediction.expectedGoals.home,
      away: prediction.expectedGoals.away,
      total: prediction.expectedGoals.total,
    },
    summary: prediction.summary,
  };
}

/* ----------------------------------------------------------------------- */
/* Arabic mirroring (latest snapshot only)                                  */
/* ------------------------------------------------------------------------ */

/**
 * Returns the document for the requested language. Only the latest snapshot
 * is mirrored — earlier insight history falls back to English in the Arabic
 * UI, keeping every capture cheap.
 */
export async function ensureLiveLanguage(
  matchId: string,
  language: AnalysisLanguage,
): Promise<StoredLive | null> {
  const doc = await readStoredLive(matchId);
  if (!doc || language !== "ar") return doc;
  const latest = doc.snapshots[doc.snapshots.length - 1];
  if (!latest || latest.translation) return doc;
  return translateSnapshot(matchId, latest.id);
}

/** One gateway call per (match, snapshot): mirror, validate, persist. */
function translateSnapshot(
  matchId: string,
  snapshotId: string,
): Promise<StoredLive | null> {
  const key = `${matchId}:${snapshotId}`;
  const running = translationInFlight.get(key);
  if (running) return running;

  const task = (async () => {
    const doc = await readStoredLive(matchId);
    const source = doc?.snapshots.find((snapshot) => snapshot.id === snapshotId);
    if (!doc || !source || source.translation) return doc;

    try {
      const result = await chatComplete({
        system: LIVE_TRANSLATION_SYSTEM_PROMPT,
        user: buildLiveTranslationUserMessage(source.analysis),
      });
      const translated = parseLive(result.content, source.events.length);
      assertSameLiveNumbers(source.analysis, translated);

      // Re-read before writing: the pass takes tens of seconds and another
      // capture may land meanwhile. Never overwrite a newer document, and
      // keep the original English analysis as the source of truth.
      const persisted = await readStoredLive(matchId);
      if (!persisted) return doc;
      const index = persisted.snapshots.findIndex(
        (snapshot) => snapshot.id === snapshotId,
      );
      if (index === -1 || persisted.snapshots[index].translation) return persisted;

      const updated: StoredLive = {
        ...persisted,
        snapshots: persisted.snapshots.map((snapshot, position) =>
          position === index
            ? {
                ...snapshot,
                translation: {
                  translatedAt: new Date().toISOString(),
                  translatedBy: AI_PUBLIC_NAME,
                  analysis: translated,
                },
              }
            : snapshot,
        ),
        updatedAt: new Date().toISOString(),
      };
      await writeStoredLive(updated);
      return updated;
    } catch (error) {
      // Best-effort by design: the English snapshot stays the source of truth.
      // The reason is logged server-side only; it never contains the key.
      console.error("[live-translation] attempt failed:", error);
      return doc;
    }
  })();

  translationInFlight.set(key, task);
  return task.finally(() => translationInFlight.delete(key));
}

/* ----------------------------------------------------------------------- */
/* Final report (deterministic, computed in code)                           */
/* ------------------------------------------------------------------------ */

function outcomeOf(score: { home: number; away: number }): HistoricalWinner {
  return score.home > score.away
    ? "home"
    : score.away > score.home
      ? "away"
      : "even";
}

/** Probability of an outcome; "even" (a drawn result) is `probabilities.draw`. */
function probabilityOf(
  probabilities: { home: number; draw: number; away: number },
  outcome: HistoricalWinner,
): number {
  if (outcome === "home") return probabilities.home;
  if (outcome === "away") return probabilities.away;
  return probabilities.draw;
}

function argmaxOf(probabilities: {
  home: number;
  draw: number;
  away: number;
}): HistoricalWinner {
  const entries: Array<[HistoricalWinner, number]> = [
    ["home", probabilities.home],
    ["even", probabilities.draw],
    ["away", probabilities.away],
  ];
  let best = entries[0];
  for (const entry of entries.slice(1)) {
    if (entry[1] > best[1]) best = entry;
  }
  return best[0];
}

/** Multi-class Brier score against the actual outcome (0 perfect, 2 worst). */
function brierOf(
  probabilities: { home: number; draw: number; away: number },
  actual: HistoricalWinner,
): number {
  const outcomes: HistoricalWinner[] = ["home", "even", "away"];
  return outcomes.reduce((sum, outcome) => {
    const estimate = probabilityOf(probabilities, outcome);
    const reality = outcome === actual ? 1 : 0;
    return sum + (estimate - reality) * (estimate - reality);
  }, 0);
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function swingOf(values: number[]): LiveSwing {
  if (values.length === 0) return { min: 0, max: 0, range: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min: round(min), max: round(max), range: round(max - min) };
}

function buildFinalReport(doc: StoredLive, facts: LiveFacts): LiveFinalReport {
  const finalScore = facts.score;
  const winner = outcomeOf(finalScore);

  const snapshots: LiveFinalReportSnapshot[] = doc.snapshots.map((snapshot) => {
    const probabilities = {
      home: snapshot.analysis.probabilities.home,
      draw: snapshot.analysis.probabilities.draw,
      away: snapshot.analysis.probabilities.away,
    };
    return {
      id: snapshot.id,
      capturedAt: snapshot.capturedAt,
      minuteLabel: snapshot.minuteLabel,
      score: snapshot.score,
      trigger: snapshot.trigger,
      probabilities,
      argmax: argmaxOf(probabilities),
      brier: round(brierOf(probabilities, winner)),
      actualProbability: round(probabilityOf(probabilities, winner)),
    };
  });
  const argmaxHits = snapshots.filter((snapshot) => snapshot.argmax === winner).length;

  const trajectory: LiveTrajectoryPoint[] = doc.snapshots.map((snapshot) => ({
    id: snapshot.id,
    capturedAt: snapshot.capturedAt,
    minuteLabel: snapshot.minuteLabel,
    clockValue: snapshot.clockValue,
    score: snapshot.score,
    dominance: {
      homePercent: snapshot.analysis.dominance.homePercent,
      awayPercent: snapshot.analysis.dominance.awayPercent,
    },
    probabilities: {
      home: snapshot.analysis.probabilities.home,
      draw: snapshot.analysis.probabilities.draw,
      away: snapshot.analysis.probabilities.away,
    },
  }));
  const halfTimeSnapshot = [...doc.snapshots]
    .reverse()
    .find((snapshot) => snapshot.state === "halftime");

  const preMatch = doc.preMatchPrediction
    ? (() => {
        const prediction = doc.preMatchPrediction;
        const predictedOutcome = argmaxOf(prediction.winnerProbabilities);
        return {
          generatedAt: prediction.generatedAt,
          predictedScore: prediction.predictedScore,
          predictedOutcome,
          winnerProbabilities: prediction.winnerProbabilities,
          outcomePickCorrect: predictedOutcome === winner,
          exactScore:
            prediction.predictedScore.home === finalScore.home &&
            prediction.predictedScore.away === finalScore.away,
        };
      })()
    : undefined;

  return {
    generatedAt: new Date().toISOString(),
    finalScore,
    htScore: halfTimeSnapshot ? { ...halfTimeSnapshot.score } : null,
    winner,
    keyEvents: facts.events,
    preMatch,
    snapshots,
    accuracy: {
      samples: snapshots.length,
      argmaxHits,
      argmaxAccuracy: snapshots.length ? round(argmaxHits / snapshots.length) : 0,
      brier: snapshots.length
        ? round(snapshots.reduce((sum, snapshot) => sum + snapshot.brier, 0) / snapshots.length)
        : 0,
      meanActualProbability: snapshots.length
        ? round(
            snapshots.reduce((sum, snapshot) => sum + snapshot.actualProbability, 0) /
              snapshots.length,
          )
        : 0,
    },
    trajectory,
    swings: {
      home: swingOf(snapshots.map((snapshot) => snapshot.probabilities.home)),
      draw: swingOf(snapshots.map((snapshot) => snapshot.probabilities.draw)),
      away: swingOf(snapshots.map((snapshot) => snapshot.probabilities.away)),
    },
  };
}

/**
 * Compute and persist the final report the first time a GET observes the
 * match finished. Uses only stored snapshots plus the fresh provider fetch
 * (for the final score and key events); accuracy is never asked from the
 * model.
 */
export async function finalizeLiveReport(
  matchId: string,
): Promise<StoredLive | null> {
  const doc = await readStoredLive(matchId);
  if (!doc || doc.snapshots.length === 0 || doc.finalReport) return doc;

  const facts = await buildLiveFacts(matchId);
  if (facts.match.state !== "finished") return doc;

  const updated: StoredLive = {
    ...doc,
    finalReport: buildFinalReport(doc, facts),
    updatedAt: new Date().toISOString(),
  };
  await writeStoredLive(updated);
  return updated;
}

/* ----------------------------------------------------------------------- */
/* Failure translation                                                      */
/* ------------------------------------------------------------------------ */

/** Route-friendly error translation for every live failure path. */
export function liveFailure(error: unknown): AnalysisFailure {
  if (error instanceof MatchNotLiveError) {
    return { status: 409, code: "match_not_live", message: error.message };
  }
  if (error instanceof RateLimitExceededError) {
    return { status: 429, code: "rate_limited", message: error.message };
  }
  return analysisFailure(error);
}

export type { LiveAnalysis } from "@/lib/ai/live-schema";
