/**
 * Structured dataset for the AI Historical (retrospective) match analysis.
 *
 * Everything is a deterministic fact extracted in code from ESPN's published
 * match summary: the final and half-time scores, the actual event list (with
 * ESPN's goal/card/penalty/VAR flags), the in-match statistics and the
 * pre-match context (each side's results strictly *before* this fixture,
 * head-to-head meetings before kick-off and the closing pre-match odds).
 *
 * No match *after* the fixture ever enters the context — hindsight uses only
 * the provider's in-match data. Nothing is invented: every gap is flagged in
 * `dataQuality` so the model must treat it as unavailable.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchSummary, fetchTeamSchedule } from "@/lib/espn";
import { normalizeSummary, normalizeTeamFixtures } from "@/lib/normalize";
import type { HistoricalWinner } from "@/lib/ai/historical-schema";
import type { Match, MatchDetails, TeamFixture } from "@/lib/types";
import {
  InsufficientMatchDataError,
  extractH2H,
  extractMarketOdds,
  extractStats,
  parseScore,
  type DatasetHeadToHead,
  type DatasetMarketOdds,
  type DatasetRecentResult,
  type DatasetStatistics,
} from "./dataset";

/** Raised when a retrospective analysis is requested for a non-finished match. */
export class MatchNotFinishedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchNotFinishedError";
  }
}

export type HistoricalEventKind =
  | "goal"
  | "penalty-goal"
  | "own-goal"
  | "penalty-missed"
  | "yellow-card"
  | "red-card"
  | "var";

export interface HistoricalEventFact {
  /** 1-based, chronological (the index the model's `eventRef` points at). */
  index: number;
  kind: HistoricalEventKind;
  /** Team the provider attributed the event to; null when unattributed. */
  side: "home" | "away" | null;
  minute: string;
  clockValue?: number;
  players: string[];
  scoring: boolean;
  penalty: boolean;
  ownGoal: boolean;
  /** Running score after this event, only when fully derivable. */
  scoreAfter?: { home: number; away: number };
  /** Provider event text, verbatim. */
  text: string;
}

export interface PreMatchTeamRecord {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  cleanSheets: number;
  failedToScore: number;
}

export interface PreMatchTeamContext {
  id: string;
  name: string;
  /** Every published finished result strictly before this fixture. */
  seasonToDate: PreMatchTeamRecord;
  /** Most recent 10 finished results pre-fixture, same aggregation. */
  last10: PreMatchTeamRecord;
  last5: Array<{
    date: string;
    competition: string;
    venue: "home" | "away";
    opponent: string;
    result: "W" | "D" | "L";
    score: string;
  }>;
}

export interface HistoricalFixture {
  id: string;
  name: string;
  kickoff: string;
  state: string;
  statusLabel: string;
  competition: string;
  competitionSlug?: string;
  round?: string;
  season?: number;
  venue?: string;
  city?: string;
  country?: string;
  attendance?: number;
  home: { id: string; name: string; shortName: string; record?: string };
  away: { id: string; name: string; shortName: string; record?: string };
  finalScore: { home: number; away: number };
  /** `null` when the provider published no half-time progress. */
  htScore: { home: number; away: number } | null;
  winner: HistoricalWinner;
}

export interface HistoricalDataQuality {
  /** Event facts offered to the model (goals, cards, penalties, VAR). */
  timelineEvents: number;
  goalEvents: number;
  cardEvents: number;
  /** True when every goal is attributed and the running score is exact. */
  timelineComplete: boolean;
  statsAvailable: boolean;
  cardStatsPublished: boolean;
  scheduleResultsBeforeKickoff: { home: number; away: number };
  h2hMeetingsBeforeKickoff: number;
  oddsPublished: boolean;
  sufficient: boolean;
  insufficientReasons: string[];
}

export interface RetrospectiveDataset {
  fixture: HistoricalFixture;
  events: HistoricalEventFact[];
  timelineComplete: boolean;
  substitutions: { home: number; away: number };
  statistics: DatasetStatistics;
  preMatch: {
    home: PreMatchTeamContext;
    away: PreMatchTeamContext;
    headToHead: DatasetHeadToHead;
    marketOdds?: DatasetMarketOdds;
  };
  dataQuality: HistoricalDataQuality;
}

/* ----------------------------------------------------------------------- */
/* Event fact extraction (provider flags first, label sniffing second)      */
/* ------------------------------------------------------------------------ */

// The live pipeline reuses these fact-extraction helpers on the provider
// payload mid-match; they are exported alongside `buildRetrospectiveDataset`.
export function classifyEvent(raw: any): HistoricalEventKind | null {
  if (!raw || typeof raw !== "object") return null;
  const typeText = typeof raw.type?.text === "string" ? raw.type.text : "";
  const typeType = typeof raw.type?.type === "string" ? raw.type.type : "";
  const eventText = typeof raw.text === "string" ? raw.text : "";
  const body = `${typeText} ${typeType}`;
  const combined = `${body} ${eventText}`;
  const isSubstitutionOrPeriod = /substitu|period|kick.?off|game (start|end)|half.?time/i.test(
    combined,
  );
  if (isSubstitutionOrPeriod) return null;

  // ESPN's own flags are authoritative.
  if (raw.scoringPlay === true) {
    if (raw.ownGoal === true) return "own-goal";
    if (raw.penaltyKick === true) return "penalty-goal";
    return "goal";
  }
  if (raw.redCard === true) return "red-card";
  if (raw.yellowCard === true) return "yellow-card";

  // Missed penalties may arrive without a scored/goal flag.
  if (raw.penaltyKick === true) return "penalty-missed";
  if (
    /penalt/i.test(combined) &&
    /miss|saved|fail|wide|blocked|off target|over the/i.test(combined)
  ) {
    return "penalty-missed";
  }

  // VAR text-only decisions (no flag).
  if (/\bvar\b|video assistant|video review/i.test(combined)) return "var";

  // Label fallbacks for feeds that publish flags inconsistently.
  if (/second yellow|\bred card\b/i.test(combined)) return "red-card";
  if (/\byellow card\b/i.test(combined)) return "yellow-card";
  if (/own\s*goal/i.test(combined)) return "own-goal";
  if (/penalt/i.test(body)) {
    return /scored/i.test(body) ? "penalty-goal" : "penalty-missed";
  }
  if (/goal/i.test(body)) return "goal";

  // Anything else is not a timeline fact.
  return null;
}

export function playerNames(raw: any): string[] {
  const names = new Set<string>();
  for (const athlete of Array.isArray(raw.athletesInvolved) ? raw.athletesInvolved : []) {
    const name = typeof athlete?.displayName === "string" ? athlete.displayName.trim() : "";
    if (name) names.add(name);
  }
  for (const participant of Array.isArray(raw.participants) ? raw.participants : []) {
    const name =
      typeof participant?.athlete?.displayName === "string"
        ? participant.athlete.displayName.trim()
        : "";
    if (name) names.add(name);
  }
  return [...names].slice(0, 3);
}

export function rawEventsOf(raw: any): any[] {
  if (Array.isArray(raw.keyEvents)) return raw.keyEvents;
  const competition = raw?.header?.competitions?.[0];
  return Array.isArray(competition?.details) ? competition.details : [];
}

export function competitorSides(raw: any): Map<string, "home" | "away"> {
  const sides = new Map<string, "home" | "away">();
  const competitors: any[] = raw?.header?.competitions?.[0]?.competitors ?? [];
  for (const competitor of competitors) {
    if (competitor?.homeAway === "home" || competitor?.homeAway === "away") {
      if (competitor.id !== undefined) sides.set(String(competitor.id), competitor.homeAway);
    }
  }
  return sides;
}

/**
 * Running score after each goal, published only when every goal is
 * attributed to a side without own goals and the event count matches the
 * final score exactly — otherwise the timeline is labelled incomplete and
 * no running score is offered (an honest gap, never a guess).
 */
export function runningScores(
  events: HistoricalEventFact[],
  finalScore: { home: number; away: number },
): boolean {
  const scoring = events.filter((event) =>
    event.kind === "goal" ||
    event.kind === "penalty-goal" ||
    event.kind === "own-goal",
  );
  const ownGoalPresent = scoring.some((event) => event.kind === "own-goal");
  const attributed = scoring.every((event) => event.side !== null);

  let complete: boolean;
  if (scoring.length === 0) {
    // A goalless scoreline with no published goal events is exact.
    complete = finalScore.home === 0 && finalScore.away === 0;
  } else {
    const totals = scoring.reduce(
      (total, event) => {
        const credited =
          event.kind === "own-goal"
            ? event.side === "home"
              ? "away"
              : "home"
            : event.side;
        if (credited === "home") total.home += 1;
        else if (credited === "away") total.away += 1;
        return total;
      },
      { home: 0, away: 0 },
    );
    complete =
      !ownGoalPresent &&
      attributed &&
      totals.home === finalScore.home &&
      totals.away === finalScore.away;
  }

  if (complete && scoring.length > 0) {
    let home = 0;
    let away = 0;
    for (const event of scoring) {
      // Own goals are already excluded from a complete timeline.
      if (event.side === "home") home += 1;
      else away += 1;
      event.scoreAfter = { home, away };
    }
  }
  return complete;
}

/* ----------------------------------------------------------------------- */
/* Pre-match context (strictly before kick-off)                             */
/* ------------------------------------------------------------------------ */

function aggregateRecord(results: DatasetRecentResult[]): PreMatchTeamRecord {
  const wins = results.filter((result) => result.result === "W");
  const draws = results.filter((result) => result.result === "D");
  const losses = results.filter((result) => result.result === "L");
  return {
    matches: results.length,
    wins: wins.length,
    draws: draws.length,
    losses: losses.length,
    goalsFor: results.reduce((sum, result) => sum + result.goalsFor, 0),
    goalsAgainst: results.reduce((sum, result) => sum + result.goalsAgainst, 0),
    points: wins.length * 3 + draws.length,
    cleanSheets: results.filter((result) => result.goalsAgainst === 0).length,
    failedToScore: results.filter((result) => result.goalsFor === 0).length,
  };
}

/**
 * Schedule-derived pre-fixture form. Unlike `buildTeamProfile` (prediction
 * flow) this counts every finished result before kick-off, not a capped
 * recent window, so the retrospective sees the exact season-to-date table.
 * The live analyst reuses it to freeze the pre-kick-off context at the first
 * capture.
 */
export function preMatchContext(
  fixtures: TeamFixture[],
  teamId: string,
  teamName: string,
  kickoffMs: number,
): PreMatchTeamContext {
  const newestFirst: DatasetRecentResult[] = [];
  for (const fixture of fixtures) {
    if (fixture.state !== "finished") continue;
    const when = Date.parse(fixture.date);
    if (!Number.isFinite(when) || when >= kickoffMs) continue;
    const teamHome = fixture.home.id === teamId;
    if (!teamHome && fixture.away.id !== teamId) continue;
    const gf = parseScore(teamHome ? fixture.homeScore : fixture.awayScore);
    const ga = parseScore(teamHome ? fixture.awayScore : fixture.homeScore);
    if (gf === null || ga === null) continue;
    newestFirst.push({
      date: fixture.date,
      competition: fixture.leagueName ?? "Unsorted competition",
      venue: teamHome ? "home" : "away",
      opponent: (teamHome ? fixture.away : fixture.home).name,
      result: gf > ga ? "W" : gf < ga ? "L" : "D",
      score: `${gf}-${ga}`,
      goalsFor: gf,
      goalsAgainst: ga,
    });
  }
  newestFirst.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  return {
    id: teamId,
    name: teamName,
    seasonToDate: aggregateRecord(newestFirst),
    last10: aggregateRecord(newestFirst.slice(0, 10)),
    last5: newestFirst.slice(0, 5).map((result) => ({
      date: result.date,
      competition: result.competition,
      venue: result.venue,
      opponent: result.opponent,
      result: result.result,
      score: result.score,
    })),
  };
}

/* ----------------------------------------------------------------------- */
/* Provider extraction                                                      */
/* ------------------------------------------------------------------------ */

function finalScoreOf(raw: any, match: Match): { home: number; away: number } {
  const competitors: any[] = raw?.header?.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((competitor) => competitor?.homeAway === "home");
  const away = competitors.find((competitor) => competitor?.homeAway === "away");
  const hs = parseScore(home?.score ?? match.home.score);
  const as = parseScore(away?.score ?? match.away.score);
  if (hs === null || as === null) {
    throw new InsufficientMatchDataError(
      "The provider published no final score for this match.",
    );
  }
  return { home: hs, away: as };
}

function halfTimeOf(
  raw: any,
  finalScore: { home: number; away: number },
): { home: number; away: number } | null {
  const competitors: any[] = raw?.header?.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((competitor) => competitor?.homeAway === "home");
  const away = competitors.find((competitor) => competitor?.homeAway === "away");
  const segments = (competitor: any) => {
    const linescores: any[] = Array.isArray(competitor?.linescores)
      ? competitor.linescores
      : [];
    if (linescores.length < 2) return { values: [], complete: false };
    const values = linescores.map((entry) =>
      Number(entry?.displayValue ?? entry?.value ?? NaN),
    );
    return { values, complete: values.every((value) => Number.isFinite(value)) };
  };
  const homeSplit = segments(home);
  const awaySplit = segments(away);
  if (!homeSplit.complete || !awaySplit.complete) return null;
  const homeHt = homeSplit.values[0];
  const awayHt = awaySplit.values[0];
  if (!Number.isFinite(homeHt) || !Number.isFinite(awayHt)) return null;

  // Defence-in-depth: with a regular two-segment match the split must add up
  // to the reported total; anything else means the provider's linescores are
  // untrustworthy and half-time stays unpublished rather than invented.
  if (homeSplit.values.length === 2 && homeHt + homeSplit.values[1] !== finalScore.home) {
    return null;
  }
  if (awaySplit.values.length === 2 && awayHt + awaySplit.values[1] !== finalScore.away) {
    return null;
  }
  return { home: homeHt, away: awayHt };
}

/* ----------------------------------------------------------------------- */
/* Public entry point                                                       */
/* ------------------------------------------------------------------------ */

export async function buildRetrospectiveDataset(
  matchId: string,
): Promise<RetrospectiveDataset> {
  const raw = await fetchSummary(matchId);
  const details: MatchDetails | null = normalizeSummary(raw, matchId);
  if (!details) {
    throw new InsufficientMatchDataError(
      "The provider has no usable summary for that match id.",
    );
  }

  const match = details.match;
  if (match.state !== "finished") {
    throw new MatchNotFinishedError(
      `The match is not finished yet (state "${match.state}", status "${match.statusLabel}"). ` +
        "Historical analysis is only available for completed matches.",
    );
  }

  const kickoffMs = Date.parse(match.date);
  const finalScore = finalScoreOf(raw, match);
  const htScore = halfTimeOf(raw, finalScore);
  const winner: HistoricalWinner =
    finalScore.home > finalScore.away
      ? "home"
      : finalScore.away > finalScore.home
        ? "away"
        : "even";

  // ---- Event facts (chronological, from the raw provider payload) ---------
  const sides = competitorSides(raw);
  const eventsPre: Array<Omit<HistoricalEventFact, "index"> & { clock: number }> = [];
  const substitutions = { home: 0, away: 0 };

  for (const rawEvent of rawEventsOf(raw)) {
    if (/substitu/i.test(String(rawEvent?.type?.text ?? "") + String(rawEvent?.type?.type ?? ""))) {
      const side = sides.get(String(rawEvent?.team?.id ?? ""));
      if (side === "home") substitutions.home += 1;
      else if (side === "away") substitutions.away += 1;
      continue;
    }
    const kind = classifyEvent(rawEvent);
    if (!kind) continue;
    const clockValue =
      typeof rawEvent.clock?.value === "number" ? rawEvent.clock.value : undefined;
    eventsPre.push({
      kind,
      side: sides.get(String(rawEvent.team?.id ?? "")) ?? null,
      minute:
        typeof rawEvent.clock?.displayValue === "string" && rawEvent.clock.displayValue.trim()
          ? rawEvent.clock.displayValue.trim()
          : "",
      clockValue,
      players: playerNames(rawEvent),
      scoring: rawEvent.scoringPlay === true,
      penalty: rawEvent.penaltyKick === true,
      ownGoal: rawEvent.ownGoal === true,
      text:
        (typeof rawEvent.text === "string" && rawEvent.text.trim()) ||
        (typeof rawEvent.type?.text === "string" && rawEvent.type.text.trim()) ||
        "Match event",
      clock: typeof clockValue === "number" ? clockValue : Number.MAX_SAFE_INTEGER,
    });
  }
  eventsPre.sort((a, b) => a.clock - b.clock);
  const events: HistoricalEventFact[] = eventsPre.map((event, index) => {
    const { clock, ...fact } = event;
    void clock;
    return { ...fact, index: index + 1 };
  });
  const timelineComplete = runningScores(events, finalScore);

  // ---- Statistics and pre-match context ----------------------------------
  const statistics = extractStats(details);
  // For a finished match the summary's competitor stats are the in-match
  // totals, not season aggregates; the prediction flow's pre/live heuristic
  // labels them "season_totals". Correct the scope so the model reads these
  // numbers as what happened in THIS match.
  if (statistics.available && match.state === "finished") {
    statistics.scope = "match_stats";
  }
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

  const preMatchHome = preMatchContext(
    homeFixtures,
    match.home.id,
    match.home.name,
    kickoffMs,
  );
  const preMatchAway = preMatchContext(
    awayFixtures,
    match.away.id,
    match.away.name,
    kickoffMs,
  );

  // Head-to-head history strictly before this fixture; the fixture itself and
  // anything later are excluded — no post-kick-off context.
  const meetingsBefore = details.headToHead.filter((meeting) => {
    const when = Date.parse(meeting.date);
    return Number.isFinite(when) && when < kickoffMs;
  });
  const headToHead = extractH2H(meetingsBefore, match.home.id);
  const marketOdds = extractMarketOdds(raw);

  // ---- Data quality -------------------------------------------------------
  const goalEvents = events.filter((event) =>
    event.kind === "goal" ||
    event.kind === "penalty-goal" ||
    event.kind === "own-goal",
  ).length;
  const cardEvents = events.filter(
    (event) => event.kind === "yellow-card" || event.kind === "red-card",
  ).length;

  const insufficientReasons: string[] = [];
  if (events.length === 0) {
    insufficientReasons.push(
      "The provider published no timeline events for this match.",
    );
  } else if (!timelineComplete) {
    insufficientReasons.push(
      "The event list is incomplete; goal attribution and the running score are not exact.",
    );
  }
  if (!statistics.available) {
    insufficientReasons.push(
      "No provider statistics were published for this match.",
    );
  }
  if (preMatchHome.seasonToDate.matches === 0) {
    insufficientReasons.push(
      "No pre-fixture results were published for the home team.",
    );
  }
  if (preMatchAway.seasonToDate.matches === 0) {
    insufficientReasons.push(
      "No pre-fixture results were published for the away team.",
    );
  }
  if (headToHead.record.counted === 0) {
    insufficientReasons.push(
      "No head-to-head meetings before this fixture are available.",
    );
  }

  const sufficient =
    events.length > 0 ||
    statistics.available ||
    preMatchHome.seasonToDate.matches > 0 ||
    preMatchAway.seasonToDate.matches > 0 ||
    headToHead.record.counted > 0;

  return {
    fixture: {
      id: match.id,
      name: match.name,
      kickoff: match.date,
      state: match.state,
      statusLabel: match.statusLabel,
      competition: match.competition.name,
      competitionSlug: match.competition.slug ?? match.league?.slug,
      round: match.round,
      season,
      venue: match.venue,
      city: match.city,
      country: match.country,
      attendance: match.attendance && match.attendance > 0 ? match.attendance : undefined,
      home: {
        id: match.home.id,
        name: match.home.name,
        shortName: match.home.shortName,
        record: match.home.record,
      },
      away: {
        id: match.away.id,
        name: match.away.name,
        shortName: match.away.shortName,
        record: match.away.record,
      },
      finalScore,
      htScore,
      winner,
    },
    events,
    timelineComplete,
    substitutions,
    statistics,
    preMatch: {
      home: preMatchHome,
      away: preMatchAway,
      headToHead,
      marketOdds,
    },
    dataQuality: {
      timelineEvents: events.length,
      goalEvents,
      cardEvents,
      timelineComplete,
      statsAvailable: statistics.available,
      cardStatsPublished: statistics.cardStatsPublished,
      scheduleResultsBeforeKickoff: {
        home: preMatchHome.seasonToDate.matches,
        away: preMatchAway.seasonToDate.matches,
      },
      h2hMeetingsBeforeKickoff: headToHead.record.counted,
      oddsPublished: marketOdds !== undefined,
      sufficient,
      insufficientReasons,
    },
  };
}
