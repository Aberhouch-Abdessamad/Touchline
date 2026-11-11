/**
 * Structured response contract for the FFC-Vision match analysis.
 *
 * The prompt asks for exactly this JSON; `parseAnalysis` validates it before
 * anything is persisted or shown. Invalid or incomplete model output raises
 * `InvalidAnalysisError` — the service then re-asks once, and eventually
 * fails honestly instead of rendering partial guesswork.
 */

export type ReliabilityLevel = "high" | "medium" | "low";

export interface AnalysisProbabilitySet {
  home: number;
  draw: number;
  away: number;
  explanation: string;
}

export interface AnalysisPrediction {
  summary: string;
  reliability: {
    level: ReliabilityLevel;
    insufficientData: boolean;
    reason: string;
  };
  winnerProbabilities: AnalysisProbabilitySet;
  predictedScore: { home: number; away: number; explanation: string };
  expectedGoals: {
    home: number;
    away: number;
    total: number;
    explanation: string;
  };
  bothTeamsToScore: { probability: number; explanation: string };
  goalsOverUnder: Array<{
    line: number;
    over: number;
    under: number;
    explanation: string;
  }>;
  cards: {
    yellow: { home: number; away: number; total: number };
    red: { home: number; away: number; total: number };
    explanation: string;
  };
  firstTeamToScore: {
    home: number;
    away: number;
    noGoals: number;
    explanation: string;
  };
  firstHalf: {
    outcome: "home" | "draw" | "away";
    explanation: string;
  };
  headToHead: string;
  recentForm: string;
  tactics: {
    home: { strengths: string[]; weaknesses: string[] };
    away: { strengths: string[]; weaknesses: string[] };
  };
  keyFactors: string[];
}

export class InvalidAnalysisError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`FFC-Vision returned an unusable analysis: ${reason}`);
    this.name = "InvalidAnalysisError";
    this.reason = reason;
  }
}

/** Human/LLM-readable description of the required JSON shape. */
export const AI_ANALYSIS_JSON_CONTRACT_V1 = `{
  "summary": "verdict paragraph, 3-5 sentences: likely outcome + the most decisive statistics (with numbers) + the main risk to the pick",
  "reliability": {
    "level": "high | medium | low",
    "insufficientData": false,
    "reason": "why this reliability level was chosen, citing the amount of data"
  },
  "winnerProbabilities": {
    "home": 0.0,
    "draw": 0.0,
    "away": 0.0,
    "explanation": "statistical reasoning; home+draw+away must equal 1"
  },
  "predictedScore": {
    "home": 0,
    "away": 0,
    "explanation": "how the scoreline follows from the expected goals"
  },
  "expectedGoals": {
    "home": 0.0,
    "away": 0.0,
    "total": 0.0,
    "explanation": "goals-for/against rates, venue splits and opponent strength"
  },
  "bothTeamsToScore": {
    "probability": 0.0,
    "explanation": "share of recent matches where both teams scored, adjusted for the matchup"
  },
  "goalsOverUnder": [
    { "line": 1.5, "over": 0.0, "under": 0.0, "explanation": "..." },
    { "line": 2.5, "over": 0.0, "under": 0.0, "explanation": "..." }
  ],
  "cards": {
    "yellow": { "home": 0.0, "away": 0.0, "total": 0.0 },
    "red": { "home": 0.0, "away": 0.0, "total": 0.0 },
    "explanation": "expected card counts and the disciplinary context behind them"
  },
  "firstTeamToScore": {
    "home": 0.0,
    "away": 0.0,
    "noGoals": 0.0,
    "explanation": "first-goal probabilities; home+away+noGoals must equal 1"
  },
  "firstHalf": {
    "outcome": "home | draw | away",
    "explanation": "expected first-half result and its statistical basis"
  },
  "headToHead": "what the head-to-head record shows and how much weight it carries",
  "recentForm": "both teams' recent results, goals and venue splits",
  "tactics": {
    "home": { "strengths": ["..."], "weaknesses": ["..."] },
    "away": { "strengths": ["..."], "weaknesses": ["..."] }
  },
  "keyFactors": ["each factor names an exact, decisive statistic from the dataset and the market it moves"]
}`;

/* ----------------------------------------------------------------------- */
/* Translation integrity                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Text fields legitimately differ between the English original and its
 * Arabic mirror; every number, enum-like value and structural count must
 * not. A translation is only accepted when this passes, so a model that
 * "translates" a prediction into a different prediction is rejected instead
 * of persisted.
 */
export function assertSamePredictionNumbers(
  baseline: AnalysisPrediction,
  candidate: AnalysisPrediction,
): void {
  const reject = (field: string) => {
    throw new InvalidAnalysisError(`translation changed ${field}`);
  };
  const sameNumber = (expected: number, actual: number, field: string) => {
    if (Math.abs(expected - actual) > 1e-9) reject(field);
  };
  const sameEnum = <T extends string>(expected: T, actual: T, field: string) => {
    if (expected !== actual) reject(field);
  };

  sameEnum(baseline.reliability.level, candidate.reliability.level, "reliability.level");
  if (baseline.reliability.insufficientData !== candidate.reliability.insufficientData) {
    reject("reliability.insufficientData");
  }

  sameNumber(baseline.winnerProbabilities.home, candidate.winnerProbabilities.home, "winnerProbabilities.home");
  sameNumber(baseline.winnerProbabilities.draw, candidate.winnerProbabilities.draw, "winnerProbabilities.draw");
  sameNumber(baseline.winnerProbabilities.away, candidate.winnerProbabilities.away, "winnerProbabilities.away");

  sameNumber(baseline.predictedScore.home, candidate.predictedScore.home, "predictedScore.home");
  sameNumber(baseline.predictedScore.away, candidate.predictedScore.away, "predictedScore.away");

  sameNumber(baseline.expectedGoals.home, candidate.expectedGoals.home, "expectedGoals.home");
  sameNumber(baseline.expectedGoals.away, candidate.expectedGoals.away, "expectedGoals.away");
  sameNumber(baseline.expectedGoals.total, candidate.expectedGoals.total, "expectedGoals.total");

  sameNumber(
    baseline.bothTeamsToScore.probability,
    candidate.bothTeamsToScore.probability,
    "bothTeamsToScore.probability",
  );

  if (baseline.goalsOverUnder.length !== candidate.goalsOverUnder.length) {
    reject("goalsOverUnder lines");
  }
  baseline.goalsOverUnder.forEach((row, index) => {
    const mirror = candidate.goalsOverUnder[index];
    sameNumber(row.line, mirror.line, `goalsOverUnder[${index}].line`);
    sameNumber(row.over, mirror.over, `goalsOverUnder[${index}].over`);
    sameNumber(row.under, mirror.under, `goalsOverUnder[${index}].under`);
  });

  sameNumber(baseline.cards.yellow.home, candidate.cards.yellow.home, "cards.yellow.home");
  sameNumber(baseline.cards.yellow.away, candidate.cards.yellow.away, "cards.yellow.away");
  sameNumber(baseline.cards.yellow.total, candidate.cards.yellow.total, "cards.yellow.total");
  sameNumber(baseline.cards.red.home, candidate.cards.red.home, "cards.red.home");
  sameNumber(baseline.cards.red.away, candidate.cards.red.away, "cards.red.away");
  sameNumber(baseline.cards.red.total, candidate.cards.red.total, "cards.red.total");

  sameNumber(baseline.firstTeamToScore.home, candidate.firstTeamToScore.home, "firstTeamToScore.home");
  sameNumber(baseline.firstTeamToScore.away, candidate.firstTeamToScore.away, "firstTeamToScore.away");
  sameNumber(baseline.firstTeamToScore.noGoals, candidate.firstTeamToScore.noGoals, "firstTeamToScore.noGoals");

  sameEnum(baseline.firstHalf.outcome, candidate.firstHalf.outcome, "firstHalf.outcome");
}

/* ----------------------------------------------------------------------- */
/* Parsing helpers                                                          */
/* ------------------------------------------------------------------------ */

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function num(value: unknown, field: string, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new InvalidAnalysisError(`${field} is missing or out of range`);
  }
  return parsed;
}

export function text(
  value: unknown,
  field: string,
  { required = true, max = 800 }: { required?: boolean; max?: number } = {},
): string {
  if (typeof value !== "string") {
    if (!required) return "";
    throw new InvalidAnalysisError(`${field} is not a string`);
  }
  const trimmed = value.trim();
  if (required && trimmed.length === 0) {
    throw new InvalidAnalysisError(`${field} is empty`);
  }
  return trimmed.slice(0, max);
}

export function stringList(value: unknown, field: string, max = 6): string[] {
  if (!Array.isArray(value)) {
    throw new InvalidAnalysisError(`${field} is not a list`);
  }
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, max);
  if (items.length === 0) {
    throw new InvalidAnalysisError(`${field} is empty`);
  }
  return items;
}

/** Normalise a probability triple that must sum to 1. */
function normaliseTriple(
  values: [number, number, number],
  field: string,
): [number, number, number] {
  const sum = values[0] + values[1] + values[2];
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new InvalidAnalysisError(`${field} probabilities do not add up`);
  }
  // Tolerate rounding noise, but reject outputs that ignore the contract.
  if (Math.abs(sum - 1) > 0.12) {
    throw new InvalidAnalysisError(`${field} probabilities do not sum to 1`);
  }
  const rounded = values.map((value) => Math.round((value / sum) * 1000) / 1000);
  const fix = Math.round((1 - (rounded[0] + rounded[1] + rounded[2])) * 1000) / 1000;
  rounded[0] = Math.round((rounded[0] + fix) * 1000) / 1000;
  return [rounded[0], rounded[1], rounded[2]];
}

/**
 * Strip code fences or stray prose around a JSON object. This only extracts
 * an object the model already produced; it never fabricates missing fields.
 */
export function extractJsonObject(content: string): unknown {
  let candidate = content.trim();
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidate = fence[1].trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
  }
  throw new InvalidAnalysisError("the response was not valid JSON");
}

export function parseAnalysis(content: string): AnalysisPrediction {
  const root = asRecord(extractJsonObject(content));
  if (!root) throw new InvalidAnalysisError("the response was not a JSON object");

  const reliability = asRecord(root.reliability);
  if (!reliability) throw new InvalidAnalysisError("reliability is missing");
  const levelRaw = text(reliability.level, "reliability.level", { max: 10 });
  if (!["high", "medium", "low"].includes(levelRaw)) {
    throw new InvalidAnalysisError("reliability.level is not high/medium/low");
  }
  const insufficientData = reliability.insufficientData === true;

  const winner = asRecord(root.winnerProbabilities);
  if (!winner) {
    throw new InvalidAnalysisError("winnerProbabilities is missing");
  }
  const home = num(winner.home, "winnerProbabilities.home", 0, 1);
  const draw = num(winner.draw, "winnerProbabilities.draw", 0, 1);
  const away = num(winner.away, "winnerProbabilities.away", 0, 1);
  const [wHome, wDraw, wAway] = normaliseTriple(
    [home, draw, away],
    "winnerProbabilities",
  );

  const score = asRecord(root.predictedScore);
  if (!score) throw new InvalidAnalysisError("predictedScore is missing");

  const xg = asRecord(root.expectedGoals);
  if (!xg) throw new InvalidAnalysisError("expectedGoals is missing");
  const xgHome = num(xg.home, "expectedGoals.home", 0, 10);
  const xgAway = num(xg.away, "expectedGoals.away", 0, 10);

  const btts = asRecord(root.bothTeamsToScore);
  if (!btts) throw new InvalidAnalysisError("bothTeamsToScore is missing");

  const overUnderRaw = root.goalsOverUnder;
  if (!Array.isArray(overUnderRaw) || overUnderRaw.length === 0) {
    throw new InvalidAnalysisError("goalsOverUnder is missing");
  }
  const goalsOverUnder = overUnderRaw.slice(0, 6).map((row, index) => {
    const record = asRecord(row);
    if (!record) {
      throw new InvalidAnalysisError(`goalsOverUnder[${index}] is malformed`);
    }
    const line = num(record.line, `goalsOverUnder[${index}].line`, 0.5, 6.5);
    const over = num(record.over, `goalsOverUnder[${index}].over`, 0, 1);
    const under = num(record.under, `goalsOverUnder[${index}].under`, 0, 1);
    const sum = over + under;
    if (sum <= 0) {
      throw new InvalidAnalysisError(`goalsOverUnder[${index}] is empty`);
    }
    return {
      line,
      over: Math.round((over / sum) * 1000) / 1000,
      under: Math.round((under / sum) * 1000) / 1000,
      explanation: text(record.explanation, `goalsOverUnder[${index}].explanation`),
    };
  });

  goalsOverUnder.sort((a, b) => a.line - b.line);
  for (const requiredLine of [1.5, 2.5]) {
    if (!goalsOverUnder.some((row) => Math.abs(row.line - requiredLine) < 1e-6)) {
      throw new InvalidAnalysisError(
        `goalsOverUnder does not include the ${requiredLine} line`,
      );
    }
  }

  const cards = asRecord(root.cards);
  if (!cards) throw new InvalidAnalysisError("cards is missing");
  const yellow = asRecord(cards.yellow);
  const red = asRecord(cards.red);
  if (!yellow || !red) throw new InvalidAnalysisError("cards breakdown is missing");

  const yellowHome = num(yellow.home, "cards.yellow.home", 0, 20);
  const yellowAway = num(yellow.away, "cards.yellow.away", 0, 20);
  const redHome = num(red.home, "cards.red.home", 0, 20);
  const redAway = num(red.away, "cards.red.away", 0, 20);

  const first = asRecord(root.firstTeamToScore);
  if (!first) throw new InvalidAnalysisError("firstTeamToScore is missing");
  const firstHome = num(first.home, "firstTeamToScore.home", 0, 1);
  const firstAway = num(first.away, "firstTeamToScore.away", 0, 1);
  const noGoals = num(first.noGoals, "firstTeamToScore.noGoals", 0, 1);
  const [fHome, fAway, fNone] = normaliseTriple(
    [firstHome, firstAway, noGoals],
    "firstTeamToScore",
  );

  const firstHalf = asRecord(root.firstHalf);
  if (!firstHalf) throw new InvalidAnalysisError("firstHalf is missing");
  const firstHalfOutcome = text(firstHalf.outcome, "firstHalf.outcome", {
    max: 10,
  });
  if (!["home", "draw", "away"].includes(firstHalfOutcome)) {
    throw new InvalidAnalysisError("firstHalf.outcome is not home/draw/away");
  }

  const tactics = asRecord(root.tactics);
  const homeTactics = asRecord(tactics?.home);
  const awayTactics = asRecord(tactics?.away);
  if (!homeTactics || !awayTactics) {
    throw new InvalidAnalysisError("tactics is missing");
  }

  return {
    summary: text(root.summary, "summary", { max: 1_200 }),
    reliability: {
      // A model that flags insufficient data cannot also claim high trust.
      level:
        insufficientData && levelRaw !== "low"
          ? "low"
          : (levelRaw as ReliabilityLevel),
      insufficientData,
      reason: text(reliability.reason, "reliability.reason", { max: 600 }),
    },
    winnerProbabilities: {
      home: wHome,
      draw: wDraw,
      away: wAway,
      explanation: text(winner.explanation, "winnerProbabilities.explanation"),
    },
    predictedScore: {
      home: Math.round(num(score.home, "predictedScore.home", 0, 15)),
      away: Math.round(num(score.away, "predictedScore.away", 0, 15)),
      explanation: text(score.explanation, "predictedScore.explanation"),
    },
    expectedGoals: {
      home: xgHome,
      away: xgAway,
      total: Math.round((xgHome + xgAway) * 100) / 100,
      explanation: text(xg.explanation, "expectedGoals.explanation"),
    },
    bothTeamsToScore: {
      probability: Math.round(num(btts.probability, "bothTeamsToScore.probability", 0, 1) * 1000) / 1000,
      explanation: text(btts.explanation, "bothTeamsToScore.explanation"),
    },
    goalsOverUnder,
    cards: {
      yellow: {
        home: yellowHome,
        away: yellowAway,
        total: Math.round((yellowHome + yellowAway) * 10) / 10,
      },
      red: {
        home: redHome,
        away: redAway,
        total: Math.round((redHome + redAway) * 10) / 10,
      },
      explanation: text(cards.explanation, "cards.explanation"),
    },
    firstTeamToScore: {
      home: fHome,
      away: fAway,
      noGoals: fNone,
      explanation: text(first.explanation, "firstTeamToScore.explanation"),
    },
    firstHalf: {
      outcome: firstHalfOutcome as "home" | "draw" | "away",
      explanation: text(firstHalf.explanation, "firstHalf.explanation"),
    },
    headToHead: text(root.headToHead, "headToHead", { max: 900 }),
    recentForm: text(root.recentForm, "recentForm", { max: 900 }),
    tactics: {
      home: {
        strengths: stringList(homeTactics.strengths, "tactics.home.strengths"),
        weaknesses: stringList(homeTactics.weaknesses, "tactics.home.weaknesses"),
      },
      away: {
        strengths: stringList(awayTactics.strengths, "tactics.away.strengths"),
        weaknesses: stringList(awayTactics.weaknesses, "tactics.away.weaknesses"),
      },
    },
    keyFactors: stringList(root.keyFactors, "keyFactors", 8),
  };
}
