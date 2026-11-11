/**
 * Structured response contract for the FFC-Vision historical (retrospective)
 * match analysis.
 *
 * Unlike the prediction contract, every *fact* (final score, half-time,
 * winner, event list) is computed in code from the provider payload and the
 * model is required to echo it exactly — an answer that contradicts the
 * actual result is rejected before it can be persisted or shown. The model
 * only authors interpretation: why the match ended this way, how events
 * turned it, what the statistics mean, and a closing verdict.
 */
import type { ReliabilityLevel } from "./analysis-schema";
import {
  InvalidAnalysisError,
  asRecord,
  extractJsonObject,
  num,
  stringList,
  text,
} from "./analysis-schema";

export type HistoricalWinner = "home" | "away" | "even";

/** Factual echo required from the model: result and half-time. */
export interface HistoricalMatchFacts {
  winner: HistoricalWinner;
  finalScore: { home: number; away: number };
  /** `null` when the provider did not publish half-time progress. */
  htScore: { home: number; away: number } | null;
}

export interface HistoricalTimelineEntry {
  /** 1-based index into the provider match-event facts. */
  eventRef: number;
  description: string;
  impact?: string;
}

export interface HistoricalAnalysis {
  summary: string;
  reliability: {
    level: ReliabilityLevel;
    insufficientData: boolean;
    reason: string;
  };
  /** Echoes the actual outcome; never a prediction. */
  winner: HistoricalWinner;
  /** Echoes the actual full-time score. */
  finalScore: { home: number; away: number };
  /** Echoes the actual half-time score, or `null` when unavailable. */
  htScore: { home: number; away: number } | null;
  whyItEnded: {
    reasoning: string;
    turningPoint?: {
      eventRef: number;
      explanation: string;
    };
  };
  timeline: HistoricalTimelineEntry[];
  statReading: string;
  tactics: { home: string[]; away: string[] };
  keyFactors: string[];
  verdict: { headline: string; body: string };
}

/** Human/LLM-readable description of the required JSON shape. */
export const AI_HISTORICAL_JSON_CONTRACT_V1 = `{
  "summary": "3-5 sentence account of how the match unfolded and ended, quoting real dataset numbers",
  "reliability": {
    "level": "high | medium | low",
    "insufficientData": false,
    "reason": "why this reliability level was chosen, citing the amount of available data"
  },
  "winner": "home | away | even",
  "finalScore": { "home": 0, "away": 0 },
  "htScore": { "home": 0, "away": 0 },
  "whyItEnded": {
    "reasoning": "3-4 sentences on the mechanism that decided the outcome, tied to the statistics and events",
    "turningPoint": { "eventRef": 1, "explanation": "the single event that turned the match" }
  },
  "timeline": [
    { "eventRef": 1, "description": "what this event was", "impact": "what it changed in the match" }
  ],
  "statReading": "one paragraph reading the statistical comparison: who controlled what, and what that produced",
  "tactics": {
    "home": ["tactical observations for the home side, each grounded in the dataset"],
    "away": ["tactical observations for the away side"]
  },
  "keyFactors": ["3 to 5 factors that decided this match, each naming exact dataset numbers or events"],
  "verdict": { "headline": "one-line verdict on the match", "body": "2-3 sentences: what the result means and which facts support it" }
}`;

/* ----------------------------------------------------------------------- */
/* Parsing                                                                  */
/* ------------------------------------------------------------------------ */

function parseScorePair(
  value: unknown,
  field: string,
): { home: number; away: number } {
  const record = asRecord(value);
  if (!record) throw new InvalidAnalysisError(`${field} is missing`);
  return {
    home: Math.round(num(record.home, `${field}.home`, 0, 99)),
    away: Math.round(num(record.away, `${field}.away`, 0, 99)),
  };
}

/**
 * Validate a retrospective answer. `eventsCount` is the number of provider
 * event facts offered in the user message: every timeline reference must
 * point inside that list, and the result echo must match the facts exactly.
 */
export function parseHistorical(
  content: string,
  eventsCount: number,
  facts: HistoricalMatchFacts,
): HistoricalAnalysis {
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

  // ---- Result echo (must equal the factual values) -----------------------
  const winnerRaw = text(root.winner, "winner", { max: 10 });
  if (winnerRaw !== "home" && winnerRaw !== "away" && winnerRaw !== "even") {
    throw new InvalidAnalysisError("winner is not home/away/even");
  }
  if (winnerRaw !== facts.winner) {
    throw new InvalidAnalysisError("winner contradicts the published final score");
  }

  const finalScore = parseScorePair(root.finalScore, "finalScore");
  if (
    finalScore.home !== facts.finalScore.home ||
    finalScore.away !== facts.finalScore.away
  ) {
    throw new InvalidAnalysisError("finalScore contradicts the published result");
  }

  let htScore: { home: number; away: number } | null = null;
  if (root.htScore !== null && root.htScore !== undefined) {
    htScore = parseScorePair(root.htScore, "htScore");
  }
  if (facts.htScore === null) {
    if (htScore) {
      throw new InvalidAnalysisError(
        "htScore was invented: the provider published no half-time progress",
      );
    }
  } else {
    if (
      !htScore ||
      htScore.home !== facts.htScore.home ||
      htScore.away !== facts.htScore.away
    ) {
      throw new InvalidAnalysisError(
        "htScore does not match the published half-time score",
      );
    }
  }

  // ---- Why it ended ----------------------------------------------------
  const why = asRecord(root.whyItEnded);
  if (!why) throw new InvalidAnalysisError("whyItEnded is missing");

  let turningPoint:
    | { eventRef: number; explanation: string }
    | undefined;
  if (why.turningPoint !== undefined && why.turningPoint !== null) {
    const point = asRecord(why.turningPoint);
    if (!point) {
      throw new InvalidAnalysisError("whyItEnded.turningPoint is malformed");
    }
    turningPoint = {
      eventRef: Math.round(
        num(
          point.eventRef,
          "whyItEnded.turningPoint.eventRef",
          1,
          Math.max(eventsCount, 1),
        ),
      ),
      explanation: text(
        point.explanation,
        "whyItEnded.turningPoint.explanation",
        { max: 500 },
      ),
    };
  }

  // ---- Timeline (references into the provider facts) ---------------------
  if (!Array.isArray(root.timeline)) {
    throw new InvalidAnalysisError("timeline is missing");
  }
  if (eventsCount === 0 && root.timeline.length > 0) {
    throw new InvalidAnalysisError(
      "timeline references events that were not provided",
    );
  }
  const timeline: HistoricalTimelineEntry[] = [];
  const seenRefs = new Set<number>();
  root.timeline.slice(0, eventsCount || 0).forEach((rawEntry, index) => {
    const record = asRecord(rawEntry);
    if (!record) {
      throw new InvalidAnalysisError(`timeline[${index}] is malformed`);
    }
    const eventRef = Math.round(
      num(record.eventRef, `timeline[${index}].eventRef`, 1, Math.max(eventsCount, 1)),
    );
    if (seenRefs.has(eventRef)) {
      throw new InvalidAnalysisError(`timeline reuses eventRef ${eventRef}`);
    }
    seenRefs.add(eventRef);
    const entry: HistoricalTimelineEntry = {
      eventRef,
      description: text(record.description, `timeline[${index}].description`, {
        max: 600,
      }),
    };
    const impact = text(record.impact, `timeline[${index}].impact`, {
      required: false,
      max: 400,
    });
    if (impact) entry.impact = impact;
    timeline.push(entry);
  });
  if (eventsCount > 0 && timeline.length === 0) {
    throw new InvalidAnalysisError("timeline is empty although events exist");
  }

  // ---- Interpretation sections ------------------------------------------
  const statReading = text(root.statReading, "statReading", { max: 1200 });

  const tacticsRaw = asRecord(root.tactics);
  if (!tacticsRaw) throw new InvalidAnalysisError("tactics is missing");
  const optionalList = (value: unknown, field: string) => {
    if (value === undefined) return [];
    if (!Array.isArray(value)) {
      throw new InvalidAnalysisError(`${field} is not a list`);
    }
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 400))
      .filter(Boolean)
      .slice(0, 5);
  };
  const tactics = {
    home: optionalList(tacticsRaw.home, "tactics.home"),
    away: optionalList(tacticsRaw.away, "tactics.away"),
  };

  const keyFactors = stringList(root.keyFactors, "keyFactors", 5);
  if (keyFactors.length < 3) {
    throw new InvalidAnalysisError("keyFactors must list at least 3 factors");
  }

  const verdictRecord = asRecord(root.verdict);
  if (!verdictRecord) throw new InvalidAnalysisError("verdict is missing");

  return {
    summary: text(root.summary, "summary", { max: 1400 }),
    reliability: {
      // A model that flags insufficient data cannot also claim high trust.
      level,
      insufficientData,
      reason: text(reliability.reason, "reliability.reason", { max: 600 }),
    },
    winner: winnerRaw,
    finalScore,
    htScore,
    whyItEnded: {
      reasoning: text(why.reasoning, "whyItEnded.reasoning", { max: 1200 }),
      ...(turningPoint ? { turningPoint } : {}),
    },
    timeline,
    statReading,
    tactics,
    keyFactors,
    verdict: {
      headline: text(verdictRecord.headline, "verdict.headline", { max: 200 }),
      body: text(verdictRecord.body, "verdict.body", { max: 1000 }),
    },
  };
}

/* ----------------------------------------------------------------------- */
/* Translation integrity                                                    */
/* ------------------------------------------------------------------------ */

/**
 * The Arabic mirror must keep every number, enum-like value and structural
 * count identical: winner, both scorelines, timeline references (and their
 * optional impact labels), turning-point presence and list lengths. Only the
 * free text may differ.
 */
export function assertSameHistoricalNumbers(
  baseline: HistoricalAnalysis,
  candidate: HistoricalAnalysis,
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

  sameEnum(baseline.winner, candidate.winner, "winner");
  sameNumber(baseline.finalScore.home, candidate.finalScore.home, "finalScore.home");
  sameNumber(baseline.finalScore.away, candidate.finalScore.away, "finalScore.away");

  if ((baseline.htScore === null) !== (candidate.htScore === null)) {
    reject("htScore presence");
  }
  if (baseline.htScore && candidate.htScore) {
    sameNumber(baseline.htScore.home, candidate.htScore.home, "htScore.home");
    sameNumber(baseline.htScore.away, candidate.htScore.away, "htScore.away");
  }

  sameEnum(
    baseline.reliability.level,
    candidate.reliability.level,
    "reliability.level",
  );
  if (baseline.reliability.insufficientData !== candidate.reliability.insufficientData) {
    reject("reliability.insufficientData");
  }

  const baselinePoint = baseline.whyItEnded.turningPoint;
  const candidatePoint = candidate.whyItEnded.turningPoint;
  if ((baselinePoint === undefined) !== (candidatePoint === undefined)) {
    reject("whyItEnded.turningPoint presence");
  }
  if (baselinePoint && candidatePoint) {
    sameNumber(
      baselinePoint.eventRef,
      candidatePoint.eventRef,
      "whyItEnded.turningPoint.eventRef",
    );
  }

  if (baseline.timeline.length !== candidate.timeline.length) {
    reject("timeline length");
  }
  baseline.timeline.forEach((entry, index) => {
    const mirror = candidate.timeline[index];
    sameNumber(entry.eventRef, mirror.eventRef, `timeline[${index}].eventRef`);
    if (Boolean(entry.impact) !== Boolean(mirror.impact)) {
      reject(`timeline[${index}].impact presence`);
    }
  });

  if (baseline.keyFactors.length !== candidate.keyFactors.length) {
    reject("keyFactors length");
  }
  if (baseline.tactics.home.length !== candidate.tactics.home.length) {
    reject("tactics.home length");
  }
  if (baseline.tactics.away.length !== candidate.tactics.away.length) {
    reject("tactics.away length");
  }
}
