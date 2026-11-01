/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Normalisers turn the flexible ESPN payloads into the stable domain types
 * the UI renders. Missing branches are always represented as empty values so
 * pages can show an honest empty state rather than inventing data.
 */
import { findLeagueByName, getLeague } from "@/data/leagues";
import type { League } from "@/data/leagues";
import type {
  HeadToHeadMatch,
  LineupPlayer,
  Match,
  MatchDetails,
  MatchEvent,
  MatchLineup,
  MatchState,
  MatchStat,
  NewsArticle,
  Scorer,
  ScorerBoard,
  SearchTeamResult,
  StandingEntry,
  StandingGroup,
  TeamForm,
  TeamFormResult,
  TeamFixture,
  TeamProfile,
  TeamRef,
} from "./types";

function text(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

function firstLogo(source: any): string | undefined {
  if (!source) return undefined;
  if (typeof source.logo === "string") return source.logo;
  if (Array.isArray(source.logos) && source.logos[0]?.href) {
    return source.logos[0].href as string;
  }
  return undefined;
}

function color(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  return raw.startsWith("#") ? raw : `#${raw}`;
}

export function teamRef(source: any): TeamRef {
  const team = source?.team ?? source ?? {};
  return {
    id: String(team.id ?? source?.id ?? ""),
    name: text(team.displayName) ?? text(team.name) ?? "Unknown team",
    shortName:
      text(team.shortDisplayName) ??
      text(team.name) ??
      text(team.displayName) ??
      "Unknown",
    abbreviation: text(team.abbreviation) ?? "",
    logo: firstLogo(team),
    color: color(team.color),
  };
}

function scoreOf(competitor: any): string | undefined {
  if (!competitor) return undefined;
  const raw = competitor.score;
  if (typeof raw === "string" || typeof raw === "number") return String(raw);
  if (raw && typeof raw === "object") {
    if (raw.displayValue !== undefined) return String(raw.displayValue);
    if (raw.value !== undefined) return String(raw.value);
    if (raw.score !== undefined) return String(raw.score);
  }
  return undefined;
}

export function matchState(type: any): MatchState {
  const name = String(type?.name ?? "").toUpperCase();
  const state = String(type?.state ?? "").toLowerCase();
  if (/POSTPONED/.test(name)) return "postponed";
  if (/CANCELED|CANCELLED/.test(name)) return "canceled";
  if (/HALFTIME|HALF_TIME/.test(name)) return "halftime";
  if (state === "in") return "live";
  if (state === "post" || type?.completed === true) return "finished";
  if (state === "pre") return "scheduled";
  return "unknown";
}

export function statusLabel(match: Pick<Match, "statusLabel">): string {
  return match.statusLabel;
}

function stageFromAltGameNote(altGameNote?: string): string | undefined {
  if (!altGameNote) return undefined;
  const parts = altGameNote.split(",");
  if (parts.length < 2) return undefined;
  return parts.slice(1).join(",").trim() || undefined;
}

export function leagueForNote(note?: string): League | undefined {
  if (!note) return undefined;
  const base = note.split(",")[0]?.trim();
  return findLeagueByName(base) ?? findLeagueByName(note);
}

export function normalizeMatch(
  event: any,
  overrideLeague?: League,
): Match | null {
  const competition = event?.competitions?.[0];
  if (!competition) return null;

  const competitors: any[] = competition.competitors ?? [];
  const home = competitors.find((item) => item.homeAway === "home");
  const away = competitors.find((item) => item.homeAway === "away");
  if (!home || !away) return null;

  const status = competition.status ?? event.status ?? {};
  const type = status.type ?? event.status?.type ?? {};
  const state = matchState(type);
  const altGameNote = text(competition.altGameNote);
  const league =
    overrideLeague ??
    leagueForNote(altGameNote) ??
    leagueForNote(text(competition.notes?.[0]?.headline)) ??
    leagueForNote(text(event.season?.slug));

  const broadcasts: string[] = [];
  for (const broadcast of competition.broadcasts ?? []) {
    const name =
      text(broadcast?.media?.shortName) ??
      text(broadcast?.media?.name) ??
      (Array.isArray(broadcast?.names) ? text(broadcast.names[0]) : undefined);
    if (name && !broadcasts.includes(name)) broadcasts.push(name);
  }
  if (typeof competition.broadcast === "string") {
    const name = text(competition.broadcast);
    if (name && !broadcasts.includes(name)) broadcasts.push(name);
  }

  const note = competition.notes?.[0];
  const homeTeam = teamRef(home);
  const awayTeam = teamRef(away);
  const hideScore = state === "scheduled" || state === "postponed" || state === "canceled";

  return {
    id: String(event.id ?? competition.id ?? ""),
    date: String(event.date ?? competition.date ?? ""),
    name: text(event.name) ?? `${awayTeam.name} at ${homeTeam.name}`,
    state,
    statusLabel:
      text(type.shortDetail) ??
      text(type.detail) ??
      text(type.description) ??
      "Scheduled",
    statusDetail:
      text(type.detail) ??
      text(type.description) ??
      text(type.shortDetail) ??
      "",
    clock: text(status.displayClock),
    competition: {
      name: league?.name ?? altGameNote ?? "Football",
      slug: league?.slug,
      logo: league?.logo ?? undefined,
    },
    league,
    home: {
      ...homeTeam,
      homeAway: "home",
      score: hideScore ? undefined : scoreOf(home),
      winner: Boolean(home.winner),
      form: text(home.form),
      record: text(home.records?.[0]?.summary),
    },
    away: {
      ...awayTeam,
      homeAway: "away",
      score: hideScore ? undefined : scoreOf(away),
      winner: Boolean(away.winner),
      form: text(away.form),
      record: text(away.records?.[0]?.summary),
    },
    venue:
      text(event.venue?.displayName) ??
      text(competition.venue?.fullName) ??
      undefined,
    city: text(competition.venue?.address?.city),
    country: text(competition.venue?.address?.country),
    attendance: Number(competition.attendance) || undefined,
    broadcasts,
    round:
      text(note?.headline) ??
      text(note?.text) ??
      stageFromAltGameNote(altGameNote),
    season: Number.isFinite(Number(event.season?.year))
      ? Number(event.season.year)
      : undefined,
    note: text(note?.text),
  };
}

export function normalizeMatches(raw: any, overrideLeague?: League): Match[] {
  const events: any[] = Array.isArray(raw?.events) ? raw.events : [];
  return events
    .map((event) => normalizeMatch(event, overrideLeague))
    .filter((match): match is Match => Boolean(match))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function statNumber(stats: Map<string, any>, name: string): number {
  const value = stats.get(name)?.value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStandingEntry(entry: any): StandingEntry | null {
  if (!entry?.team) return null;
  const stats = new Map<string, any>(
    (entry.stats ?? []).map((stat: any) => [String(stat.name), stat]),
  );
  const note =
    typeof entry.note === "string"
      ? { description: entry.note, color: undefined }
      : entry.note;

  return {
    team: teamRef(entry.team),
    rank:
      Number(entry.note?.rank) ||
      Number(stats.get("rank")?.value) ||
      statNumber(stats, "rank"),
    played: statNumber(stats, "gamesPlayed"),
    wins: statNumber(stats, "wins"),
    draws: statNumber(stats, "ties"),
    losses: statNumber(stats, "losses"),
    goalsFor: statNumber(stats, "pointsFor"),
    goalsAgainst: statNumber(stats, "pointsAgainst"),
    goalDifference: statNumber(stats, "pointDifferential"),
    points: statNumber(stats, "points"),
    form: text(entry.form),
    note: text(note?.description),
    noteColor: text(note?.color),
  };
}

export function normalizeStandings(raw: any): StandingGroup[] {
  const groups: StandingGroup[] = [];

  const addEntries = (node: any, name: string) => {
    const entries: any[] = node?.standings?.entries ?? node?.entries ?? [];
    if (!entries.length) return;
    const normalised = entries
      .map(normalizeStandingEntry)
      .filter((entry): entry is StandingEntry => Boolean(entry));
    if (!normalised.length) return;
    normalised.sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      return b.points - a.points;
    });
    groups.push({
      id: node?.id ? String(node.id) : undefined,
      name,
      abbreviation: text(node?.abbreviation),
      entries: normalised,
    });
  };

  const walk = (node: any, path: string[]) => {
    const name = text(node?.name) ?? path.at(-1) ?? "Table";
    addEntries(node, name);
    const children: any[] = Array.isArray(node?.children) ? node.children : [];
    for (const child of children) walk(child, [...path, name]);
  };

  if (raw?.standings?.entries) {
    addEntries(raw, text(raw?.name) ?? "Table");
  } else if (Array.isArray(raw?.children)) {
    for (const child of raw.children) walk(child, []);
  } else {
    addEntries(raw, text(raw?.name) ?? "Table");
  }

  if (groups.length === 1) {
    return [{ ...groups[0], name: "Table" }];
  }
  return groups;
}

function parseDisplayStat(display: string | undefined, label: string): number | undefined {
  if (!display) return undefined;
  const match = display.match(new RegExp(`${label}:\\s*(\\d+)`, "i"));
  return match ? Number(match[1]) : undefined;
}

function leaderBoard(category: any, limit: number): Scorer[] {
  const leaders: any[] = Array.isArray(category?.leaders) ? category.leaders : [];
  return leaders.slice(0, limit).map((leader, index) => {
    const athlete = leader?.athlete ?? {};
    const team = teamRef(athlete.team ?? leader.team);
    const display = text(leader?.displayValue);
    return {
      rank: index + 1,
      playerId: String(athlete.id ?? index),
      playerName: text(athlete.displayName) ?? "Unknown player",
      shortName:
        text(athlete.shortName) ??
        text(athlete.displayName) ??
        "Unknown player",
      team,
      goals:
        Number(leader?.value) ||
        parseDisplayStat(display, "Goals") ||
        0,
      assists: parseDisplayStat(display, "Assists") ?? 0,
      appearances: parseDisplayStat(display, "Matches"),
      jersey: text(athlete.jersey),
    };
  });
}

export function normalizeScorers(raw: any, limit = 25): ScorerBoard {
  const categories = raw?.stats ?? {};
  const values = Object.values(categories) as any[];
  const goalsCategory =
    categories?.["0"] ??
    values.find((item) => /goals/i.test(String(item?.name ?? "")));
  const assistsCategory =
    categories?.["1"] ??
    values.find((item) => /assists/i.test(String(item?.name ?? "")));

  return {
    goals: leaderBoard(goalsCategory, limit),
    assists: leaderBoard(assistsCategory, limit),
  };
}

function eventType(raw: any): MatchEvent["type"] {
  const value = String(raw?.type?.type ?? raw?.type?.text ?? "").toLowerCase();
  const body = String(raw?.text ?? raw?.shortText ?? "").toLowerCase();
  if (value.includes("own") || /own goal/.test(body)) return "own-goal";
  if (value.includes("penalty") || /penalty/.test(body)) return "penalty";
  if (value.includes("goal")) return "goal";
  if (value.includes("yellow")) return "yellow";
  if (value.includes("red")) return "red";
  if (value.includes("substitution")) return "substitution";
  return "other";
}

function normalizeMatchEvent(raw: any): MatchEvent | null {
  const type = eventType(raw);
  const label = text(raw?.clock?.displayValue);
  const description = text(raw?.text) ?? text(raw?.shortText);
  if (!description && type === "other") return null;
  const team = raw?.team ? teamRef(raw.team) : undefined;
  return {
    id: String(raw?.id ?? `${raw?.clock?.value ?? "event"}-${type}`),
    minute: label ?? "",
    type,
    text: description ?? text(raw?.type?.text) ?? "Match event",
    player: text(raw?.participants?.[0]?.athlete?.displayName),
    team,
  };
}

function normalizeStats(raw: any, match: Match): MatchStat[] {
  const teams: any[] = raw?.boxscore?.teams ?? [];
  if (!teams.length) return [];

  const homeTeam =
    teams.find((team) => team.homeAway === "home") ??
    teams.find((team) => String(team.team?.id) === match.home.id) ??
    teams[0];
  const awayTeam =
    teams.find((team) => team.homeAway === "away") ??
    teams.find((team) => String(team.team?.id) === match.away.id) ??
    teams[1];
  if (!homeTeam || !awayTeam) return [];

  const homeStats: any[] = homeTeam.statistics ?? [];
  const awayByName = new Map<string, any>(
    (awayTeam.statistics ?? []).map((stat: any) => [String(stat.name), stat]),
  );

  const stats: MatchStat[] = [];
  for (const homeStat of homeStats) {
    const name = String(homeStat.name ?? "");
    const awayStat = awayByName.get(name);
    if (!awayStat) continue;
    const homeValue = Number(homeStat.value);
    const awayValue = Number(awayStat.value);
    const label =
      text(homeStat.label) ??
      text(homeStat.displayName) ??
      text(homeStat.shortDisplayName) ??
      name;
    stats.push({
      name,
      label,
      home: String(homeStat.displayValue ?? homeStat.value ?? "0"),
      away: String(awayStat.displayValue ?? awayStat.value ?? "0"),
      homeValue: Number.isFinite(homeValue) ? homeValue : 0,
      awayValue: Number.isFinite(awayValue) ? awayValue : 0,
      percent: /pct|%|possession/i.test(`${name} ${label}`),
    });
  }
  return stats;
}

function normalizeLineups(raw: any): MatchLineup[] {
  const rosters: any[] = Array.isArray(raw?.rosters) ? raw.rosters : [];
  return rosters
    .map((roster) => {
      const players: LineupPlayer[] = (roster?.roster ?? [])
        .map((player: any) => {
          const athlete = player?.athlete ?? {};
          return {
            id: String(athlete.id ?? ""),
            name: text(athlete.displayName) ?? "Unknown player",
            shortName:
              text(athlete.shortName) ??
              text(athlete.displayName) ??
              "Unknown",
            jersey: text(player?.jersey),
            position:
              text(player?.position?.displayName) ??
              text(player?.position?.abbreviation),
            starter: Boolean(player?.starter),
            subbedIn: Boolean(player?.subbedIn),
            subbedOut: Boolean(player?.subbedOut),
            formationPlace: text(player?.formationPlace),
          };
        })
        .filter((player: LineupPlayer) => player.id || player.name !== "Unknown player");

      return {
        team: teamRef(roster?.team),
        homeAway: roster?.homeAway === "away" ? "away" : "home",
        formation: text(roster?.formation),
        players,
      } satisfies MatchLineup;
    })
    .filter((lineup) => lineup.players.length > 0);
}

function normalizeHeadToHead(raw: any): HeadToHeadMatch[] {
  const series: any[] = Array.isArray(raw?.seasonseries) ? raw.seasonseries : [];
  const head = series.find(
    (item) =>
      String(item?.type ?? "").toLowerCase() === "head-to-head" ||
      /head[- ]to[- ]head/i.test(String(item?.seriesLabel ?? item?.title ?? "")),
  );
  const events: any[] = Array.isArray(head?.events) ? head.events : [];

  return events
    .map((event): HeadToHeadMatch | null => {
      const competitors: any[] = event?.competitors ?? [];
      const home = competitors.find((item) => item.homeAway === "home") ?? competitors[0];
      const away = competitors.find((item) => item.homeAway === "away") ?? competitors[1];
      if (!home || !away) return null;
      return {
        id: String(event.id ?? ""),
        date: String(event.date ?? ""),
        home: teamRef(home),
        away: teamRef(away),
        homeScore: scoreOf(home),
        awayScore: scoreOf(away),
        status:
          text(event?.statusType?.shortDetail) ??
          text(event?.statusType?.description) ??
          "—",
      } satisfies HeadToHeadMatch;
    })
    .filter((item): item is HeadToHeadMatch => Boolean(item))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function normalizeForm(raw: any): TeamForm[] {
  const groups: any[] = Array.isArray(raw?.lastFiveGames) ? raw.lastFiveGames : [];
  return groups
    .map((group) => {
      const events: any[] = Array.isArray(group?.events) ? group.events : [];
      const results: TeamFormResult[] = events
        .slice(0, 5)
        .map((event: any): TeamFormResult => ({
          id: String(event.id ?? ""),
          date: String(event.gameDate ?? ""),
          opponent: teamRef(event.opponent),
          result: text(event.gameResult) ?? "—",
          score: text(event.score) ?? "—",
          homeAway: text(event.atVs) ?? "",
          competition: text(event.leagueName) ?? text(event.competitionName),
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
      return { team: teamRef(group?.team), results };
    })
    .filter((group) => group.results.length > 0);
}

export function normalizeNews(raw: any, limit = 12): NewsArticle[] {
  const articles: any[] = Array.isArray(raw?.articles) ? raw.articles : [];
  return articles.slice(0, limit).map((article) => {
    const images: any[] = Array.isArray(article?.images) ? article.images : [];
    const image = images[0];
    return {
      id: String(article.id ?? article.nowId ?? article.headline),
      headline: text(article.headline) ?? "Football story",
      description: text(article.description) ?? "",
      published: String(article.published ?? article.lastModified ?? ""),
      image: text(image?.url),
      imageAlt: text(image?.name) ?? text(article.headline),
      url: text(article?.links?.web?.href),
      byline: text(article.byline),
      section: text(article?.categories?.[0]?.description),
    } satisfies NewsArticle;
  });
}

export function normalizeSummary(
  raw: any,
  eventId: string,
  fallback?: Match,
): MatchDetails | null {
  const header = raw?.header ?? {};
  const competition = header?.competitions?.[0];
  const leagueSlug = text(header?.league?.slug);
  const league = leagueSlug ? getLeague(leagueSlug) : fallback?.league;

  const syntheticEvent = competition
    ? {
        id: eventId,
        date: competition.date ?? fallback?.date,
        name: fallback?.name,
        season: header?.season ?? { year: fallback?.season },
        venue: { displayName: fallback?.venue },
        competitions: [competition],
      }
    : null;

  const match =
    (syntheticEvent ? normalizeMatch(syntheticEvent, league) : null) ?? fallback;
  if (!match) return null;

  const venue = raw?.gameInfo?.venue;
  if (venue?.fullName) match.venue = text(venue.fullName) ?? match.venue;
  if (venue?.address?.city) match.city = text(venue.address.city);
  if (venue?.address?.country) match.country = text(venue.address.country);
  if (Number(raw?.gameInfo?.attendance) > 0) {
    match.attendance = Number(raw.gameInfo.attendance);
  }

  const rawEvents: any[] = Array.isArray(raw?.keyEvents)
    ? raw.keyEvents
    : Array.isArray(competition?.details)
      ? competition.details
      : [];

  const events = rawEvents
    .map(normalizeMatchEvent)
    .filter((event): event is MatchEvent => Boolean(event));

  const stats = normalizeStats(raw, match);
  const lineups = normalizeLineups(raw);
  const headToHead = normalizeHeadToHead(raw);
  const article = raw?.article;

  return {
    match,
    events,
    stats,
    lineups,
    headToHead,
    form: normalizeForm(raw),
    article: article
      ? {
          headline: text(article.headline) ?? "Match report",
          description: text(article.description),
          url:
            text(article?.links?.web?.href) ??
            text(article?.links?.mobile?.href),
        }
      : undefined,
    lineupsAvailable: lineups.length > 0,
    statsAvailable: stats.length > 0,
    news: normalizeNews(raw?.news, 6),
    broadcasts: match.broadcasts,
  };
}

export function normalizeTeamProfile(raw: any): TeamProfile | null {
  const team = raw?.team;
  if (!team?.id) return null;
  const leagueSlug = text(team?.defaultLeague?.slug);
  return {
    id: String(team.id),
    name: text(team.displayName) ?? text(team.name) ?? "Unknown team",
    shortName:
      text(team.shortDisplayName) ?? text(team.name) ?? "Unknown team",
    abbreviation: text(team.abbreviation) ?? "",
    logo: firstLogo(team),
    color: color(team.color),
    standingSummary: text(team.standingSummary),
    recordSummary: text(team.recordSummary),
    seasonSummary: text(team.seasonSummary),
    leagueSlug,
    leagueName:
      text(team?.defaultLeague?.name) ?? text(team?.defaultLeague?.abbreviation),
    leagueEspnId: team?.defaultLeague?.id
      ? String(team.defaultLeague.id)
      : undefined,
  };
}

export function normalizeTeamFixtures(
  raw: any,
  teamId: string,
): TeamFixture[] {
  const matches = normalizeMatches(raw);
  const fixtures: TeamFixture[] = [];

  for (const match of matches) {
    if (match.home.id !== teamId && match.away.id !== teamId) continue;
    fixtures.push({
      id: match.id,
      date: match.date,
      name: match.name,
      home: match.home,
      away: match.away,
      homeScore: match.home.score,
      awayScore: match.away.score,
      state: match.state,
      statusLabel: match.statusLabel,
      venue: match.venue,
      leagueName: match.league?.name ?? match.competition.name,
      leagueSlug: match.league?.slug,
    });
  }

  return fixtures.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

export function normalizeSearchTeams(raw: any): SearchTeamResult[] {
  const items: any[] = Array.isArray(raw?.items) ? raw.items : [];
  const seen = new Set<string>();
  const teams: SearchTeamResult[] = [];

  for (const item of items) {
    if (String(item?.type) !== "team" || String(item?.sport) !== "soccer") continue;
    const id = String(item.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const slug = text(item.defaultLeagueSlug) ?? text(item.league);
    const league = slug ? getLeague(slug) : undefined;
    teams.push({
      id,
      name: text(item.displayName) ?? text(item.name) ?? "Unknown team",
      abbreviation: text(item.abbreviation) ?? "",
      logo: firstLogo(item),
      color: color(item.color),
      leagueSlug: slug,
      leagueName: league?.name ?? text(item.league),
    });
    if (teams.length >= 12) break;
  }

  return teams;
}

export { firstLogo, text };
