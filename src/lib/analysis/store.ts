/**
 * File-backed store for completed AI analyses.
 *
 * The project has no database; one JSON file per match (`.data/analyses/<id>.json`,
 * gitignored) persists analyses across server restarts without adding
 * dependencies. Writes are atomic (temp file + rename) and failures are
 * swallowed by design — losing a persisted analysis only means the match can
 * be analysed again.
 *
 * Every document carries attribution fields (`provider`, `model`,
 * `answeredBy`, `translatedBy`). Read paths pass them through `publicize()`
 * so responses only ever carry the public product name — never a gateway,
 * provider or upstream model identity. Documents written before this rule
 * are rewritten in place the first time they are read.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { AI_PUBLIC_NAME } from "@/lib/ai/brand";
import type {
  DatasetDataQuality,
  DatasetHeadToHead,
  DatasetMarketOdds,
  DatasetStatistics,
} from "./dataset";
import type { AnalysisPrediction } from "@/lib/ai/analysis-schema";
import type { HistoricalAnalysis, HistoricalWinner } from "@/lib/ai/historical-schema";
import type { LiveAnalysis } from "@/lib/ai/live-schema";
import type {
  HistoricalDataQuality,
  HistoricalEventFact,
  HistoricalFixture,
  PreMatchTeamContext,
} from "./retrospective-dataset";
import type { LiveStatistics } from "./live-dataset";

export interface StoredAnalysisTranslation {
  translatedAt: string;
  /** Public product label for whoever produced the Arabic text. */
  translatedBy: string;
  /** Arabic mirror of `prediction`: identical numbers, translated text. */
  prediction: AnalysisPrediction;
}

export interface StoredAnalysis {
  /** One document per match; stable key. */
  version: 1;
  matchId: string;
  provider: "touchline-ai";
  /** Public product name of the analysing assistant. */
  model: string;
  /** Public product name recorded for the answering assistant. */
  answeredBy: string;
  generatedAt: string;
  /** Fixture state when the analysis was produced (drives cache freshness). */
  matchState: string;
  promptTokens?: number;
  completionTokens?: number;
  dataQuality: DatasetDataQuality;
  prediction: AnalysisPrediction;
  /** Optional Arabic mirror, added on demand and persisted in place. */
  translation?: StoredAnalysisTranslation;
}

export interface StoredHistoricalTranslation {
  translatedAt: string;
  /** Public product label for whoever produced the Arabic text. */
  translatedBy: string;
  /** Arabic mirror of `analysis`: identical numbers, translated text. */
  analysis: HistoricalAnalysis;
}

/**
 * Persisted retrospective analysis: the deterministic facts that were
 * extracted in code (result, events, statistics, pre-match context) are kept
 * alongside the model's interpretation, so the panel can rebuild the factual
 * timeline without re-fetching the provider payload.
 */
export interface StoredHistorical {
  version: 1;
  /** Marks the document kind; prediction files carry no `kind` field. */
  kind: "historical";
  matchId: string;
  provider: "touchline-ai";
  /** Public product name of the analysing assistant. */
  model: string;
  /** Public product name recorded for the answering assistant. */
  answeredBy: string;
  generatedAt: string;
  promptTokens?: number;
  completionTokens?: number;
  dataQuality: HistoricalDataQuality;
  fixture: HistoricalFixture;
  facts: {
    events: HistoricalEventFact[];
    timelineComplete: boolean;
    substitutions: { home: number; away: number };
  };
  statistics: DatasetStatistics;
  context: {
    home: PreMatchTeamContext;
    away: PreMatchTeamContext;
    headToHead: DatasetHeadToHead;
    marketOdds?: DatasetMarketOdds;
  };
  analysis: HistoricalAnalysis;
  /** Optional Arabic mirror, added on demand and persisted in place. */
  translation?: StoredHistoricalTranslation;
}

const DIRECTORY = ".data/analyses";

function filePath(matchId: string, suffix = "") {
  // Caller-validated ids are numeric, but stay defensive about path building.
  if (!/^[0-9a-z_-]+$/i.test(matchId)) {
    throw new Error("Invalid analysis id");
  }
  return path.join(process.cwd(), DIRECTORY, `${matchId}${suffix}.json`);
}

/**
 * Rewrite deployment-identifying attribution on a parsed document so responses
 * only ever carry the public product name: the document's `provider` becomes
 * the neutral internal token, and `model` / `answeredBy` / every
 * `translation.translatedBy` become `AI_PUBLIC_NAME`. Market-odds providers
 * (bookmaker names) and ESPN fixtures are untouched — only the assistant's own
 * attribution fields are rewritten. Legacy documents that still contain a real
 * model id are normalized in place; returns true when something changed so the
 * caller can persist the cleaned copy.
 */
function publicizeIdentity(doc: unknown): boolean {
  let changed = false;
  const scrub = (value: unknown): void => {
    if (value === null || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (typeof record.provider === "string" && record.provider !== "touchline-ai") {
      record.provider = "touchline-ai";
      changed = true;
    }
    for (const key of ["model", "answeredBy"] as const) {
      if (typeof record[key] === "string" && record[key] !== AI_PUBLIC_NAME) {
        record[key] = AI_PUBLIC_NAME;
        changed = true;
      }
    }
    const translation = record.translation;
    if (
      translation !== null &&
      typeof translation === "object" &&
      typeof (translation as Record<string, unknown>).translatedBy === "string" &&
      (translation as Record<string, unknown>).translatedBy !== AI_PUBLIC_NAME
    ) {
      (translation as Record<string, unknown>).translatedBy = AI_PUBLIC_NAME;
      changed = true;
    }
  };
  scrub(doc);
  const snapshots = (doc as { snapshots?: unknown } | null)?.snapshots;
  if (Array.isArray(snapshots)) {
    for (const snapshot of snapshots) scrub(snapshot);
  }
  return changed;
}

export async function readStoredAnalysis(
  matchId: string,
): Promise<StoredAnalysis | null> {
  try {
    const contents = await readFile(filePath(matchId), "utf8");
    const parsed = JSON.parse(contents) as StoredAnalysis;
    if (parsed?.version !== 1 || parsed.prediction === undefined) return null;
    // Legacy documents are cleaned in place, so one read suffices to scrub them.
    if (publicizeIdentity(parsed)) await writeStoredAnalysis(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredAnalysis(
  analysis: StoredAnalysis,
): Promise<void> {
  try {
    const target = path.join(process.cwd(), DIRECTORY);
    await mkdir(target, { recursive: true });
    const file = filePath(analysis.matchId);
    const temp = `${file}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(analysis, null, 2), "utf8");
    await rename(temp, file);
  } catch {
    // Persistence is best-effort: the caller still receives the analysis.
  }
}

/* ----------------------------------------------------------------------- */
/* Historical (retrospective) documents: <id>-historical.json               */
/* ------------------------------------------------------------------------ */

/**
 * Same validation stance as the prediction store: a file that is not a
 * complete historical document reads as absent, and the caller may then
 * regenerate. The `kind` marker distinguishes it from a prediction document.
 */
export async function readStoredHistorical(
  matchId: string,
): Promise<StoredHistorical | null> {
  try {
    const contents = await readFile(filePath(matchId, "-historical"), "utf8");
    const parsed = JSON.parse(contents) as StoredHistorical;
    if (
      parsed?.version !== 1 ||
      parsed.kind !== "historical" ||
      parsed.analysis === undefined ||
      parsed.fixture === undefined
    ) {
      return null;
    }
    if (publicizeIdentity(parsed)) await writeStoredHistorical(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredHistorical(
  historical: StoredHistorical,
): Promise<void> {
  try {
    const target = path.join(process.cwd(), DIRECTORY);
    await mkdir(target, { recursive: true });
    const file = filePath(historical.matchId, "-historical");
    const temp = `${file}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(historical, null, 2), "utf8");
    await rename(temp, file);
  } catch {
    // Persistence is best-effort: the caller still receives the analysis.
  }
}

/* ----------------------------------------------------------------------- */
/* Live (in-play) documents: <id>-live.json                                 */
/* ------------------------------------------------------------------------ */

/**
 * What caused the capture. The trigger always names a real provider-side
 * change (score, card, penalty, any new event, a statistics shift) or the
 * policy that forced it (the first capture, the configured interval, an
 * explicit `refresh=1`).
 */
export type LiveTrigger =
  | "first"
  | "score_change"
  | "red_card"
  | "penalty"
  | "event"
  | "stats"
  | "interval"
  | "manual";

/** One gateway capture of the in-play state. Snapshots are append-only. */
export interface StoredLiveSnapshot {
  id: string;
  capturedAt: string;
  trigger: LiveTrigger;
  state: string;
  statusLabel: string;
  /** Provider clock label (e.g. `63'` or `45'+2'`); "45'" at half-time. */
  minuteLabel: string;
  /** Parsed minute (base + added time) when the clock was published. */
  clockValue?: number;
  score: { home: number; away: number };
  /** In-play event facts as published up to this capture (indexed). */
  events: HistoricalEventFact[];
  timelineComplete: boolean;
  /** Provider in-match statistics at capture time. */
  statistics: LiveStatistics;
  /** Public product name of the analysing assistant. */
  model: string;
  /** Public product name recorded for the answering assistant. */
  answeredBy: string;
  promptTokens?: number;
  completionTokens?: number;
  analysis: LiveAnalysis;
  /** Optional Arabic mirror of this snapshot only (added on demand). */
  translation?: StoredLiveTranslation;
}

export interface StoredLiveTranslation {
  translatedAt: string;
  translatedBy: string;
  analysis: LiveAnalysis;
}

/** Trimmed subset of the stored (or generated) pre-match prediction. */
export interface StoredLivePreMatchPrediction {
  generatedAt: string;
  winnerProbabilities: { home: number; draw: number; away: number };
  predictedScore: { home: number; away: number };
  expectedGoals: { home: number; away: number; total: number };
  summary: string;
}

/**
 * Pre-kick-off context frozen at the start of the live capture and reused by
 * every later snapshot, so mid-match schedule fetches never leak post-match
 * results into the analysis context.
 */
export interface StoredLiveContext {
  home: PreMatchTeamContext;
  away: PreMatchTeamContext;
  headToHead: DatasetHeadToHead;
  marketOdds?: DatasetMarketOdds;
}

/** Per-outcome movement of the model's live probability estimates. */
export interface LiveSwing {
  min: number;
  max: number;
  range: number;
}

/** One stored snapshot reduced to its prediction trajectory point. */
export interface LiveTrajectoryPoint {
  id: string;
  capturedAt: string;
  minuteLabel: string;
  clockValue?: number;
  score: { home: number; away: number };
  dominance: { homePercent: number; awayPercent: number };
  probabilities: { home: number; draw: number; away: number };
}

/** One snapshot scored against the actual result (deterministic, in code). */
export interface LiveFinalReportSnapshot {
  id: string;
  capturedAt: string;
  minuteLabel: string;
  score: { home: number; away: number };
  trigger: LiveTrigger;
  probabilities: { home: number; draw: number; away: number };
  /** The snapshot's argmax pick; independent of correctness. */
  argmax: HistoricalWinner;
  /** Multi-class Brier score of this snapshot against the final result. */
  brier: number;
  /** Probability the snapshot assigned to the outcome that actually happened. */
  actualProbability: number;
}

/**
 * Deterministic comparison of the pre-match prediction, every live
 * prediction and the actual result. Every number here is computed in code
 * from stored snapshots — nothing about accuracy comes from the model.
 */
export interface LiveFinalReport {
  generatedAt: string;
  finalScore: { home: number; away: number };
  /** Last snapshot taken at half-time, when one exists. */
  htScore: { home: number; away: number } | null;
  winner: HistoricalWinner;
  /** Meaningful events as published by the final provider fetch. */
  keyEvents: HistoricalEventFact[];
  preMatch?: {
    generatedAt: string;
    predictedScore: { home: number; away: number };
    predictedOutcome: HistoricalWinner;
    winnerProbabilities: { home: number; draw: number; away: number };
    outcomePickCorrect: boolean;
    exactScore: boolean;
  };
  snapshots: LiveFinalReportSnapshot[];
  accuracy: {
    samples: number;
    argmaxHits: number;
    argmaxAccuracy: number;
    /** Mean per-snapshot Brier score (0 = perfect, 2 = maximally wrong). */
    brier: number;
    meanActualProbability: number;
  };
  trajectory: LiveTrajectoryPoint[];
  swings: { home: LiveSwing; draw: LiveSwing; away: LiveSwing };
}

/**
 * One document per match holding the frozen pre-match context, the trimmed
 * pre-match prediction and every captured live snapshot. Sits behind
 * `readStoredLive`/`writeStoredLive` in the same gitignored directory as the
 * other analysis documents (<id>-live.json).
 */
export interface StoredLive {
  version: 1;
  kind: "live";
  matchId: string;
  provider: "touchline-ai";
  /** Fingerprint of the last captured facts, to suppress duplicate captures. */
  fingerprint?: string;
  frozenContext: StoredLiveContext;
  preMatchPrediction?: StoredLivePreMatchPrediction;
  /** Chronological; the last entry is the analysis the dashboard shows. */
  snapshots: StoredLiveSnapshot[];
  /** Written once after the final whistle, never re-generated. */
  finalReport?: LiveFinalReport;
  updatedAt: string;
}

export async function readStoredLive(
  matchId: string,
): Promise<StoredLive | null> {
  try {
    const contents = await readFile(filePath(matchId, "-live"), "utf8");
    const parsed = JSON.parse(contents) as StoredLive;
    if (
      parsed?.version !== 1 ||
      parsed.kind !== "live" ||
      !Array.isArray(parsed.snapshots) ||
      parsed.frozenContext === undefined
    ) {
      return null;
    }
    if (publicizeIdentity(parsed)) await writeStoredLive(parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredLive(live: StoredLive): Promise<void> {
  try {
    const target = path.join(process.cwd(), DIRECTORY);
    await mkdir(target, { recursive: true });
    const file = filePath(live.matchId, "-live");
    const temp = `${file}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(live, null, 2), "utf8");
    await rename(temp, file);
  } catch {
    // Persistence is best-effort: the caller still receives the document.
  }
}
