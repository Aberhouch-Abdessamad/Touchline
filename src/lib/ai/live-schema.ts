/**
 * Structured response contract for the Touchline AI live (in-play) analysis.
 *
 * Every fact — score, minute, statistics, events — is extracted in code from
 * the provider payload and offered to the model in the user message. The
 * model only authors interpretation plus its own probability estimates:
 *
 * - `dominance` is analytical control, explicitly NOT a win probability.
 * - `probabilities` is the model's live win/draw/away estimate and must sum
 *   to 1; the dashboard labels it as an AI estimate next to the pre-match
 *   prediction.
 * - `nextGoal` may be withheld (`available: false`) when the evidence is thin.
 * - `insights` must be tied to a real event or statistic when they claim one.
 *
 * Any output that references events outside the provided list is rejected
 * before it can be stored or shown.
 */
import type { ReliabilityLevel } from "./analysis-schema";
import {
  InvalidAnalysisError,
  asRecord,
  extractJsonObject,
  normaliseTriple,
  num,
  text,
} from "./analysis-schema";

export interface LiveInsight {
  title: string;
  explanation: string;
  impact: ReliabilityLevel;
  /** 1-based reference into the in-match event facts, when the insight cites one. */
  eventRef?: number;
  /** Short label of the statistic the insight cites, e.g. "Shots on target". */
  stat?: string;
}

export interface LiveAnalysis {
  /** 2-4 sentences on the current state of the match, minute-aware. */
  overview: string;
  reliability: {
    level: ReliabilityLevel;
    insufficientData: boolean;
    reason: string;
  };
  /**
   * Analytical control (home + away = 100). This is who is dictating play,
   * never a win probability.
   */
  dominance: {
    homePercent: number;
    awayPercent: number;
    summary: string;
    reasoning: string;
  };
  /** Live win/draw/away estimate; home + draw + away = 1. */
  probabilities: {
    home: number;
    draw: number;
    away: number;
    explanation: string;
    /** Only when the estimate moved since the previous capture. */
    changeNote?: string;
  };
  /** Next-goal probabilities, or an honest "not enough evidence" answer. */
  nextGoal: {
    available: boolean;
    home?: number;
    away?: number;
    noMore?: number;
    explanation: string;
  };
  tactical: {
    /** Observations the provider data directly supports. */
    confirmed: string[];
    /** The model's reading, kept separate from the confirmed facts. */
    interpretation: string[];
  };
  /** One sentence on the momentum shift, when the data shows one. */
  momentumNote?: string;
  insights: LiveInsight[];
  risks: string[];
}

/** Human/LLM-readable description of the required JSON shape. */
export const AI_LIVE_JSON_CONTRACT_V1 = `{
  "overview": "2-4 sentences on the match right now: the score, the minute, who controls play and why, quoting real dataset numbers",
  "reliability": {
    "level": "high | medium | low",
    "insufficientData": false,
    "reason": "why this reliability level was chosen, citing the amount of live data available"
  },
  "dominance": {
    "homePercent": 0,
    "awayPercent": 0,
    "summary": "one line naming who is dominating and the clearest statistical reason",
    "reasoning": "2-3 sentences of analytical control (possession, territory, shot quality, pressure) — this is NOT a win probability; homePercent + awayPercent must equal 100"
  },
  "probabilities": {
    "home": 0.0,
    "draw": 0.0,
    "away": 0.0,
    "explanation": "live win/draw/away estimate and the numbers behind it; home+draw+away must equal 1",
    "changeNote": "only when the estimate moved since the previous capture: what changed and why"
  },
  "nextGoal": {
    "available": true,
    "home": 0.0,
    "away": 0.0,
    "noMore": 0.0,
    "explanation": "next-goal probabilities from the live evidence; home+away+noMore must equal 1. Set available to false and omit the numbers when the evidence is insufficient"
  },
  "tactical": {
    "confirmed": ["observations directly supported by the published statistics or events"],
    "interpretation": ["your tactical reading, clearly separate from the confirmed facts"]
  },
  "momentumNote": "one sentence on which way the momentum has turned, only when the data shows a shift",
  "insights": [
    {
      "title": "short headline, e.g. 'Home side pinning the visitors back'",
      "explanation": "one or two sentences tying the insight to the latest events or statistics",
      "impact": "low | medium | high",
      "eventRef": 1,
      "stat": "optional statistic label supporting the insight, e.g. 'Shots on target'"
    }
  ],
  "risks": ["2 to 4 concrete risks: what could change this reading, never a guaranteed outcome"]
}`;

/** Normalise a percentage pair (0-100) to exactly 100 with 1 decimal. */
function normalisePercentPair(a: number, b: number, field: string): [number, number] {
  // Tolerate models that answered with 0-1 shares instead of 0-100.
  const scaled =
    a <= 1.01 && b <= 1.01 && a + b <= 1.5 ? [a * 100, b * 100] : [a, b];
  const sum = scaled[0] + scaled[1];
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new InvalidAnalysisError(`${field} percentages do not add up`);
  }
  if (Math.abs(sum - 100) > 12) {
    throw new InvalidAnalysisError(`${field} percentages do not sum to 100`);
  }
  const first = Math.round((scaled[0] / sum) * 1000) / 10;
  return [first, Math.round((100 - first) * 10) / 10];
}

function optionalStrings(value: unknown, field: string, max: number): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new InvalidAnalysisError(`${field} is not a list`);
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 400))
    .filter(Boolean)
    .slice(0, max);
}

const IMPACTS: ReliabilityLevel[] = ["high", "medium", "low"];

/**
 * Validate one live analysis. `eventsCount` is the number of in-match event
 * facts offered in the user message: every insight reference must point into
 * that list, and no field may smuggle in a number the model did not compute
 * from a probability triple.
 */
export function parseLive(content: string, eventsCount: number): LiveAnalysis {
  const root = asRecord(extractJsonObject(content));
  if (!root) throw new InvalidAnalysisError("the response was not a JSON object");

  // ---- Reliability ------------------------------------------------------
  const reliability = asRecord(root.reliability);
  if (!reliability) throw new InvalidAnalysisError("reliability is missing");
  const levelRaw = text(reliability.level, "reliability.level", { max: 10 });
  if (!["high", "medium", "low"].includes(levelRaw)) {
    throw new InvalidAnalysisError("reliability.level is not high/medium/low");
  }
  const insufficientData = reliability.insufficientData === true;
  const level: ReliabilityLevel =
    insufficientData && levelRaw !== "low" ? "low" : (levelRaw as ReliabilityLevel);

  // ---- Dominance (analytical control, sums to 100) -----------------------
  const dominance = asRecord(root.dominance);
  if (!dominance) throw new InvalidAnalysisError("dominance is missing");
  const [dominanceHome, dominanceAway] = normalisePercentPair(
    num(dominance.homePercent, "dominance.homePercent", 0, 100),
    num(dominance.awayPercent, "dominance.awayPercent", 0, 100),
    "dominance",
  );

  // ---- Live probabilities (sum to 1) ------------------------------------
  const probabilities = asRecord(root.probabilities);
  if (!probabilities) throw new InvalidAnalysisError("probabilities is missing");
  const [probHome, probDraw, probAway] = normaliseTriple(
    [
      num(probabilities.home, "probabilities.home", 0, 1),
      num(probabilities.draw, "probabilities.draw", 0, 1),
      num(probabilities.away, "probabilities.away", 0, 1),
    ],
    "probabilities",
  );
  const changeNote = text(probabilities.changeNote, "probabilities.changeNote", {
    required: false,
    max: 400,
  });

  // ---- Next goal (may be withheld) --------------------------------------
  const nextGoalRaw = asRecord(root.nextGoal);
  if (!nextGoalRaw) throw new InvalidAnalysisError("nextGoal is missing");
  const nextGoalAvailable = nextGoalRaw.available === true;
  const nextGoalExplanation = text(
    nextGoalRaw.explanation,
    "nextGoal.explanation",
    { max: 600 },
  );
  const nextGoal: LiveAnalysis["nextGoal"] = nextGoalAvailable
    ? (() => {
        const [home, away, noMore] = normaliseTriple(
          [
            num(nextGoalRaw.home, "nextGoal.home", 0, 1),
            num(nextGoalRaw.away, "nextGoal.away", 0, 1),
            num(nextGoalRaw.noMore, "nextGoal.noMore", 0, 1),
          ],
          "nextGoal",
        );
        return { available: true, home, away, noMore, explanation: nextGoalExplanation };
      })()
    : { available: false, explanation: nextGoalExplanation };

  // ---- Tactical analysis: confirmed facts vs interpretation --------------
  const tacticalRaw = asRecord(root.tactical);
  if (!tacticalRaw) throw new InvalidAnalysisError("tactical is missing");
  const tactical = {
    confirmed: optionalStrings(tacticalRaw.confirmed, "tactical.confirmed", 6),
    interpretation: optionalStrings(
      tacticalRaw.interpretation,
      "tactical.interpretation",
      6,
    ),
  };
  if (tactical.confirmed.length === 0 && tactical.interpretation.length === 0) {
    throw new InvalidAnalysisError("tactical offers no observations");
  }

  // ---- Insights (event references must exist) ---------------------------
  const insightsRaw = root.insights;
  if (insightsRaw !== undefined && !Array.isArray(insightsRaw)) {
    throw new InvalidAnalysisError("insights is not a list");
  }
  const insights: LiveInsight[] = [];
  (Array.isArray(insightsRaw) ? insightsRaw : []).slice(0, 4).forEach((rawEntry, index) => {
    const record = asRecord(rawEntry);
    if (!record) {
      throw new InvalidAnalysisError(`insights[${index}] is malformed`);
    }
    const impactRaw = text(record.impact, `insights[${index}].impact`, { max: 10 });
    if (!IMPACTS.includes(impactRaw as ReliabilityLevel)) {
      throw new InvalidAnalysisError(`insights[${index}].impact is not low/medium/high`);
    }
    const insight: LiveInsight = {
      title: text(record.title, `insights[${index}].title`, { max: 140 }),
      explanation: text(record.explanation, `insights[${index}].explanation`, {
        max: 600,
      }),
      impact: impactRaw as ReliabilityLevel,
    };
    if (record.eventRef !== undefined && record.eventRef !== null) {
      const ref = Math.round(
        num(record.eventRef, `insights[${index}].eventRef`, 1, Math.max(eventsCount, 1)),
      );
      if (ref > eventsCount) {
        throw new InvalidAnalysisError(
          `insights[${index}] references an event that was not provided`,
        );
      }
      insight.eventRef = ref;
    }
    const stat = text(record.stat, `insights[${index}].stat`, {
      required: false,
      max: 120,
    });
    if (stat) insight.stat = stat;
    insights.push(insight);
  });

  // ---- Risks ------------------------------------------------------------
  const risks = optionalStrings(root.risks, "risks", 4);
  if (risks.length === 0) {
    throw new InvalidAnalysisError("risks is empty");
  }

  const momentumNote = text(root.momentumNote, "momentumNote", {
    required: false,
    max: 400,
  });

  return {
    overview: text(root.overview, "overview", { max: 1200 }),
    reliability: {
      // A model that flags insufficient data cannot also claim high trust.
      level,
      insufficientData,
      reason: text(reliability.reason, "reliability.reason", { max: 600 }),
    },
    dominance: {
      homePercent: dominanceHome,
      awayPercent: dominanceAway,
      summary: text(dominance.summary, "dominance.summary", { max: 400 }),
      reasoning: text(dominance.reasoning, "dominance.reasoning", { max: 900 }),
    },
    probabilities: {
      home: probHome,
      draw: probDraw,
      away: probAway,
      explanation: text(probabilities.explanation, "probabilities.explanation", {
        max: 900,
      }),
      ...(changeNote ? { changeNote } : {}),
    },
    nextGoal,
    tactical,
    ...(momentumNote ? { momentumNote } : {}),
    insights,
    risks,
  };
}

/* ----------------------------------------------------------------------- */
/* Translation integrity                                                    */
/* ------------------------------------------------------------------------ */

/**
 * The Arabic mirror must keep every number, enum-like value and structural
 * count identical: dominance percentages, the probability triple, next-goal
 * availability and numbers, insight references/impacts (and their optional
 * stat labels), tactical list lengths and the risk count. Only free text may
 * differ.
 */
export function assertSameLiveNumbers(
  baseline: LiveAnalysis,
  candidate: LiveAnalysis,
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

  sameNumber(baseline.dominance.homePercent, candidate.dominance.homePercent, "dominance.homePercent");
  sameNumber(baseline.dominance.awayPercent, candidate.dominance.awayPercent, "dominance.awayPercent");

  sameNumber(baseline.probabilities.home, candidate.probabilities.home, "probabilities.home");
  sameNumber(baseline.probabilities.draw, candidate.probabilities.draw, "probabilities.draw");
  sameNumber(baseline.probabilities.away, candidate.probabilities.away, "probabilities.away");
  if (Boolean(baseline.probabilities.changeNote) !== Boolean(candidate.probabilities.changeNote)) {
    reject("probabilities.changeNote presence");
  }

  if (baseline.nextGoal.available !== candidate.nextGoal.available) {
    reject("nextGoal.available");
  }
  if (baseline.nextGoal.available && candidate.nextGoal.available) {
    sameNumber(baseline.nextGoal.home ?? 0, candidate.nextGoal.home ?? 0, "nextGoal.home");
    sameNumber(baseline.nextGoal.away ?? 0, candidate.nextGoal.away ?? 0, "nextGoal.away");
    sameNumber(baseline.nextGoal.noMore ?? 0, candidate.nextGoal.noMore ?? 0, "nextGoal.noMore");
  }

  if (baseline.tactical.confirmed.length !== candidate.tactical.confirmed.length) {
    reject("tactical.confirmed length");
  }
  if (baseline.tactical.interpretation.length !== candidate.tactical.interpretation.length) {
    reject("tactical.interpretation length");
  }

  if (baseline.insights.length !== candidate.insights.length) {
    reject("insights length");
  }
  baseline.insights.forEach((insight, index) => {
    const mirror = candidate.insights[index];
    sameEnum(insight.impact, mirror.impact, `insights[${index}].impact`);
    if (Boolean(insight.eventRef) !== Boolean(mirror.eventRef)) {
      reject(`insights[${index}].eventRef presence`);
    }
    if (insight.eventRef && mirror.eventRef) {
      sameNumber(insight.eventRef, mirror.eventRef, `insights[${index}].eventRef`);
    }
    if (Boolean(insight.stat) !== Boolean(mirror.stat)) {
      reject(`insights[${index}].stat presence`);
    }
  });

  if (baseline.risks.length !== candidate.risks.length) {
    reject("risks length");
  }
  if (Boolean(baseline.momentumNote) !== Boolean(candidate.momentumNote)) {
    reject("momentumNote presence");
  }
}
