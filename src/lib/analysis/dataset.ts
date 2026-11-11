/**
 * Structured dataset for the FFC-Vision match analysis.
 *
 * Everything here comes from the football data APIs (ESPN public soccer
 * endpoints). Nothing is invented: every block carries its own availability
 * flag so missing statistics stay visibly missing. FFC-Vision only reasons
 * over this payload — it never fetches data itself.
 */
import { getStandings } from "@/lib/api";
import { fetchSummary, fetchTeamSchedule } from "@/lib/espn";
import { normalizeSummary, normalizeTeamFixtures } from "@/lib/normalize";
import type {
  HeadToHeadMatch,
  MatchDetails,
  MatchStat,
  StandingEntry,
  TeamFixture,
} from "@/lib/types";

export class InsufficientMatchDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientMatchDataError";
  }
}

export interface DatasetFixture {
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
  home: { id: string; name: string; shortName: string; seasonRecord?: string };
  away: { id: string; name: string; shortName: string; seasonRecord?: string };
}

export interface DatasetStandingRow {
  rank?: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form?: string;
}

export interface DatasetStandingSnapshot {
  provider: "espn";
  competitionSlug?: string;
  season?: number;
  available: boolean;
  home?: DatasetStandingRow;
  away?: DatasetStandingRow;
}

export interface DatasetRecentResult {
  date: string;
  competition: string;
  venue: "home" | "away";
  opponent: string;
  result: "W" | "D" | "L";
  score: string;
  goalsFor: number;
  goalsAgainst: number;
}

export interface TeamProfileDataset {
  id: string;
  name: string;
  seasonRecord?: string;
  aggregates: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    cleanSheets: number;
    failedToScore: number;
    bothTeamsScoredShare: number;
    matchesOverGoals: { line1_5: number; line2_5: number; line3_5: number };
    homeAndAway: {
      home: {
        matches: number;
        wins: number;
        draws: number;
        losses: number;
        goalsPerGame: number;
        goalsConcededPerGame: number;
      };
      away: {
        matches: number;
        wins: number;
        draws: number;
        losses: number;
        goalsPerGame: number;
        goalsConcededPerGame: number;
      };
    };
  };
  formGuide: Array<{
    date: string;
    opponent: string;
    result: "W" | "D" | "L";
    score: string;
    venue: "home" | "away";
  }>;
}

export interface DatasetHeadToHead {
  provider: "espn";
  totalReported: number;
  matches: Array<{
    date: string;
    home: string;
    away: string;
    score: string;
    winner: "home" | "draw" | "away";
  }>;
  /** From the fixture home team's perspective. */
  record: { homeWins: number; draws: number; awayWins: number; counted: number };
}

export interface ProviderStatRow {
  name: string;
  label: string;
  home: string;
  away: string;
}

export interface DatasetStatistics {
  provider: "espn";
  /** Provider note: season totals pre-kick-off, in-match statistics after. */
  scope: "season_totals" | "match_stats" | "unavailable";
  available: boolean;
  rows: ProviderStatRow[];
  cardStatsPublished: boolean;
}

export interface DatasetMarketOdds {
  provider?: string;
  details?: string;
  moneyline: { home?: string; draw?: string; away?: string };
  total: { line?: number; overOdds?: string; underOdds?: string };
}

export interface DatasetDataQuality {
  recentResultsPerTeam: { home: number; away: number };
  h2hMatches: number;
  standingsAvailable: boolean;
  seasonStatsAvailable: boolean;
  oddsPublished: boolean;
  cardHistoryAvailable: boolean;
  /** Rough pre-flight gate — the model still assigns the final reliability. */
  sufficient: boolean;
  insufficientReasons: string[];
}

export interface MatchDataset {
  fixture: DatasetFixture;
  standings: DatasetStandingSnapshot;
  homeTeam: TeamProfileDataset;
  awayTeam: TeamProfileDataset;
  headToHead: DatasetHeadToHead;
  recentResults: { home: DatasetRecentResult[]; away: DatasetRecentResult[] };
  statistics: DatasetStatistics;
  marketOdds?: DatasetMarketOdds;
  dataQuality: DatasetDataQuality;
}

const MAX_RECENT_RESULTS = 12;
const MAX_H2H_MATCHES = 8;

const INTERESTING_STATS = /card|goal|possession|shot|foul|corner|save|tackle/i;
const CARD_STATS = /card/i;

/* ----------------------------------------------------------------------- */
/* Aggregation helpers                                                      */
/* ------------------------------------------------------------------------ */

export function parseScore(value?: string): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resultOf(gf: number, ga: number): "W" | "D" | "L" {
  return gf > ga ? "W" : gf < ga ? "L" : "D";
}

function overShare(results: DatasetRecentResult[], line: number): number {
  if (results.length === 0) return 0;
  const over = results.filter(
    (result) => result.goalsFor + result.goalsAgainst > line,
  ).length;
  return Math.round((over / results.length) * 100) / 100;
}

function perGame(
  results: DatasetRecentResult[],
  key: "goalsFor" | "goalsAgainst",
): number {
  if (results.length === 0) return 0;
  const total = results.reduce((sum, result) => sum + result[key], 0);
  return Math.round((total / results.length) * 100) / 100;
}

function splitOf(
  results: DatasetRecentResult[],
  venue: "home" | "away",
): TeamProfileDataset["aggregates"]["homeAndAway"]["home"] {
  const subset = results.filter((result) => result.venue === venue);
  return {
    matches: subset.length,
    wins: subset.filter((result) => result.result === "W").length,
    draws: subset.filter((result) => result.result === "D").length,
    losses: subset.filter((result) => result.result === "L").length,
    goalsPerGame: perGame(subset, "goalsFor"),
    goalsConcededPerGame: perGame(subset, "goalsAgainst"),
  };
}

function buildTeamProfile(
  team: { id: string; name: string; record?: string },
  fixtures: TeamFixture[],
): { profile: TeamProfileDataset; results: DatasetRecentResult[] } {
  // Schedules are returned oldest-first; the analysis wants most recent first.
  const newestFirst = [...fixtures].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const results: DatasetRecentResult[] = [];
  for (const fixture of newestFirst) {
    if (fixture.state !== "finished") continue;
    if (results.length >= MAX_RECENT_RESULTS) break;
    const teamHome = fixture.home.id === team.id;
    if (!teamHome && fixture.away.id !== team.id) continue;
    const gf = parseScore(teamHome ? fixture.homeScore : fixture.awayScore);
    const ga = parseScore(teamHome ? fixture.awayScore : fixture.homeScore);
    if (gf === null || ga === null) continue;
    results.push({
      date: fixture.date,
      competition: fixture.leagueName ?? "Unsorted competition",
      venue: teamHome ? "home" : "away",
      opponent: (teamHome ? fixture.away : fixture.home).name,
      result: resultOf(gf, ga),
      score: `${gf}-${ga}`,
      goalsFor: gf,
      goalsAgainst: ga,
    });
  }

  const counted = results.length || 1;
  const rounded = (value: number) => Math.round(value * 100) / 100;

  return {
    profile: {
      id: team.id,
      name: team.name,
      seasonRecord: team.record,
      aggregates: {
        matches: results.length,
        wins: results.filter((r) => r.result === "W").length,
        draws: results.filter((r) => r.result === "D").length,
        losses: results.filter((r) => r.result === "L").length,
        goalsFor: results.reduce((sum, r) => sum + r.goalsFor, 0),
        goalsAgainst: results.reduce((sum, r) => sum + r.goalsAgainst, 0),
        cleanSheets: results.filter((r) => r.goalsAgainst === 0).length,
        failedToScore: results.filter((r) => r.goalsFor === 0).length,
        bothTeamsScoredShare: rounded(
          results.filter((r) => r.goalsFor > 0 && r.goalsAgainst > 0).length /
            counted,
        ),
        matchesOverGoals: {
          line1_5: overShare(results, 1.5),
          line2_5: overShare(results, 2.5),
          line3_5: overShare(results, 3.5),
        },
        homeAndAway: {
          home: splitOf(results, "home"),
          away: splitOf(results, "away"),
        },
      },
      formGuide: results.slice(0, 5).map((result) => ({
        date: result.date,
        opponent: result.opponent,
        result: result.result,
        score: result.score,
        venue: result.venue,
      })),
    },
    results,
  };
}

/* ----------------------------------------------------------------------- */
/* Provider extraction (defensive reads from raw ESPN payloads)              */
/* ------------------------------------------------------------------------ */

export function extractH2H(
  headToHead: HeadToHeadMatch[],
  fixtureHomeId: string,
): DatasetHeadToHead {
  const matches = headToHead.slice(0, MAX_H2H_MATCHES).map((match) => {
    const hs = parseScore(match.homeScore);
    const as = parseScore(match.awayScore);
    return {
      date: match.date,
      home: match.home.name,
      away: match.away.name,
      score:
        hs !== null && as !== null ? `${hs}-${as}` : match.status || "No result",
      winner:
        hs !== null && as !== null
          ? hs > as
            ? "home"
            : hs < as
              ? "away"
              : "draw"
          : "draw",
    } as DatasetHeadToHead["matches"][number];
  });

  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let counted = 0;
  // Meetings can list the fixture's home team in either slot, so outcomes
  // are re-oriented to the fixture side before counting.
  for (const match of headToHead) {
    const hs = parseScore(match.homeScore);
    const as = parseScore(match.awayScore);
    if (hs === null || as === null) continue;
    const fixtureHomeGoals = match.home.id === fixtureHomeId ? hs : as;
    const fixtureAwayGoals = match.home.id === fixtureHomeId ? as : hs;
    counted += 1;
    if (fixtureHomeGoals > fixtureAwayGoals) homeWins += 1;
    else if (fixtureHomeGoals < fixtureAwayGoals) awayWins += 1;
    else draws += 1;
  }

  return {
    provider: "espn",
    totalReported: headToHead.length,
    matches,
    record: { homeWins, draws, awayWins, counted },
  };
}

export function extractStats(details: MatchDetails): DatasetStatistics {
  const preMatch =
    details.match.state !== "live" && details.match.state !== "halftime";
  const rows: ProviderStatRow[] = details.stats
    .filter((stat: MatchStat) => INTERESTING_STATS.test(`${stat.name} ${stat.label}`))
    .slice(0, 24)
    .map((stat) => ({
      name: stat.name,
      label: stat.label,
      home: stat.home,
      away: stat.away,
    }));

  return {
    provider: "espn",
    scope: rows.length ? (preMatch ? "season_totals" : "match_stats") : "unavailable",
    available: rows.length > 0,
    rows,
    cardStatsPublished: rows.some((row) => CARD_STATS.test(`${row.name} ${row.label}`)),
  };
}

export function extractMarketOdds(raw: unknown): DatasetMarketOdds | undefined {
  const pickcenter: unknown[] | undefined = (raw as { pickcenter?: unknown[] })
    ?.pickcenter;
  const pick = Array.isArray(pickcenter) ? pickcenter[0] : undefined;
  if (!pick || typeof pick !== "object") return undefined;

  const record = pick as Record<string, unknown>;
  const home = record.homeTeamOdds as Record<string, unknown> | undefined;
  const away = record.awayTeamOdds as Record<string, unknown> | undefined;
  const draw = record.drawOdds as Record<string, unknown> | undefined;
  const provider = record.provider as { name?: unknown } | undefined;
  const oddsString = (value: unknown) =>
    typeof value === "number" || typeof value === "string"
      ? String(value)
      : undefined;
  const total =
    record.total as { over?: { close?: { line?: string } } } | undefined;

  const line =
    typeof record.overUnder === "number"
      ? record.overUnder
      : Number(String(total?.over?.close?.line ?? "").replace(/^[ou]/i, "")) ||
        undefined;

  const hasAnything =
    oddsString(home?.moneyLine) !== undefined ||
    oddsString(draw?.moneyLine) !== undefined ||
    oddsString(away?.moneyLine) !== undefined ||
    oddsString(record.details) !== undefined ||
    typeof record.overUnder === "number";

  if (!hasAnything) return undefined;

  return {
    provider: provider?.name ? String(provider.name) : undefined,
    details: typeof record.details === "string" ? record.details : undefined,
    moneyline: {
      home: oddsString(home?.moneyLine),
      draw: oddsString(draw?.moneyLine),
      away: oddsString(away?.moneyLine),
    },
    total: {
      line,
      overOdds: oddsString(record.overOdds),
      underOdds: oddsString(record.underOdds),
    },
  };
}

function standingRow(entries: StandingEntry[], teamId: string) {
  const row = entries.find((entry) => entry.team.id === teamId);
  if (!row) return undefined;
  return {
    rank: row.rank,
    played: row.played,
    won: row.wins,
    drawn: row.draws,
    lost: row.losses,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    points: row.points,
    form: row.form,
  } satisfies DatasetStandingRow;
}

/* ----------------------------------------------------------------------- */
/* Public entry point                                                      */
/* ------------------------------------------------------------------------ */

export async function buildMatchDataset(eventId: string): Promise<MatchDataset> {
  const raw = await fetchSummary(eventId);
  const details = normalizeSummary(raw, eventId);
  if (!details) {
    throw new InsufficientMatchDataError(
      "The provider has no usable summary for that match id.",
    );
  }

  const { match } = details;
  const season = match.season ?? new Date().getUTCFullYear();
  const league = match.league ?? undefined;

  // ---- Season standings (this competition, current season) ---------------
  const standings: DatasetStandingSnapshot = {
    provider: "espn",
    competitionSlug: league?.slug,
    season,
    available: false,
  };
  if (league) {
    try {
      const loaded = await getStandings(league, season);
      if (loaded.available) {
        const entries = loaded.data.flatMap((group) => group.entries);
        const homeRow = standingRow(entries, match.home.id);
        const awayRow = standingRow(entries, match.away.id);
        if (homeRow && awayRow) {
          standings.available = true;
          standings.home = homeRow;
          standings.away = awayRow;
        }
      }
    } catch {
      // Standings are optional context; a miss must not block the analysis.
    }
  }

  // ---- Team schedules -> recent results + aggregates ----------------------
  const loadFixtures = async (teamId: string): Promise<TeamFixture[]> => {
    try {
      const scheduleRaw = await fetchTeamSchedule(teamId, season);
      return normalizeTeamFixtures(scheduleRaw, teamId);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status: unknown }).status === 404
      ) {
        return [];
      }
      return [];
    }
  };

  const [homeFixtures, awayFixtures] = await Promise.all([
    loadFixtures(match.home.id),
    loadFixtures(match.away.id),
  ]);

  const homeBuilt = buildTeamProfile(match.home, homeFixtures);
  const awayBuilt = buildTeamProfile(match.away, awayFixtures);

  const headToHead = extractH2H(details.headToHead, match.home.id);
  const statistics = extractStats(details);
  const marketOdds = extractMarketOdds(raw);

  // ---- Data quality -------------------------------------------------------
  const insufficientReasons: string[] = [];
  if (homeBuilt.results.length === 0) {
    insufficientReasons.push(
      "No recent finished results were published for the home team.",
    );
  }
  if (awayBuilt.results.length === 0) {
    insufficientReasons.push(
      "No recent finished results were published for the away team.",
    );
  }
  if (details.headToHead.length === 0) {
    insufficientReasons.push("No head-to-head history is available.");
  }
  if (!standings.available) {
    insufficientReasons.push(
      "No season standings for this competition and season.",
    );
  }
  if (!statistics.available) {
    insufficientReasons.push(
      "No provider statistics were published for this match.",
    );
  }

  // Honest pre-flight gate: with neither recent fixtures nor head-to-head
  // history there is nothing to analyse, so the request fails instead of
  // inviting speculation.
  const sufficient =
    homeBuilt.results.length > 0 ||
    awayBuilt.results.length > 0 ||
    details.headToHead.length > 0;

  if (!sufficient) {
    throw new InsufficientMatchDataError(
      "No recent results and no head-to-head history are available for this fixture, so no responsible analysis is possible.",
    );
  }

  return {
    fixture: {
      id: match.id,
      name: match.name,
      kickoff: match.date,
      state: match.state,
      statusLabel: match.statusLabel,
      competition: match.competition.name,
      competitionSlug: match.competition.slug ?? league?.slug,
      round: match.round,
      season,
      venue: match.venue,
      city: match.city,
      country: match.country,
      home: {
        id: match.home.id,
        name: match.home.name,
        shortName: match.home.shortName,
        seasonRecord: match.home.record,
      },
      away: {
        id: match.away.id,
        name: match.away.name,
        shortName: match.away.shortName,
        seasonRecord: match.away.record,
      },
    },
    standings,
    homeTeam: homeBuilt.profile,
    awayTeam: awayBuilt.profile,
    headToHead,
    recentResults: { home: homeBuilt.results, away: awayBuilt.results },
    statistics,
    marketOdds,
    dataQuality: {
      recentResultsPerTeam: {
        home: homeBuilt.results.length,
        away: awayBuilt.results.length,
      },
      h2hMatches: details.headToHead.length,
      standingsAvailable: standings.available,
      seasonStatsAvailable: statistics.available,
      oddsPublished: marketOdds !== undefined,
      cardHistoryAvailable: statistics.cardStatsPublished,
      sufficient,
      insufficientReasons,
    },
  };
}
