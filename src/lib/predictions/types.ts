/**
 * AI Predictions League — shared types.
 *
 * Two document kinds are persisted per match and never mixed:
 *  - LedgerRecord: the ORIGINAL prediction, written once before kickoff and
 *    never modified (write-once file, unique per match + version).
 *  - EvaluationRecord: what actually happened and how each market scored.
 *    Re-computable; it never touches the ledger.
 */
import type { AnalysisPrediction } from "@/lib/ai/analysis-schema";

export type Outcome = "home" | "draw" | "away";

/** Bump when the pick-derivation or scoring rules change. */
export const RULES_VERSION = 1;

/** Independently-scored prediction categories. `outcome` is the 1X2 headline. */
export type CategoryKey =
  | "outcome"
  | "winner"
  | "draw"
  | "exactScore"
  | "over15"
  | "over25"
  | "btts"
  | "yellowCards"
  | "redCards";

export const CATEGORY_KEYS: CategoryKey[] = [
  "outcome",
  "winner",
  "draw",
  "exactScore",
  "over15",
  "over25",
  "btts",
  "yellowCards",
  "redCards",
];

export type Verdict = "correct" | "incorrect" | "unavailable" | "not_applicable";

export interface CategoryEvaluation {
  verdict: Verdict;
  /** Human-readable predicted value (e.g. "2-1", "over", "3.4"). */
  predicted?: string;
  /** Human-readable actual value; absent when unavailable. */
  actual?: string;
  /** Model probability backing the pick, when it has one (0..1). */
  probability?: number;
  /** Absolute error for numeric expectations (cards). */
  error?: number;
}

export interface LedgerFixture {
  homeId: string;
  homeName: string;
  awayId: string;
  awayName: string;
  competition: string;
  competitionSlug?: string;
  season?: number;
  round?: string;
  kickoff: string;
}

/** Picks frozen at creation, derived with RULES_VERSION. */
export interface Picks {
  rulesVersion: number;
  probabilities: { home: number; draw: number; away: number };
  /** argmax of probabilities; a tie falls back to the predicted scoreline. */
  outcome: Outcome;
  score: { home: number; away: number };
  /** Over/under picks; null when the model's two sides are exactly equal. */
  over15: "over" | "under" | null;
  over25: "over" | "under" | null;
  bttsProbability: number;
  /** "yes" when > 0.5, "no" when < 0.5, null at exactly 0.5. */
  btts: "yes" | "no" | null;
  yellow: number;
  red: number;
  overProbabilities: { over15: number; over25: number };
}

export interface LedgerRecord {
  version: 1;
  matchId: string;
  /** When the prediction was stored by this ledger. */
  recordedAt: string;
  /** When the model generated it (the stored analysis timestamp). */
  generatedAt: string;
  /** "live": captured before kickoff by the generation flow. "backfill": imported from the analysis store. */
  source: "live" | "backfill";
  /** Fixture state when the analysis was generated. */
  stateAtGeneration: string;
  /** Present when known at creation (always for source "live"). */
  fixture?: LedgerFixture;
  /** The model's original structured prediction, untouched. */
  prediction: AnalysisPrediction;
  picks: Picks;
}

export type EvaluationStatus = "pending" | "evaluated" | "void";

export type VoidReason =
  | "postponed"
  | "canceled"
  | "abandoned"
  | "extra_time"
  | "created_after_kickoff"
  | "no_result_published";

export interface ActualEvent {
  minute: string;
  type: "goal" | "own-goal" | "penalty" | "yellow" | "red";
  side: "home" | "away" | null;
  player?: string;
}

export interface ActualResult {
  finalScore: { home: number; away: number };
  totalGoals: number;
  outcome: Outcome;
  bothScored: boolean;
  /** null when the provider published no card statistics (never zero). */
  yellow: { home: number; away: number; total: number } | null;
  red: { home: number; away: number; total: number } | null;
  events: ActualEvent[];
}

export interface FixtureMeta extends LedgerFixture {
  homeLogo?: string;
  awayLogo?: string;
}

export interface EvaluationRecord {
  version: 1;
  matchId: string;
  status: EvaluationStatus;
  voidReason?: VoidReason;
  checkedAt: string;
  nextCheckAt?: string;
  attempts: number;
  fixture?: FixtureMeta;
  actual?: ActualResult;
  categories?: Partial<Record<CategoryKey, CategoryEvaluation>>;
  evaluatedAt?: string;
  rulesVersion: number;
}

export interface Entry {
  ledger: LedgerRecord;
  evaluation: EvaluationRecord | null;
}

/** Display status of a prediction (headline 1X2 result). */
export type PredictionStatus = "correct" | "incorrect" | "pending" | "void";
