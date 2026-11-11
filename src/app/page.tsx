import { cache, Suspense } from "react";
import { connection } from "next/server";
import {
  defaultSeasonFor,
  findLeague,
  getMatchesByDate,
  getNews,
  getRankings,
  getStandings,
} from "@/lib/api";
import { LEAGUES } from "@/data/leagues";
import type { League } from "@/data/leagues";
import { competitionRank } from "@/lib/leaguePriority";
import { localizeNews } from "@/lib/news-translate";
import { serverPreferences } from "@/lib/i18n/server";
import { seasonLabel, todayISO } from "@/lib/date";
import type {
  Match,
  NewsArticle,
  RankingBoard,
  StandingGroup,
} from "@/lib/types";
import {
  BoardSkeleton,
  ContextSkeleton,
  GlanceSkeleton,
  HomeClose,
  HomeContext,
  HomeFixtureBoard,
  HomeGlance,
  HomeLeadMatch,
  HomeLiveRail,
  HomeMasthead,
  HomeMastheadMeta,
  HomeNews,
  HomeRankingWatch,
  HomeShell,
  HomeTableWatch,
  LeadNotice,
  LeadSkeleton,
  MastheadFallback,
  NewsSkeleton,
} from "./HomeView";
import type { CompetitionGroup } from "./HomeView";

/**
 * Matchday front page. Data orchestration — fetching, spotlight scoring and
 * competition grouping — stays server-side here; every piece of display copy
 * is translated inside the sibling client file (`./HomeView`).
 */

export const metadata = {
  alternates: { canonical: "/" },
};

const STATE_ORDER: Record<Match["state"], number> = {
  live: 0,
  halftime: 0,
  scheduled: 1,
  finished: 2,
  postponed: 3,
  canceled: 3,
  unknown: 4,
};

interface TodaySnapshot {
  date: string;
  matches: Match[];
  failed: boolean;
}

/**
 * One scoreboard read per request, shared by the masthead, the lead card,
 * the day glance, the live rail and the fixture board. React's cache is
 * request-scoped, so a failed fetch is not remembered between page views.
 */
const loadToday = cache(async (): Promise<TodaySnapshot> => {
  const date = todayISO();
  try {
    return { date, matches: await getMatchesByDate(date), failed: false };
  } catch {
    return { date, matches: [], failed: true };
  }
});

function isLive(match: Match): boolean {
  return match.state === "live" || match.state === "halftime";
}

function hasScore(match: Match): boolean {
  return isLive(match) || match.state === "finished";
}

/**
 * Goals already scored on today's card. Scores arrive as strings, so this is
 * summed defensively and only counts fixtures that actually have a score.
 */
function goalsScored(matches: Match[]): number {
  let goals = 0;
  for (const match of matches) {
    if (!hasScore(match)) continue;
    const home = Number.parseInt(match.home.score ?? "", 10);
    const away = Number.parseInt(match.away.score ?? "", 10);
    if (Number.isFinite(home)) goals += home;
    if (Number.isFinite(away)) goals += away;
  }
  return goals;
}

function sortForBoard(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => {
    const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (byState !== 0) return byState;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

/* ---------------------------------------------------------
   Spotlight selection
   --------------------------------------------------------- */

/**
 * The lead fixture is never hand-picked. It is the best-scoring match on
 * today's card, ranked by competition tier, both teams' points per game,
 * match state, knockout significance, broadcast coverage and derby billing.
 */
const DERBY_WORDS = [
  "derby",
  "derbi",
  "clasico",
  "clásico",
  "classico",
  "superclasico",
  "superclásico",
];

const YOUTH_PATTERN =
  /\bU\s?1[5-9]\b|\bU\s?2[0-3]\b|\byouth\b|\bacademy\b|\breserves?\b|\bcollege\b|\bncaa\b/i;

function pointsPerGame(record?: string): number {
  if (!record) return 0;
  const parts = record.split("-").map((value) => Number.parseInt(value, 10));
  if (parts.length < 3 || parts.some((value) => !Number.isFinite(value))) return 0;
  const played = parts[0] + parts[1] + parts[2];
  if (played <= 0) return 0;
  return (parts[0] * 3 + parts[1]) / played;
}

function isYouthFixture(match: Match): boolean {
  if (match.league?.youth) return true;
  return YOUTH_PATTERN.test(
    `${match.competition.name} ${match.home.name} ${match.away.name}`,
  );
}

function spotlightScore(match: Match): number {
  const league = match.league;
  let score = 0;

  if (league) {
    score += league.featured ? 140 - league.order * 5 : 34;
    if (league.gender === "women") score -= 8;
  }

  score += pointsPerGame(match.home.record) * 6;
  score += pointsPerGame(match.away.record) * 6;
  if (match.home.form) score += 2;
  if (match.away.form) score += 2;

  if (match.state === "live") score += 34;
  else if (match.state === "halftime") score += 32;
  else if (match.state === "scheduled") score += 26;
  else if (match.state === "finished") score += 8;

  const billing = `${match.competition.name} ${match.round ?? ""}`.toLowerCase();
  if (DERBY_WORDS.some((word) => billing.includes(word))) score += 12;
  if (/final|semi|quarter|round of 16|round of 8|knockout|playoff/.test(billing)) {
    score += 10;
  }
  if (match.broadcasts.length > 0) score += 3;
  if (match.venue) score += 1;

  return score;
}

function pickSpotlight(matches: Match[]): Match | null {
  const eligible = matches.filter(
    (match) =>
      match.state !== "postponed" &&
      match.state !== "canceled" &&
      !isYouthFixture(match),
  );
  const hasUpcoming = eligible.some(
    (match) =>
      match.state === "live" ||
      match.state === "halftime" ||
      match.state === "scheduled",
  );
  const pool = hasUpcoming
    ? eligible.filter(
        (match) =>
          match.state === "live" ||
          match.state === "halftime" ||
          match.state === "scheduled",
      )
    : eligible;

  return (
    [...pool].sort(
      (a, b) =>
        spotlightScore(b) - spotlightScore(a) ||
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    )[0] ?? null
  );
}

/* ---------------------------------------------------------
   Competition groups
   --------------------------------------------------------- */

/**
 * Big-five leagues first, then the Saudi and Moroccan top flights, then the
 * rest of the featured catalogue, then the busiest of everything else.
 * (The record shape is `CompetitionGroup` in `./HomeView`.)
 */
function compareGroups(a: CompetitionGroup, b: CompetitionGroup): number {
  const rankA = competitionRank(a.slug, a.name);
  const rankB = competitionRank(b.slug, b.name);
  if (rankA !== rankB) return rankA - rankB;

  const featuredA = a.league?.featured ? 0 : 1;
  const featuredB = b.league?.featured ? 0 : 1;
  if (featuredA !== featuredB) return featuredA - featuredB;

  const orderA = a.league?.order ?? 999;
  const orderB = b.league?.order ?? 999;
  if (orderA !== orderB) return orderA - orderB;

  return b.matches.length - a.matches.length || a.name.localeCompare(b.name);
}

function groupByCompetition(matches: Match[]): CompetitionGroup[] {
  const map = new Map<string, CompetitionGroup>();

  for (const match of matches) {
    const key =
      match.league?.slug ?? match.competition.slug ?? match.competition.name;
    const group = map.get(key);
    if (group) {
      group.matches.push(match);
      continue;
    }
    map.set(key, {
      key,
      name: match.league?.name ?? match.competition.name,
      slug: match.league?.slug ?? match.competition.slug,
      logo: match.league?.logo ?? match.competition.logo,
      league: match.league,
      matches: [match],
    });
  }

  return [...map.values()]
    .sort(compareGroups)
    .map((group) => ({ ...group, matches: sortForBoard(group.matches) }));
}

/* ---------------------------------------------------------
   Masthead
   --------------------------------------------------------- */

async function MastheadMeta() {
  await connection();
  const { date, failed } = await loadToday();
  return <HomeMastheadMeta date={date} failed={failed} />;
}

function Masthead() {
  return (
    <HomeMasthead
      meta={
        <Suspense fallback={<MastheadFallback />}>
          <MastheadMeta />
        </Suspense>
      }
    />
  );
}

/* ---------------------------------------------------------
   Lead match
   --------------------------------------------------------- */

async function LeadMatch() {
  await connection();
  const { date, matches, failed } = await loadToday();
  const match = pickSpotlight(matches);

  if (failed) return <LeadNotice variant="failed" />;
  if (!match) return <LeadNotice variant="empty" />;

  return <HomeLeadMatch match={match} date={date} />;
}

/* ---------------------------------------------------------
   The day in brief
   --------------------------------------------------------- */

async function DayGlance() {
  await connection();
  const { date, matches, failed } = await loadToday();

  const competitions = new Set(
    matches.map((match) => match.league?.slug ?? match.competition.name),
  ).size;
  const goals = goalsScored(matches);
  const kicks = matches.map((match) => match.date);

  return (
    <HomeGlance
      date={date}
      failed={failed}
      counts={{ fixtures: matches.length, goals, competitions }}
      kicks={kicks}
    />
  );
}

/* ---------------------------------------------------------
   Live rail — the single home for matches in play
   --------------------------------------------------------- */

async function LiveRail() {
  await connection();
  const { matches, failed } = await loadToday();
  if (failed) return null;

  const spotlight = pickSpotlight(matches);
  const live = sortForBoard(
    matches.filter((match) => isLive(match) && match.id !== spotlight?.id),
  );
  if (live.length === 0) return null;

  return <HomeLiveRail matches={live} />;
}

/* ---------------------------------------------------------
   Fixture board
   --------------------------------------------------------- */

// How many competition groups the board shows. Rows per group are capped in
// the client board (`BOARD_ROWS` in `./HomeView`).
const BOARD_GROUPS = 12;

async function FixtureBoard() {
  await connection();
  const { matches, failed } = await loadToday();

  // The lead fixture sits above and live matches sit in the live rail, so the
  // board only carries what has not been shown yet: still to come, and played.
  const spotlight = pickSpotlight(matches);
  const rest = matches.filter(
    (match) => match.id !== spotlight?.id && !isLive(match),
  );
  const groups = groupByCompetition(rest);
  const shown = groups.slice(0, BOARD_GROUPS);
  const remainingGroups = groups.length - shown.length;
  const toCome = rest.filter((match) => match.state === "scheduled").length;
  const played = rest.filter((match) => match.state === "finished").length;

  return (
    <HomeFixtureBoard
      failed={failed}
      matchesCount={matches.length}
      groups={shown}
      remainingGroups={remainingGroups}
      toCome={toCome}
      played={played}
    />
  );
}

/* ---------------------------------------------------------
   Context cards
   --------------------------------------------------------- */

async function TableWatch() {
  await connection();
  const { matches } = await loadToday();

  const tally = new Map<string, { league: League; count: number }>();
  for (const match of matches) {
    const league = match.league?.slug ? findLeague(match.league.slug) : undefined;
    if (!league) continue;
    const current = tally.get(league.slug);
    tally.set(league.slug, {
      league,
      count: (current?.count ?? 0) + 1,
    });
  }

  const busiest = [...tally.values()].sort(
    (a, b) => b.count - a.count || a.league.order - b.league.order,
  )[0];

  if (!busiest) {
    return (
      <HomeTableWatch
        league={null}
        season=""
        count={0}
        entries={[]}
        failed={false}
      />
    );
  }

  const league = busiest.league;
  const season = defaultSeasonFor(league);

  let groups: StandingGroup[] = [];
  let failed = false;
  try {
    groups = (await getStandings(league, season)).data;
  } catch {
    failed = true;
  }

  const group = groups.find((item) => item.entries.length > 0) ?? groups[0];
  const entries = group?.entries.slice(0, 5) ?? [];

  return (
    <HomeTableWatch
      league={league}
      season={seasonLabel(season, league)}
      groupName={group?.name}
      count={busiest.count}
      entries={entries}
      failed={failed}
    />
  );
}

async function RankingWatch() {
  await connection();

  let board: RankingBoard | null = null;
  let failed = false;
  try {
    board = await getRankings("men");
  } catch {
    failed = true;
  }

  return <HomeRankingWatch board={board} failed={failed} />;
}

function ContextSection() {
  return (
    <HomeContext
      table={
        <Suspense fallback={<ContextSkeleton />}>
          <TableWatch />
        </Suspense>
      }
      ranking={
        <Suspense fallback={<ContextSkeleton dark />}>
          <RankingWatch />
        </Suspense>
      }
    />
  );
}

/* ---------------------------------------------------------
   News front
   --------------------------------------------------------- */

async function NewsFront() {
  await connection();

  let articles: NewsArticle[] = [];
  let failed = false;
  try {
    const [{ lang }, fetched] = await Promise.all([serverPreferences(), getNews(6)]);
    articles = await localizeNews(fetched.slice(0, 5), lang);
  } catch {
    failed = true;
  }

  const [lead, ...rest] = articles;

  return <HomeNews failed={failed} lead={lead ?? null} rest={rest} />;
}

/* ---------------------------------------------------------
   Page
   --------------------------------------------------------- */

export default function HomePage() {
  return (
    <HomeShell
      masthead={<Masthead />}
      lead={
        <>
          <Suspense fallback={<LeadSkeleton />}>
            <LeadMatch />
          </Suspense>
          <Suspense fallback={<GlanceSkeleton />}>
            <DayGlance />
          </Suspense>
        </>
      }
    >
      <Suspense fallback={null}>
        <LiveRail />
      </Suspense>

      <Suspense fallback={<BoardSkeleton />}>
        <FixtureBoard />
      </Suspense>

      <ContextSection />

      <Suspense fallback={<NewsSkeleton />}>
        <NewsFront />
      </Suspense>

      <HomeClose leaguesCount={LEAGUES.length} />
    </HomeShell>
  );
}
