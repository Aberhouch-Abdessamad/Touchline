import { cache, Suspense } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Globe2,
  MapPin,
  Minus,
  Newspaper,
  Trophy,
  Tv,
} from "lucide-react";
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
import { seasonLabel, todayISO } from "@/lib/date";
import { cn, formatNumber } from "@/lib/utils";
import type {
  Match,
  NewsArticle,
  RankingBoard,
  RankingEntry,
  StandingGroup,
} from "@/lib/types";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { KickOffPulse } from "@/components/home/KickOffPulse";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import {
  EmptyState,
  SectionHeader,
  Skeleton,
  StatusPill,
} from "@/components/ui/Primitives";

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

function competitionLabel(match: Match): string {
  return match.league?.abbreviation ?? match.competition.name;
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

function FormStrip({ form, name }: { form?: string; name: string }) {
  const results = (form ?? "")
    .replace(/[^WDL]/gi, "")
    .toUpperCase()
    .slice(-5)
    .split("");
  if (results.length === 0) return null;

  return (
    <span
      className="hm-form"
      aria-label={`${name} recent form: ${results.join(", ")}`}
    >
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={cn("hm-form__chip", `is-${result.toLowerCase()}`)}
          aria-hidden="true"
        >
          {result}
        </span>
      ))}
    </span>
  );
}

/* ---------------------------------------------------------
   Competition groups
   --------------------------------------------------------- */

interface CompetitionGroup {
  key: string;
  name: string;
  slug?: string;
  logo?: string;
  league?: League;
  matches: Match[];
}

/**
 * Big-five leagues first, then the Saudi and Moroccan top flights, then the
 * rest of the featured catalogue, then the busiest of everything else.
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

  return (
    <p className="hm-mast__meta">
      <LocalTime date={`${date}T12:00:00Z`} mode="full" fallback={date} />
      {failed ? (
        <>
          <span className="hm-mast__sep" aria-hidden="true" />
          <span>Scoreboard catching up</span>
        </>
      ) : null}
    </p>
  );
}

function Masthead() {
  return (
    <header className="hm-mast">
      <div className="hm-mast__bar">
        <p className="hm-mast__flag">
          <span className="hm-mast__flag-dot" aria-hidden="true" />
          Matchday front page
        </p>
        <Suspense
          fallback={<span className="hm-mast__meta">Reading today&apos;s card</span>}
        >
          <MastheadMeta />
        </Suspense>
      </div>

      <div className="hm-mast__body">
        <h1 className="hm-mast__title">
          Today&apos;s football,
          <span className="hm-mast__title-accent">
            {" "}
            ordered by what matters.
          </span>
        </h1>
        <p className="hm-mast__lede">
          Live scores, league tables and the day&apos;s stories in one editorial
          read. The big five European leagues lead, with the Saudi Pro League
          and every other competition right behind them.
        </p>
      </div>

      <nav className="hm-mast__jump" aria-label="Matchday shortcuts">
        <span className="hm-mast__jump-label">Jump to</span>
        <Link href="/matches">
          <CircleDot size={13} aria-hidden="true" />
          Match centre
        </Link>
        <Link href="/competitions">
          <Trophy size={13} aria-hidden="true" />
          Competitions
        </Link>
        <Link href="/rankings">FIFA rankings</Link>
        <Link href="/calendar">
          <CalendarDays size={13} aria-hidden="true" />
          Calendar
        </Link>
        <Link href="/news">
          <Newspaper size={13} aria-hidden="true" />
          News
        </Link>
      </nav>
    </header>
  );
}

/* ---------------------------------------------------------
   Lead match
   --------------------------------------------------------- */

function LeadSkeleton() {
  return (
    <article className="hm-lead hm-lead--skeleton" aria-hidden="true">
      <div className="hm-lead__head">
        <Skeleton width={116} height={10} />
        <Skeleton width={86} height={10} />
      </div>
      <Skeleton width="50%" height={22} />
      <div className="hm-lead__board">
        <div className="hm-lead__side">
          <Skeleton width={72} height={72} />
          <Skeleton width={128} height={18} />
          <Skeleton width={92} height={9} />
        </div>
        <div className="hm-lead__center">
          <Skeleton width={118} height={62} />
          <Skeleton width={74} height={12} />
        </div>
        <div className="hm-lead__side">
          <Skeleton width={72} height={72} />
          <Skeleton width={128} height={18} />
          <Skeleton width={92} height={9} />
        </div>
      </div>
      <div className="hm-lead__foot">
        <Skeleton width={190} height={10} />
        <Skeleton width={150} height={36} />
      </div>
    </article>
  );
}

function LeadNotice({
  title,
  copy,
  children,
}: {
  title: string;
  copy: string;
  children: ReactNode;
}) {
  return (
    <article className="hm-lead hm-lead--notice">
      <p className="hm-lead__tag">
        <span className="hm-lead__tag-dot" aria-hidden="true" />
        Match of the day
      </p>
      <h2 className="hm-lead__notice-title">{title}</h2>
      <p className="hm-lead__notice-copy">{copy}</p>
      <div className="hm-lead__notice-actions">{children}</div>
    </article>
  );
}

function LeadSide({
  team,
  align,
}: {
  team: Match["home"];
  align: "home" | "away";
}) {
  return (
    <div className={cn("hm-lead__side", align === "away" && "is-away")}>
      <Link
        href={`/team/${team.id}`}
        className="hm-lead__crest"
        aria-label={`Open ${team.name}`}
      >
        <TeamLogo src={team.logo} name={team.name} size={64} decorative={false} />
      </Link>
      <Link href={`/team/${team.id}`} className="hm-lead__name">
        {team.name}
      </Link>
      <span className="hm-lead__record">
        {team.record ? `Record ${team.record}` : align === "home" ? "Home side" : "Away side"}
      </span>
      <FormStrip form={team.form} name={team.name} />
    </div>
  );
}

async function LeadMatch() {
  await connection();
  const { date, matches, failed } = await loadToday();
  const match = pickSpotlight(matches);

  if (failed) {
    return (
      <LeadNotice
        title="Today's scoreboard has not arrived."
        copy="ESPN did not answer the daily scoreboard request. Tables, rankings and the news wire keep working while scores recover."
      >
        <Link className="btn btn--accent" href="/matches">
          Try the match centre <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link className="btn btn--ghost" href="/calendar">
          <CalendarDays size={15} aria-hidden="true" />
          Browse the calendar
        </Link>
      </LeadNotice>
    );
  }

  if (!match) {
    return (
      <LeadNotice
        title="No fixtures on today's card."
        copy="There is no football on the tracked scoreboard today. The calendar has the rest of the month, competition by competition."
      >
        <Link className="btn btn--accent" href="/calendar">
          Open the calendar <ArrowRight size={15} aria-hidden="true" />
        </Link>
        <Link className="btn btn--ghost" href="/competitions">
          <Trophy size={15} aria-hidden="true" />
          Browse competitions
        </Link>
      </LeadNotice>
    );
  }

  const live = isLive(match);
  const scored = hasScore(match);
  const competition = match.league?.name ?? match.competition.name;
  const venueLine = [match.venue, match.city].filter(Boolean).join(", ");

  return (
    <article className="hm-lead" aria-labelledby="hm-lead-title">
      <header className="hm-lead__head">
        <span className="hm-lead__tag">
          <span className="hm-lead__tag-dot" aria-hidden="true" />
          Match of the day
        </span>
        <span className={cn("hm-lead__state", live && "is-live")}>
          {live ? (
            <>
              <span className="live-dot" aria-hidden="true" />
              {match.state === "halftime" ? "Half-time" : match.clock || "Live"}
            </>
          ) : match.state === "finished" ? (
            "Full time"
          ) : (
            "Kick-off today"
          )}
        </span>
      </header>

      <div className="hm-lead__intro">
        <span className="hm-lead__mark">
          <LeagueLogo
            src={match.league?.logo}
            name={match.competition.name}
            size={20}
          />
        </span>
        <h2 className="hm-lead__title" id="hm-lead-title">
          {competition}
          {match.round ? (
            <span className="hm-lead__round"> · {match.round}</span>
          ) : null}
        </h2>
      </div>

      <div className="hm-lead__board">
        <LeadSide team={match.home} align="home" />

        <div className="hm-lead__center">
          {scored ? (
            <p
              className="hm-lead__score"
              aria-label={`Score ${match.home.score ?? "0"} to ${match.away.score ?? "0"}`}
            >
              {match.home.score ?? "–"}
              <span aria-hidden="true">:</span>
              {match.away.score ?? "–"}
            </p>
          ) : (
            <p className="hm-lead__time">
              <LocalTime date={match.date} mode="time" fallback="TBC" />
            </p>
          )}
          <StatusPill
            state={match.state}
            label={
              live
                ? match.clock || (match.state === "halftime" ? "Half-time" : "Live")
                : match.state === "finished"
                  ? "Full time"
                  : "Kick-off"
            }
          />
          <p className="hm-lead__when">
            <LocalTime date={match.date} mode="weekday" fallback="Today" />
            <span aria-hidden="true">·</span>
            <LocalTime date={match.date} mode="day-month" fallback={date} />
            <span aria-hidden="true">·</span>
            your time
          </p>
        </div>

        <LeadSide team={match.away} align="away" />
      </div>

      <footer className="hm-lead__foot">
        <div className="hm-lead__facts">
          {venueLine ? (
            <span>
              <MapPin size={13} aria-hidden="true" />
              {venueLine}
            </span>
          ) : null}
          {match.broadcasts.length > 0 ? (
            <span>
              <Tv size={13} aria-hidden="true" />
              {match.broadcasts.join(", ")}
            </span>
          ) : null}
          {!venueLine && match.broadcasts.length === 0 ? (
            <span>
              <Trophy size={13} aria-hidden="true" />
              Fixture details from ESPN
            </span>
          ) : null}
        </div>
        <Link className="hm-lead__cta" href={`/match/${match.id}`}>
          Open match centre <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

/* ---------------------------------------------------------
   The day in brief
   --------------------------------------------------------- */

function GlanceSkeleton() {
  return (
    <aside className="hm-glance hm-glance--skeleton" aria-hidden="true">
      <div className="hm-glance__head">
        <div>
          <Skeleton width={58} height={9} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width={148} height={18} />
          </div>
        </div>
        <Skeleton width={54} height={10} />
      </div>
      <div className="hm-glance__stats">
        {[0, 1, 2].map((item) => (
          <div className="hm-glance__stat" key={item}>
            <Skeleton width={34} height={26} />
            <div style={{ marginTop: 7 }}>
              <Skeleton width={48} height={8} />
            </div>
          </div>
        ))}
      </div>
      <div className="hm-glance__pulse">
        <Skeleton width={112} height={9} />
        <div style={{ marginTop: 16 }}>
          <Skeleton height={74} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Skeleton width="72%" height={9} />
        </div>
      </div>
      <div className="hm-glance__foot">
        <Skeleton width={108} height={9} />
        <Skeleton width={68} height={9} />
      </div>
    </aside>
  );
}

async function DayGlance() {
  await connection();
  const { date, matches, failed } = await loadToday();

  const competitions = new Set(
    matches.map((match) => match.league?.slug ?? match.competition.name),
  ).size;
  const goals = goalsScored(matches);
  const kicks = matches.map((match) => match.date);

  return (
    <aside className="hm-glance" aria-labelledby="hm-glance-title">
      <header className="hm-glance__head">
        <div>
          <p className="kicker">The day</p>
          <h2 className="hm-glance__title" id="hm-glance-title">
            The day in brief
          </h2>
        </div>
        <span className="hm-glance__date">
          <LocalTime
            date={`${date}T12:00:00Z`}
            mode="day-month"
            fallback={date}
          />
        </span>
      </header>

      <dl className="hm-glance__stats">
        <div className="hm-glance__stat">
          <dt>Fixtures</dt>
          <dd>{failed ? "—" : formatNumber(matches.length)}</dd>
        </div>
        <div className="hm-glance__stat">
          <dt>Goals</dt>
          <dd>{failed ? "—" : formatNumber(goals)}</dd>
        </div>
        <div className="hm-glance__stat">
          <dt>Competitions</dt>
          <dd>{failed ? "—" : formatNumber(competitions)}</dd>
        </div>
      </dl>

      <div className="hm-glance__pulse">
        <p className="hm-glance__label">When the card lands</p>
        {failed ? (
          <p className="hm-glance__note">
            The daily scoreboard is offline, so today has no shape to plot yet.
            Fixtures return with the feed.
          </p>
        ) : matches.length === 0 ? (
          <p className="hm-glance__note">
            No kick-offs on the tracked card today — the calendar has the rest
            of the month.
          </p>
        ) : (
          <KickOffPulse kicks={kicks} />
        )}
      </div>

      <footer className="hm-glance__foot">
        <Link href="/matches">
          Full match centre <ArrowRight size={13} aria-hidden="true" />
        </Link>
        <span>
          <Globe2 size={12} aria-hidden="true" />
          Times in your zone
        </span>
      </footer>
    </aside>
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

  return (
    <section className="hm-live" aria-labelledby="hm-live-title">
      <div className="hm-live__head">
        <p className="hm-live__label" id="hm-live-title">
          <span className="live-dot" aria-hidden="true" />
          Live now
        </p>
        <span className="hm-live__count">
          {formatNumber(live.length)}{" "}
          {live.length === 1 ? "match" : "matches"} in play
          {live.length > 3 ? (
            <span className="hm-live__hint">
              Scroll <ArrowRight size={10} aria-hidden="true" />
            </span>
          ) : null}
        </span>
      </div>

      <ul className="hm-live__list">
        {live.map((match) => (
          <li key={match.id}>
            <Link
              href={`/match/${match.id}`}
              className="hm-live__card"
              aria-label={`${match.home.name} versus ${match.away.name}, ${
                match.clock || "live"
              }`}
            >
              <span className="hm-live__comp">{competitionLabel(match)}</span>
              <span className="hm-live__side">
                <TeamLogo src={match.home.logo} name={match.home.name} size={16} />
                <span className="hm-live__team">{match.home.shortName}</span>
                <span className="hm-live__score">{match.home.score ?? "–"}</span>
              </span>
              <span className="hm-live__side">
                <TeamLogo src={match.away.logo} name={match.away.name} size={16} />
                <span className="hm-live__team">{match.away.shortName}</span>
                <span className="hm-live__score">{match.away.score ?? "–"}</span>
              </span>
              <span className="hm-live__clock">
                {match.state === "halftime" ? "HT" : match.clock || "LIVE"}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link className="hm-live__more" href="/matches">
        All live <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </section>
  );
}

/* ---------------------------------------------------------
   Fixture board
   --------------------------------------------------------- */

const BOARD_GROUPS = 12;
const BOARD_FIXTURES = 4;

function FixtureRow({ match }: { match: Match }) {
  const live = isLive(match);
  const scored = hasScore(match);

  return (
    <Link
      href={`/match/${match.id}`}
      className={cn("hm-fixture", live && "is-live")}
    >
      <span className="hm-fixture__time">
        {live ? (
          <>
            <span className="hm-fixture__dot" aria-hidden="true" />
            {match.state === "halftime" ? "HT" : match.clock || "LIVE"}
          </>
        ) : match.state === "finished" ? (
          "FT"
        ) : (
          <LocalTime date={match.date} mode="time" fallback="TBC" />
        )}
      </span>

      <span className="hm-fixture__teams">
        <span
          className={cn(
            "hm-fixture__team",
            scored && match.home.winner && "is-winner",
          )}
        >
          <TeamLogo src={match.home.logo} name={match.home.name} size={16} />
          <span className="hm-fixture__name">{match.home.shortName}</span>
          {scored ? (
            <span className="hm-fixture__score">{match.home.score ?? "–"}</span>
          ) : null}
        </span>
        <span
          className={cn(
            "hm-fixture__team",
            scored && match.away.winner && "is-winner",
          )}
        >
          <TeamLogo src={match.away.logo} name={match.away.name} size={16} />
          <span className="hm-fixture__name">{match.away.shortName}</span>
          {scored ? (
            <span className="hm-fixture__score">{match.away.score ?? "–"}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

function BoardSkeleton() {
  return (
    <section className="section hm-board" aria-hidden="true">
      <div className="section-head">
        <div>
          <Skeleton width={110} height={10} />
          <div style={{ marginTop: 10 }}>
            <Skeleton width={280} height={26} />
          </div>
        </div>
        <Skeleton width={140} height={11} />
      </div>
      <div className="hm-board__grid">
        {[0, 1, 2, 3, 4, 5].map((group) => (
          <div className="hm-board__group" key={group}>
            <div className="hm-board__head">
              <Skeleton width={24} height={24} />
              <Skeleton width={130} height={12} />
            </div>
            <div className="hm-board__rows">
              {[0, 1, 2, 3].map((row) => (
                <div className="hm-fixture" key={row}>
                  <Skeleton width={34} height={9} />
                  <div style={{ display: "grid", gap: 6 }}>
                    <Skeleton width="72%" height={10} />
                    <Skeleton width="62%" height={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

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
    <section className="section hm-board" aria-labelledby="hm-board-title">
      <div className="hm-board__top">
        <div>
          <p className="kicker">The fixture board</p>
          <h2 className="hm-board__title" id="hm-board-title">
            Today&apos;s card
          </h2>
          <p className="hm-board__desc">
            Every competition still to play or already finished, grouped and
            ranked — the big five leagues first, then the Saudi Pro League, then
            the rest.
          </p>
        </div>
        <div className="hm-board__aside">
          {failed ? null : (
            <>
              <span className="hm-board__stat">
                <strong>{formatNumber(toCome)}</strong> to come
              </span>
              <span className="hm-board__stat">
                <strong>{formatNumber(played)}</strong> played
              </span>
            </>
          )}
          <Link className="section-head__link" href="/matches">
            All fixtures <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {failed ? (
        <EmptyState
          icon={<CircleDot size={22} />}
          title="Today's scoreboard is unavailable"
          description="ESPN did not respond for the daily scoreboard. Tables, rankings and the news wire keep working while scores recover."
          action={{ href: "/matches", label: "Try the match centre" }}
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="No fixtures listed for today"
          description="There is no football on the tracked scoreboard today. The calendar has the rest of the month."
          action={{ href: "/calendar", label: "Browse the calendar" }}
        />
      ) : groups.length === 0 ? (
        <p className="hm-board__none">
          Everything on today&apos;s card is already on this page — the lead
          match is above, the rest is in play.
          <Link href="/matches">
            Open the match centre <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </p>
      ) : (
        <>
          <div className="hm-board__grid">
            {shown.map((group) => {
              const visible = group.matches.slice(0, BOARD_FIXTURES);
              const extra = group.matches.length - visible.length;

              return (
                <article className="hm-board__group" key={group.key}>
                  <header className="hm-board__head">
                    <LeagueLogo src={group.logo} name={group.name} size={24} />
                    <h3 className="hm-board__name">
                      {group.slug ? (
                        <Link href={`/competitions/${group.slug}`}>
                          {group.name}
                        </Link>
                      ) : (
                        group.name
                      )}
                    </h3>
                    <span className="hm-board__count">
                      {group.matches.length}
                    </span>
                    {group.slug ? (
                      <FavoriteButton
                        kind="league"
                        item={{
                          slug: group.slug,
                          name: group.name,
                          logo: group.logo,
                        }}
                        className="hm-board__star"
                      />
                    ) : null}
                  </header>

                  <div className="hm-board__rows">
                    {visible.map((match) => (
                      <FixtureRow key={match.id} match={match} />
                    ))}
                  </div>

                  {extra > 0 ? (
                    <p className="hm-board__more">
                      +{extra} more in this competition
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {remainingGroups > 0 ? (
            <p className="hm-board__rest">
              {formatNumber(remainingGroups)} more{" "}
              {remainingGroups === 1 ? "competition" : "competitions"} on
              today&apos;s card.{" "}
              <Link href="/matches">
                Open the match centre <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ---------------------------------------------------------
   Context cards
   --------------------------------------------------------- */

function RankMovement({ entry }: { entry: RankingEntry }) {
  if (!entry.movement) {
    return (
      <span className="hm-rank__move is-flat" title="No change">
        <Minus size={11} aria-hidden="true" />
      </span>
    );
  }
  const up = entry.movement > 0;
  return (
    <span
      className={cn("hm-rank__move", up ? "is-up" : "is-down")}
      title={up ? `Up ${entry.movement}` : `Down ${Math.abs(entry.movement)}`}
    >
      {up ? (
        <ArrowUp size={11} aria-hidden="true" />
      ) : (
        <ArrowDown size={11} aria-hidden="true" />
      )}
      {Math.abs(entry.movement)}
    </span>
  );
}

function ContextSkeleton({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("hm-card", dark && "hm-card--dark")} aria-hidden="true">
      <div className="hm-card__head">
        <div style={{ flex: 1 }}>
          <Skeleton width={70} height={9} />
          <div style={{ marginTop: 9 }}>
            <Skeleton width="60%" height={20} />
          </div>
          <div style={{ marginTop: 7 }}>
            <Skeleton width="80%" height={9} />
          </div>
        </div>
        <Skeleton width={38} height={38} />
      </div>
      <div style={{ padding: "10px 0" }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="hm-card__skeleton-row">
            <Skeleton width={14} height={10} />
            <Skeleton width={20} height={20} />
            <Skeleton width="55%" height={11} />
            <div style={{ marginLeft: "auto" }}>
              <Skeleton width={36} height={11} />
            </div>
          </div>
        ))}
      </div>
      <div className="hm-card__foot">
        <Skeleton width={90} height={9} />
        <Skeleton width={50} height={9} />
      </div>
    </div>
  );
}

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
      <article className="hm-card">
        <header className="hm-card__head">
          <div>
            <p className="kicker">Table watch</p>
            <h3 className="hm-card__title">The busiest table today</h3>
            <p className="hm-card__sub">
              A live table from the competition with the fullest card.
            </p>
          </div>
          <Trophy className="hm-card__glyph" size={26} aria-hidden="true" />
        </header>
        <div className="hm-card__empty">
          <p>
            No tracked competition is playing today, so there is no table to
            put in context.
          </p>
          <Link href="/competitions">
            Browse every table <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </article>
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
    <article className="hm-card">
      <header className="hm-card__head">
        <div>
          <p className="kicker">Table watch</p>
          <h3 className="hm-card__title">{league.abbreviation} standings</h3>
          <p className="hm-card__sub">
            {group?.name ? `${group.name} · ` : ""}
            {seasonLabel(season, league)} · {formatNumber(busiest.count)}{" "}
            {busiest.count === 1 ? "fixture" : "fixtures"} today
          </p>
        </div>
        <LeagueLogo src={league.logo} name={league.name} size={38} />
      </header>

      {failed ? (
        <div className="hm-card__empty">
          <p>
            ESPN did not return a table for {league.abbreviation} just now.
            Tables update independently of scores, so this usually recovers.
          </p>
          <Link href={`/competitions/${league.slug}`}>
            Try the competition page <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      ) : entries.length === 0 ? (
        <div className="hm-card__empty">
          <p>
            ESPN has not published a table for {league.abbreviation}{" "}
            {seasonLabel(season, league)} yet.
          </p>
          <Link href={`/competitions/${league.slug}`}>
            Open the competition <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <table className="hm-table">
          <caption className="sr-only">
            Top five of the {league.name} table for{" "}
            {seasonLabel(season, league)}
          </caption>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Team</th>
              <th scope="col">P</th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.team.id}-${entry.rank}`}>
                <td>{entry.rank}</td>
                <td>
                  <span className="hm-table__team">
                    <TeamLogo
                      src={entry.team.logo}
                      name={entry.team.name}
                      size={18}
                    />
                    <span>{entry.team.shortName || entry.team.name}</span>
                  </span>
                </td>
                <td>{entry.played}</td>
                <td>{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="hm-card__foot">
        <Link href={`/competitions/${league.slug}`}>
          Full table <ArrowRight size={13} aria-hidden="true" />
        </Link>
        <span>{formatNumber(busiest.count)} today</span>
      </footer>
    </article>
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

  const top = board?.entries.slice(0, 5) ?? [];

  return (
    <article className="hm-card hm-card--dark">
      <header className="hm-card__head">
        <div>
          <p className="kicker">World order</p>
          <h3 className="hm-card__title">FIFA men&apos;s top five</h3>
          <p className="hm-card__sub">
            Official ranking
            {board?.updatedAt ? (
              <>
                {" "}
                · published{" "}
                <LocalTime
                  date={board.updatedAt}
                  mode="date"
                  fallback={board.updatedAt}
                />
              </>
            ) : null}
          </p>
        </div>
        <Trophy className="hm-card__glyph" size={26} aria-hidden="true" />
      </header>

      {failed ? (
        <div className="hm-card__empty">
          <p>
            The FIFA public API did not respond. The ranking is unchanged —
            only the connection is missing.
          </p>
          <Link href="/rankings">
            Try the ranking page <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      ) : top.length === 0 ? (
        <div className="hm-card__empty">
          <p>FIFA has not published a ranking yet.</p>
          <Link href="/rankings">
            Open rankings <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <ol className="hm-rank">
          {top.map((entry) => (
            <li className="hm-rank__row" key={entry.teamId || entry.name}>
              <span className="hm-rank__pos">{entry.rank}</span>
              <span className="hm-rank__team">
                <TeamLogo name={entry.name} size={22} />
                <span>{entry.name}</span>
              </span>
              <RankMovement entry={entry} />
              <span className="hm-rank__points">
                {entry.points.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <footer className="hm-card__foot">
        <Link href="/rankings">
          Full FIFA rankings <ArrowRight size={13} aria-hidden="true" />
        </Link>
        <span>{board ? `${formatNumber(board.entries.length)} teams` : "—"}</span>
      </footer>
    </article>
  );
}

function ContextSection() {
  return (
    <section className="section" aria-label="Today in context">
      <SectionHeader
        kicker="The day in context"
        title="Two numbers worth knowing"
        description="A live table from the competition with the busiest card today, and the top of the official FIFA men's ranking."
      />
      <div className="hm-context">
        <Suspense fallback={<ContextSkeleton />}>
          <TableWatch />
        </Suspense>
        <Suspense fallback={<ContextSkeleton dark />}>
          <RankingWatch />
        </Suspense>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
   News front
   --------------------------------------------------------- */

function LeadStory({ article }: { article: NewsArticle }) {
  const body = (
    <>
      <span className="hm-lead-story__media">
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={article.imageAlt ?? ""}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="hm-lead-story__fallback">
            <Newspaper size={26} aria-hidden="true" />
            Touchline wire
          </span>
        )}
      </span>
      <span className="hm-lead-story__body">
        <span className="hm-lead-story__kicker">
          {article.section ?? "Top story"}
        </span>
        <span className="hm-lead-story__title">{article.headline}</span>
        {article.description ? (
          <span className="hm-lead-story__desc">{article.description}</span>
        ) : null}
        <span className="hm-lead-story__meta">
          <LocalTime
            date={article.published}
            mode="date"
            fallback="Date unavailable"
          />
          {article.url ? (
            <span>
              Read at publisher <ArrowUpRight size={12} aria-hidden="true" />
            </span>
          ) : null}
        </span>
      </span>
    </>
  );

  if (!article.url) {
    return <article className="hm-lead-story">{body}</article>;
  }

  return (
    <a
      className="hm-lead-story"
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  );
}

function SideStory({ article, index }: { article: NewsArticle; index: number }) {
  const body = (
    <>
      <span className="hm-story__num">{String(index + 2).padStart(2, "0")}</span>
      <span className="hm-story__text">
        <span className="hm-story__section">
          {article.section ?? "Football"}
        </span>
        <span className="hm-story__title">{article.headline}</span>
        <span className="hm-story__meta">
          <LocalTime date={article.published} mode="date" fallback="—" />
        </span>
      </span>
      <ArrowUpRight className="hm-story__arrow" size={14} aria-hidden="true" />
    </>
  );

  if (!article.url) {
    return <article className="hm-story">{body}</article>;
  }

  return (
    <a
      className="hm-story"
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  );
}

function NewsSkeleton() {
  return (
    <section className="section" aria-hidden="true">
      <div className="section-head">
        <div>
          <Skeleton width={90} height={10} />
          <div style={{ marginTop: 9 }}>
            <Skeleton width={280} height={24} />
          </div>
        </div>
        <Skeleton width={90} height={12} />
      </div>
      <div className="hm-news">
        <div className="hm-lead-story">
          <Skeleton height={250} />
          <div className="hm-lead-story__body">
            <Skeleton width={70} height={9} />
            <Skeleton width="88%" height={22} />
            <Skeleton width="70%" height={22} />
          </div>
        </div>
        <div className="hm-news__list">
          {[0, 1, 2, 3].map((item) => (
            <div className="hm-story" key={item}>
              <Skeleton width={18} height={9} />
              <div style={{ flex: 1 }}>
                <Skeleton width="92%" height={12} />
                <div style={{ marginTop: 6 }}>
                  <Skeleton width="55%" height={8} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

async function NewsFront() {
  await connection();

  let articles: NewsArticle[] = [];
  let failed = false;
  try {
    articles = (await getNews(6)).slice(0, 5);
  } catch {
    failed = true;
  }

  const [lead, ...rest] = articles;

  return (
    <section className="section" aria-label="News from the wire">
      <SectionHeader
        kicker="From the wire"
        title="The stories behind the scores"
        description="Headlines surfaced by ESPN's public news feed. Every link opens the original publisher."
        action={{ href: "/news", label: "All stories" }}
      />

      {failed ? (
        <EmptyState
          icon={<Newspaper size={22} />}
          title="The news feed is unavailable"
          description="ESPN's news endpoint did not respond. Scores, tables and fixtures are unaffected."
        />
      ) : !lead ? (
        <EmptyState
          icon={<Newspaper size={22} />}
          title="No stories published right now"
          description="Check back later — the rest of Touchline keeps working without the news feed."
        />
      ) : (
        <div className="hm-news">
          <LeadStory article={lead} />
          <div className="hm-news__list">
            {rest.slice(0, 4).map((article, index) => (
              <SideStory key={article.id} article={article} index={index} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------
   Closing band
   --------------------------------------------------------- */

function HomeClose() {
  return (
    <section className="hm-close" aria-labelledby="hm-close-title">
      <div className="hm-close__copy">
        <p className="kicker">Your matchday, your clock</p>
        <h2 className="hm-close__title" id="hm-close-title">
          Never miss another{" "}
          <span className="hm-close__keep">kick-off.</span>
        </h2>
        <p className="hm-close__lede">
          Pick your timezone, follow the teams you care about and send any
          fixture to the calendar you already use. Preferences stay in this
          browser.
        </p>
      </div>
      <div className="hm-close__side">
        <div className="hm-close__actions">
          <Link className="btn" href="/settings">
            Set preferences <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <Link className="btn btn--ghost" href="/calendar">
            <CalendarDays size={15} aria-hidden="true" />
            Open calendar
          </Link>
        </div>
        <ul className="hm-close__meta">
          <li>{formatNumber(LEAGUES.length)} competitions</li>
          <li>FIFA men&apos;s &amp; women&apos;s</li>
          <li>ICS &amp; Google Calendar</li>
        </ul>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
   Page
   --------------------------------------------------------- */

export default function HomePage() {
  return (
    <div className="hm">
      <Masthead />

      <section className="hm-lead-grid" aria-label="Today's lead match">
        <Suspense fallback={<LeadSkeleton />}>
          <LeadMatch />
        </Suspense>
        <Suspense fallback={<GlanceSkeleton />}>
          <DayGlance />
        </Suspense>
      </section>

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

      <HomeClose />
    </div>
  );
}
