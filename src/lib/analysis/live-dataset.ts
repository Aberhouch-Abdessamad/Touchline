/**
 * Structured dataset for the Touchline AI live (in-play) match analysis.
 *
 * Everything is a deterministic fact extracted in code from ESPN's published
 * match summary *while the match is in play*: the running score, the current
 * clock, the chronological event list and the in-match statistics, plus the
 * frozen pre-kick-off context (each side's results before this fixture,
 * head-to-head meetings before kick-off, closing pre-match odds).
 *
 * The module is stateless: it never reads the store — the orchestrator passes
 * the stored document in. Nothing is invented; every gap is flagged in
 * `dataQuality` so the model treats it as unavailable.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { fetchSummary, fetchTeamSchedule } from "@/lib/espn";
import { normalizeSummary, normalizeTeamFixtures } from "@/lib/normalize";
import type { MatchDetails, TeamFixture } from "@/lib/types";
import {
  InsufficientMatchDataError,
  extractH2H,
  extractMarketOdds,
  parseScore,
} from "./dataset";
import type {
  HistoricalEventFact,
} from "./retrospective-dataset";
import {
  classifyEvent,
  competitorSides,
  playerNames,
  preMatchContext,
  rawEventsOf,
  runningScores,
} from "./retrospective-dataset";
import type {
  LiveTrigger,
  StoredLive,
  StoredLiveContext,
  StoredLivePreMatchPrediction,
  StoredLiveSnapshot,
  StoredLiveSnapshot as Snapshot,
  LiveTrajectoryPoint,
} from "./store";

export class MatchNotLiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchNotLiveError";
  }
}

/** One provider statistic row with its parsed numeric values. */
export interface LiveStatRow {
  name: string;
  label: string;
  home: string;
  away: string;
  homeValue: number;
  awayValue: number;
  percent: boolean;
}

export interface LiveStatistics {
  provider: "espn";
  available: boolean;
  rows: LiveStatRow[];
  cardStatsPublished: boolean;
}

/** Match header as the dashboard needs it (logos, colours, running score). */
export interface LiveTeamFact {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  color?: string;
  score: number;
  record?: string;
}

export interface LiveFixtureFact {
  id: string;
  name: string;
  kickoff: string;
  state: string;
  statusLabel: string;
  statusDetail: string;
  competition: { name: string; slug?: string; logo?: string };
  round?: string;
  season?: number;
  venue?: string;
  city?: string;
  country?: string;
  home: LiveTeamFact;
  away: LiveTeamFact;
}

export interface LiveDataQuality {
  state: string;
  minuteLabel: string;
  /** Provider clock was published so the minute is known. */
  minuteKnown: boolean;
  timelineEvents: number;
  goalEvents: number;
  cardEvents: number;
  timelineComplete: boolean;
  statsAvailable: boolean;
  cardStatsPublished: boolean;
  substitutions: number;
  /** The provider published a running score for this match. */
  scorePublished: boolean;
  sufficient: boolean;
  insufficientReasons: string[];
}

export interface LiveFacts {
  match: LiveFixtureFact;
  minuteLabel: string;
  /** Current minute (base + added time) when parseable. */
  minuteValue?: number;
  /** Minute expressed in clock seconds (minute * 60); chart units. */
  clockValue?: number;
  score: { home: number; away: number };
  /** Who leads right now, purely from the published score. */
  winnerNow: "home" | "away" | "even";
  events: HistoricalEventFact[];
  timelineComplete: boolean;
  substitutions: { home: number; away: number };
  statistics: LiveStatistics;
  dataQuality: LiveDataQuality;
}

export interface LiveDataset {
  facts: LiveFacts;
  /** Frozen pre-kick-off context (reused from the stored document). */
  context: StoredLiveContext;
  previous?: Snapshot;
  /** Predictions of every stored snapshot, oldest first. */
  trajectory: LiveTrajectoryPoint[];
  preMatchPrediction?: StoredLivePreMatchPrediction;
}

/* ----------------------------------------------------------------------- */
/* Clock parsing                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Parse the provider's display clock ("45'+2'", "63'", "90+3'") into label
 * plus minute. Half-time is 45, a finished match is 90 — the published
 * states, not invented stoppage arithmetic.
 */
function parseClock(clock: string | undefined): { label: string; value?: number } {
  const label = clock?.trim() ?? "";
  if (!label) return { label: "" };
  const match = label.match(/^(\d+)(?:\s*\+\s*(\d+))?/);
  if (match) {
    const base = Number(match[1]);
    const added = match[2] ? Number(match[2]) : 0;
    if (Number.isFinite(base)) {
      return { label, value: Number.isFinite(added) ? base + added : base };
    }
  }
  return { label };
}

/* ----------------------------------------------------------------------- */
/* Fact extraction                                                          */
/* ------------------------------------------------------------------------ */

/** Statistics that may enter the live dataset (broader than the match one). */
const LIVE_STATS =
  /card|goal|possession|shot|foul|corner|save|tackle|offside|pass|chance|accurate/i;

export function liveStatistics(details: MatchDetails): LiveStatistics {
  const rows: LiveStatRow[] = details.stats
    .filter((stat) => LIVE_STATS.test(`${stat.name} ${stat.label}`))
    .slice(0, 32)
    .map((stat) => ({
      name: stat.name,
      label: stat.label,
      home: stat.home,
      away: stat.away,
      homeValue: stat.homeValue,
      awayValue: stat.awayValue,
      percent: stat.percent === true,
    }));
  return {
    provider: "espn",
    available: rows.length > 0,
    rows,
    cardStatsPublished: rows.some((row) => /card/i.test(`${row.name} ${row.label}`)),
  };
}

/**
 * Extract every live fact from one provider payload. Works for in-play and
 * finished states alike — callers gate on state (`buildLiveDataset` refuses
 * anything not in play, the final report wants the finished payload).
 */
export async function buildLiveFacts(matchId: string): Promise<LiveFacts> {
  const raw = await fetchSummary(matchId);
  const details: MatchDetails | null = normalizeSummary(raw, matchId);
  if (!details) {
    throw new InsufficientMatchDataError(
      "The provider has no usable summary for that match id.",
    );
  }
  return factsOf(details, raw);
}

function factsOf(details: MatchDetails, raw: any): LiveFacts {
  const match = details.match;
  const score = {
    home: parseScore(match.home.score) ?? 0,
    away: parseScore(match.away.score) ?? 0,
  };
  const scorePublished =
    parseScore(match.home.score) !== null && parseScore(match.away.score) !== null;

  let minuteLabel = "";
  let minuteValue: number | undefined;
  if (match.state === "halftime") {
    minuteLabel = "45'";
    minuteValue = 45;
  } else if (match.state === "finished") {
    minuteLabel = "90'";
    minuteValue = 90;
  } else {
    const parsed = parseClock(match.clock);
    minuteLabel = parsed.label;
    minuteValue = parsed.value;
  }
  const minuteKnown = minuteValue !== undefined;

  // ---- Event facts (the same pipeline as the retrospective feature) -------
  const sides = competitorSides(raw);
  const eventsPre: Array<
    Omit<HistoricalEventFact, "index"> & { clock: number }
  > = [];
  const substitutions = { home: 0, away: 0 };

  for (const rawEvent of rawEventsOf(raw)) {
    if (
      /substitu/i.test(
        String(rawEvent?.type?.text ?? "") + String(rawEvent?.type?.type ?? ""),
      )
    ) {
      const side = sides.get(String(rawEvent?.team?.id ?? ""));
      if (side === "home") substitutions.home += 1;
      else if (side === "away") substitutions.away += 1;
      continue;
    }
    const kind = classifyEvent(rawEvent);
    if (!kind) continue;
    const eventClock =
      typeof rawEvent.clock?.value === "number" ? rawEvent.clock.value : undefined;
    eventsPre.push({
      kind,
      side: sides.get(String(rawEvent.team?.id ?? "")) ?? null,
      minute:
        typeof rawEvent.clock?.displayValue === "string" && rawEvent.clock.displayValue.trim()
          ? rawEvent.clock.displayValue.trim()
          : "",
      clockValue: eventClock,
      players: playerNames(rawEvent),
      scoring: rawEvent.scoringPlay === true,
      penalty: rawEvent.penaltyKick === true,
      ownGoal: rawEvent.ownGoal === true,
      text:
        (typeof rawEvent.text === "string" && rawEvent.text.trim()) ||
        (typeof rawEvent.type?.text === "string" && rawEvent.type.text.trim()) ||
        "Match event",
      clock: typeof eventClock === "number" ? eventClock : Number.MAX_SAFE_INTEGER,
    });
  }
  eventsPre.sort((a, b) => a.clock - b.clock);
  const events: HistoricalEventFact[] = eventsPre.map((event, index) => {
    const { clock, ...fact } = event;
    void clock;
    return { ...fact, index: index + 1 };
  });
  const timelineComplete = runningScores(events, score);

  const statistics = liveStatistics(details);
  const goalEvents = events.filter(
    (event) =>
      event.kind === "goal" ||
      event.kind === "penalty-goal" ||
      event.kind === "own-goal",
  ).length;
  const cardEvents = events.filter(
    (event) => event.kind === "yellow-card" || event.kind === "red-card",
  ).length;

  const insufficientReasons: string[] = [];
  if (!scorePublished) {
    insufficientReasons.push(
      "The provider has not published a running score for this match yet.",
    );
  }
  if (!minuteKnown) {
    insufficientReasons.push(
      "The provider has not published a match clock, so the minute is unknown.",
    );
  }
  if (!statistics.available) {
    insufficientReasons.push("No provider statistics were published for this match.");
  }

  return {
    match: {
      id: match.id,
      name: match.name,
      kickoff: match.date,
      state: match.state,
      statusLabel: match.statusLabel,
      statusDetail: match.statusDetail,
      competition: {
        name: match.competition.name,
        slug: match.competition.slug,
        logo: match.competition.logo,
      },
      round: match.round,
      season: match.season,
      venue: match.venue,
      city: match.city,
      country: match.country,
      home: {
        id: match.home.id,
        name: match.home.name,
        shortName: match.home.shortName,
        abbreviation: match.home.abbreviation,
        logo: match.home.logo,
        color: match.home.color,
        score: score.home,
        record: match.home.record,
      },
      away: {
        id: match.away.id,
        name: match.away.name,
        shortName: match.away.shortName,
        abbreviation: match.away.abbreviation,
        logo: match.away.logo,
        color: match.away.color,
        score: score.away,
        record: match.away.record,
      },
    },
    minuteLabel,
    minuteValue,
    clockValue: minuteValue !== undefined ? minuteValue * 60 : undefined,
    score,
    winnerNow:
      score.home > score.away ? "home" : score.away > score.home ? "away" : "even",
    events,
    timelineComplete,
    substitutions,
    statistics,
    dataQuality: {
      state: match.state,
      minuteLabel,
      minuteKnown,
      timelineEvents: events.length,
      goalEvents,
      cardEvents,
      timelineComplete,
      statsAvailable: statistics.available,
      cardStatsPublished: statistics.cardStatsPublished,
      substitutions: substitutions.home + substitutions.away,
      scorePublished,
      sufficient: scorePublished && minuteKnown,
      insufficientReasons,
    },
  };
}

/* ----------------------------------------------------------------------- */
/* Fingerprint and trigger detection                                        */
/* ------------------------------------------------------------------------ */

/**
 * Identity of a captured state: score, event signatures and statistic rows —
 * deliberately without the minute, so a captured analysis stays valid between
 * two ticks of the clock. `null` fingerprints never dedupe (compare with `!==`).
 */
export function liveFingerprint(facts: LiveFacts): string {
  const payload = {
    score: facts.score,
    events: facts.events.map(
      (event) =>
        `${event.kind}|${event.side ?? ""}|${event.clockValue ?? event.minute}|${event.text}`,
    ),
    statistics: facts.statistics.rows.map((row) => `${row.name}|${row.home}|${row.away}`),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 40);
}

function eventSignature(event: HistoricalEventFact): string {
  return `${event.kind}|${event.side ?? ""}|${event.clockValue ?? event.minute}|${event.text}`;
}

/** Statistic classes that may force a capture on their own. */
export const LIVE_STAT_THRESHOLDS = {
  /** Percentage points of possession on either side. */
  possession: 8,
  /** Combined increase in total shots. */
  shots: 4,
  /** Combined increase in shots on target. */
  shotsOnTarget: 3,
} as const;

function statClassOf(name: string, label: string): "possession" | "shots" | "shotsOnTarget" | null {
  const key = `${name} ${label}`.toLowerCase();
  if (/possession/.test(key)) return "possession";
  // "Shots on Target" also contains "shots" — check it first.
  if (/shots?\s*on\s*target|shotsontarget|on\s*target/.test(key)) return "shotsOnTarget";
  if (/\bshots?\b|totalshots/.test(key)) return "shots";
  return null;
}

/**
 * Did something the provider publishes change since the previous snapshot?
 * Returns the strongest trigger, or `null` when the interval policy must
 * decide (see the orchestrator).
 */
export function detectLiveTrigger(
  previous: StoredLiveSnapshot | undefined,
  facts: LiveFacts,
): LiveTrigger | null {
  if (!previous) return "first";

  if (
    previous.score.home !== facts.score.home ||
    previous.score.away !== facts.score.away
  ) {
    return "score_change";
  }

  const previousSignatures = new Set(previous.events.map(eventSignature));
  const newEvents = facts.events.filter(
    (event) => !previousSignatures.has(eventSignature(event)),
  );
  if (newEvents.some((event) => event.kind === "red-card")) return "red_card";
  if (
    newEvents.some(
      (event) => event.kind === "penalty-goal" || event.kind === "penalty-missed",
    )
  ) {
    return "penalty";
  }
  if (newEvents.length > 0) return "event";

  // Statistics shifted past a threshold, or appeared for the first time.
  if (!previous.statistics.available && facts.statistics.available) return "stats";
  const previousRows = new Map(previous.statistics.rows.map((row) => [row.name, row]));
  for (const row of facts.statistics.rows) {
    const before = previousRows.get(row.name);
    if (!before) continue;
    const deltaHome = row.homeValue - before.homeValue;
    const deltaAway = row.awayValue - before.awayValue;
    const statClass = statClassOf(row.name, row.label);
    if (statClass === "possession") {
      if (
        Math.max(Math.abs(deltaHome), Math.abs(deltaAway)) >=
        LIVE_STAT_THRESHOLDS.possession
      ) {
        return "stats";
      }
    } else if (statClass === "shots") {
      if (deltaHome + deltaAway >= LIVE_STAT_THRESHOLDS.shots) return "stats";
    } else if (statClass === "shotsOnTarget") {
      if (deltaHome + deltaAway >= LIVE_STAT_THRESHOLDS.shotsOnTarget) return "stats";
    }
  }

  return null;
}

/* ----------------------------------------------------------------------- */
/* Frozen pre-match context                                                 */
/* ------------------------------------------------------------------------ */

async function buildFrozenContext(
  details: MatchDetails,
  raw: any,
): Promise<StoredLiveContext> {
  const match = details.match;
  const kickoffMs = Date.parse(match.date);
  const season = match.season ?? new Date().getUTCFullYear();

  const loadFixtures = async (teamId: string): Promise<TeamFixture[]> => {
    try {
      const scheduleRaw = await fetchTeamSchedule(teamId, season);
      return normalizeTeamFixtures(scheduleRaw, teamId);
    } catch {
      // The schedule is optional context; a miss must not block the analysis.
      return [];
    }
  };
  const [homeFixtures, awayFixtures] = await Promise.all([
    loadFixtures(match.home.id),
    loadFixtures(match.away.id),
  ]);

  const home = preMatchContext(homeFixtures, match.home.id, match.home.name, kickoffMs);
  const away = preMatchContext(awayFixtures, match.away.id, match.away.name, kickoffMs);

  const meetingsBefore = details.headToHead.filter((meeting) => {
    const when = Date.parse(meeting.date);
    return Number.isFinite(when) && when < kickoffMs;
  });
  const headToHead = extractH2H(meetingsBefore, match.home.id);
  const marketOdds = extractMarketOdds(raw);

  return { home, away, headToHead, marketOdds };
}

/* ----------------------------------------------------------------------- */
/* Dataset builder                                                          */
/* ------------------------------------------------------------------------ */

/**
 * Build the user-message dataset for one capture. When a stored document
 * already exists its frozen context, previous snapshot and trajectory are
 * reused (no refetch of team schedules mid-match); otherwise the context is
 * fetched and frozen here.
 */
export async function buildLiveDataset(
  matchId: string,
  stored: StoredLive | null,
): Promise<LiveDataset> {
  const raw = await fetchSummary(matchId);
  const details: MatchDetails | null = normalizeSummary(raw, matchId);
  if (!details) {
    throw new InsufficientMatchDataError(
      "The provider has no usable summary for that match id.",
    );
  }
  const facts = factsOf(details, raw);
  const state = facts.match.state;
  if (state !== "live" && state !== "halftime") {
    throw new MatchNotLiveError(
      `The match is not live right now (state "${state}", status "${facts.match.statusLabel}"). ` +
        "Live analysis is only available while the match is in play.",
    );
  }

  const snapshots = stored?.snapshots ?? [];
  return {
    facts,
    context: stored?.frozenContext ?? (await buildFrozenContext(details, raw)),
    previous: snapshots[snapshots.length - 1],
    trajectory: snapshots.map((snapshot) => ({
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
    })),
    preMatchPrediction: stored?.preMatchPrediction,
  };
}
