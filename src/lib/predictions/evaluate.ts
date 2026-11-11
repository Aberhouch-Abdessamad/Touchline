/**
 * Pure scoring rules for the AI Predictions League.
 *
 * No I/O in this file: given a frozen prediction and the actual match facts it
 * decides, per category and independently, whether the prediction was correct.
 * Rules:
 *  - Winner correctness never implies exact-score correctness (and vice versa).
 *  - A draw pick is correct only on a draw.
 *  - Goals markets use actual goals; BTTS uses whether both sides scored.
 *  - Cards use only published card statistics; missing statistics are
 *    "unavailable", never zero.
 */
import type { AnalysisPrediction } from "@/lib/ai/analysis-schema";
import {
  RULES_VERSION,
  type ActualResult,
  type CategoryEvaluation,
  type CategoryKey,
  type Outcome,
  type Picks,
} from "./types";

/** Yellow cards: correct when the actual total is within this many of the expectation. */
export const YELLOW_TOLERANCE = 1;
/** Red cards: expectation is rounded to the nearest whole card and compared. */
export const RED_ROUNDING = "nearest whole card";

const EPSILON = 1e-9;

export function outcomeOfScore(home: number, away: number): Outcome {
  return home > away ? "home" : away > home ? "away" : "draw";
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Freeze the headline picks from a model prediction (done once, at creation). */
export function derivePicks(prediction: AnalysisPrediction): Picks {
  const p = prediction.winnerProbabilities;
  const probabilities = { home: num(p.home), draw: num(p.draw), away: num(p.away) };
  const score = {
    home: Math.max(0, Math.round(num(prediction.predictedScore.home))),
    away: Math.max(0, Math.round(num(prediction.predictedScore.away))),
  };

  const ranked = (Object.entries(probabilities) as Array<[Outcome, number]>).sort(
    (a, b) => b[1] - a[1],
  );
  let outcome: Outcome = ranked[0][0];
  if (Math.abs(ranked[0][1] - ranked[1][1]) < EPSILON) {
    // A dead heat: the predicted scoreline decides the headline pick.
    outcome = outcomeOfScore(score.home, score.away);
  }

  const line = (target: number) =>
    prediction.goalsOverUnder.find((entry) => Math.abs(entry.line - target) < EPSILON);
  const side = (entry?: { over: number; under: number }): "over" | "under" | null => {
    if (!entry) return null;
    if (Math.abs(entry.over - entry.under) < EPSILON) return null;
    return entry.over > entry.under ? "over" : "under";
  };
  const l15 = line(1.5);
  const l25 = line(2.5);

  const btts = num(prediction.bothTeamsToScore.probability);
  return {
    rulesVersion: RULES_VERSION,
    probabilities,
    outcome,
    score,
    over15: side(l15),
    over25: side(l25),
    bttsProbability: btts,
    btts: Math.abs(btts - 0.5) < EPSILON ? null : btts > 0.5 ? "yes" : "no",
    yellow: num(prediction.cards.yellow.total),
    red: num(prediction.cards.red.total),
    overProbabilities: { over15: num(l15?.over), over25: num(l25?.over) },
  };
}

const unavailable = (predicted?: string): CategoryEvaluation => ({
  verdict: "unavailable",
  predicted,
});

const NA: CategoryEvaluation = { verdict: "not_applicable" };

/** Score every category against the actual result. */
export function evaluateCategories(
  picks: Picks,
  actual: ActualResult,
): Partial<Record<CategoryKey, CategoryEvaluation>> {
  const { home, away } = actual.finalScore;
  const goals = actual.totalGoals;
  const out: Partial<Record<CategoryKey, CategoryEvaluation>> = {};

  const pOutcome = picks.probabilities[picks.outcome];
  const outcomeCorrect = picks.outcome === actual.outcome;
  out.outcome = {
    verdict: outcomeCorrect ? "correct" : "incorrect",
    predicted: picks.outcome,
    actual: actual.outcome,
    probability: pOutcome,
  };
  // "winner" = predictions that backed a team; "draw" = predictions that backed a draw.
  out.winner =
    picks.outcome === "draw"
      ? NA
      : { ...out.outcome };
  out.draw =
    picks.outcome === "draw"
      ? { ...out.outcome }
      : NA;

  out.exactScore = {
    verdict:
      picks.score.home === home && picks.score.away === away ? "correct" : "incorrect",
    predicted: `${picks.score.home}-${picks.score.away}`,
    actual: `${home}-${away}`,
  };

  const overUnder = (
    pick: "over" | "under" | null,
    line: number,
    probability: number,
  ): CategoryEvaluation => {
    if (pick === null) return NA;
    const actualSide = goals > line ? "over" : "under";
    return {
      verdict: pick === actualSide ? "correct" : "incorrect",
      predicted: pick,
      actual: actualSide,
      probability: pick === "over" ? probability : 1 - probability,
    };
  };
  out.over15 = overUnder(picks.over15, 1.5, picks.overProbabilities.over15);
  out.over25 = overUnder(picks.over25, 2.5, picks.overProbabilities.over25);

  if (picks.btts === null) {
    out.btts = NA;
  } else {
    const actualBtts = actual.bothScored ? "yes" : "no";
    out.btts = {
      verdict: picks.btts === actualBtts ? "correct" : "incorrect",
      predicted: picks.btts,
      actual: actualBtts,
      probability: picks.btts === "yes" ? picks.bttsProbability : 1 - picks.bttsProbability,
    };
  }

  if (actual.yellow === null) {
    out.yellowCards = unavailable(picks.yellow.toFixed(1));
  } else {
    const error = Math.abs(picks.yellow - actual.yellow.total);
    out.yellowCards = {
      verdict: error <= YELLOW_TOLERANCE + EPSILON ? "correct" : "incorrect",
      predicted: picks.yellow.toFixed(1),
      actual: String(actual.yellow.total),
      error,
    };
  }

  if (actual.red === null) {
    out.redCards = unavailable(picks.red.toFixed(1));
  } else {
    const rounded = Math.round(picks.red);
    out.redCards = {
      verdict: rounded === actual.red.total ? "correct" : "incorrect",
      predicted: picks.red.toFixed(1),
      actual: String(actual.red.total),
      error: Math.abs(picks.red - actual.red.total),
    };
  }

  return out;
}

/** Headline status for dashboards: the 1X2 result. */
export function headlineVerdict(
  categories: Partial<Record<CategoryKey, CategoryEvaluation>> | undefined,
): "correct" | "incorrect" | null {
  const verdict = categories?.outcome?.verdict;
  return verdict === "correct" || verdict === "incorrect" ? verdict : null;
}

/** How many evaluated markets were right (a per-match tally, never a pooled %). */
export function marketTally(
  categories: Partial<Record<CategoryKey, CategoryEvaluation>> | undefined,
): { correct: number; evaluated: number } {
  let correct = 0;
  let evaluated = 0;
  if (!categories) return { correct, evaluated };
  // winner/draw are views of `outcome`; count the match result once.
  const keys: CategoryKey[] = [
    "outcome",
    "exactScore",
    "over15",
    "over25",
    "btts",
    "yellowCards",
    "redCards",
  ];
  for (const key of keys) {
    const verdict = categories[key]?.verdict;
    if (verdict === "correct") {
      correct += 1;
      evaluated += 1;
    } else if (verdict === "incorrect") {
      evaluated += 1;
    }
  }
  return { correct, evaluated };
}
