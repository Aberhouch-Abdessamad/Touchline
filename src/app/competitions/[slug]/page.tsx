import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  CalendarDays,
  Globe2,
  LayoutList,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ShareButton } from "@/components/ui/ShareButton";
import {
  Badge,
  EmptyState,
  SectionHeader,
  Skeleton,
} from "@/components/ui/Primitives";
import { CompetitionCard } from "@/components/soccer/CompetitionCard";
import { MatchRow } from "@/components/soccer/MatchRow";
import { MonthSelect, SeasonSelect } from "@/components/competitions/LeagueFilters";
import { StandingsTable } from "@/components/competitions/StandingsTable";
import {
  defaultSeasonFor,
  findLeague,
  getAllLeagues,
  getLeagueFixtures,
  getScorers,
  getStandings,
  resolveSeason,
} from "@/lib/api";
import { formatMonthTitle, seasonLabel } from "@/lib/date";
import { formatNumber } from "@/lib/utils";
import { isIsoMonth } from "@/lib/validation";
import type { Match, ScorerBoard, StandingGroup } from "@/lib/types";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = ["standings", "scorers", "fixtures"] as const;
type TabKey = (typeof TABS)[number];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | undefined): TabKey {
  return TABS.includes(value as TabKey) ? (value as TabKey) : "standings";
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const league = findLeague(slug);
  if (!league) return { title: "Competition not found" };
  return {
    title: `${league.name} — table, fixtures & scorers`,
    description: `Live ${league.name} standings, season fixtures and player leaderboards for ${league.country}, sourced from public ESPN data.`,
    alternates: { canonical: `/competitions/${league.slug}` },
    openGraph: {
      title: `${league.name} on Touchline`,
      description: `Standings, fixtures and scorers for the ${league.name}.`,
    },
  };
}

function LeagueSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="league-hero">
        <Skeleton width={64} height={64} />
        <div className="league-hero__text" style={{ display: "grid", gap: 9 }}>
          <Skeleton width={130} height={10} />
          <Skeleton width="60%" height={30} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <div className="link-tabs" style={{ marginBottom: 24 }}>
        <Skeleton width="100%" height={38} />
      </div>
      <div className="table-wrap">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            style={{ display: "flex", gap: 16, padding: "12px 16px" }}
          >
            <Skeleton width={20} height={14} />
            <Skeleton width={180} height={14} />
            <Skeleton width="100%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScorerList({
  title,
  caption,
  scorers,
  metric,
}: {
  title: string;
  caption: string;
  scorers: ScorerBoard["goals"];
  metric: "goals" | "assists";
}) {
  return (
    <section className="scorer-card">
      <div className="scorer-card__head">
        <h2 className="scorer-card__title">{title}</h2>
        <span className="small text-muted">{caption}</span>
      </div>
      {scorers.length === 0 ? (
        <div className="content-card__empty">
          No players are listed in this leaderboard.
        </div>
      ) : (
        <ol>
          {scorers.map((scorer) => (
            <li key={`${metric}-${scorer.playerId}-${scorer.rank}`}>
              <div className="scorer-row">
                <span className="scorer-row__rank">{scorer.rank}</span>
                <div className="scorer-row__player">
                  <span className="scorer-row__name">{scorer.playerName}</span>
                  <span className="scorer-row__team">
                    <TeamLogo
                      src={scorer.team.logo}
                      name={scorer.team.name}
                      size={12}
                    />
                    <Link href={`/team/${scorer.team.id}`}>
                      {scorer.team.shortName || scorer.team.name}
                    </Link>
                  </span>
                </div>
                <span className="scorer-row__value">
                  {scorer[metric]}
                  <span className="scorer-row__meta">
                    {scorer.appearances ? `${scorer.appearances} apps` : ""}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CompetitionHero({
  league,
  season,
  defaultSeason,
}: {
  league: NonNullable<ReturnType<typeof findLeague>>;
  season: number;
  defaultSeason: number;
}) {
  return (
    <header className="league-hero">
      <LeagueLogo src={league.logo} name={league.name} size={62} />
      <div className="league-hero__text">
        <p className="kicker">
          {league.country} · {league.region}
        </p>
        <h1 className="league-hero__title">{league.name}</h1>
        <div className="league-hero__meta">
          <Badge tone="muted">
            {league.type === "club" ? "Club competition" : "National teams"}
          </Badge>
          <Badge tone="muted">{league.format}</Badge>
          <Badge tone="muted">
            {league.gender === "women" ? "Women's football" : "Men's football"}
          </Badge>
          {league.youth ? <Badge tone="warning">Youth</Badge> : null}
          <Badge tone="accent">{seasonLabel(season, league)}</Badge>
        </div>
      </div>
      <div className="league-hero__actions">
        <SeasonSelect
          season={season}
          defaultSeason={defaultSeason}
          region={league.region}
        />
        <FavoriteButton
          kind="league"
          item={{
            slug: league.slug,
            name: league.name,
            logo: league.logo ?? undefined,
          }}
          withLabel
        />
        <ShareButton title={league.name} withLabel />
      </div>
    </header>
  );
}

async function StandingsPanel({
  league,
  season,
}: {
  league: NonNullable<ReturnType<typeof findLeague>>;
  season: number;
}) {
  let groups: StandingGroup[] = [];
  let available = true;
  let reason: string | undefined;
  let failed = false;

  try {
    const result = await getStandings(league, season);
    groups = result.data;
    available = result.available;
    reason = result.reason;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        icon={<LayoutList size={22} />}
        title="The league table could not be loaded"
        description="ESPN's standings endpoint did not respond. Tables are usually back within a minute."
        action={{
          href: `/competitions/${league.slug}?tab=standings&season=${season}`,
          label: "Retry the table",
        }}
      />
    );
  }

  if (!available || groups.length === 0) {
    return (
      <EmptyState
        icon={<LayoutList size={22} />}
        title="No table published for this season"
        description={
          reason ??
          "This competition does not use a league table, or ESPN has not published one for the selected season."
        }
        action={{
          href: `/competitions/${league.slug}?tab=fixtures&season=${season}`,
          label: "View fixtures instead",
        }}
      />
    );
  }

  return (
    <>
      <p className="standings-note">
        Standings are the live table published by ESPN for{" "}
        <strong>{seasonLabel(season, league)}</strong>. Positions can change
        while matches are in progress.
      </p>
      <StandingsTable groups={groups} />
    </>
  );
}

async function ScorersPanel({
  league,
  season,
}: {
  league: NonNullable<ReturnType<typeof findLeague>>;
  season: number;
}) {
  let board: ScorerBoard = { goals: [], assists: [] };
  let available = true;
  let reason: string | undefined;
  let failed = false;

  try {
    const result = await getScorers(league, season);
    board = result.data;
    available = result.available;
    reason = result.reason;
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        icon={<Trophy size={22} />}
        title="Player leaders could not be loaded"
        description="ESPN's statistics endpoint did not respond. Try again shortly."
        action={{
          href: `/competitions/${league.slug}?tab=scorers&season=${season}`,
          label: "Retry leaderboards",
        }}
      />
    );
  }

  if (!available) {
    return (
      <EmptyState
        icon={<Trophy size={22} />}
        title="No player leaderboards for this season"
        description={
          reason ??
          "Cup and international competitions often do not publish season-long scorer boards."
        }
      />
    );
  }

  return (
    <>
      <div className="scorer-grid">
        <ScorerList
          title="Top scorers"
          caption={`${seasonLabel(season, league)} · goals`}
          scorers={board.goals}
          metric="goals"
        />
        <ScorerList
          title="Most assists"
          caption={`${seasonLabel(season, league)} · assists`}
          scorers={board.assists}
          metric="assists"
        />
      </div>
      <p className="small text-muted" style={{ marginTop: 16 }}>
        Leaderboards reflect ESPN&apos;s published season statistics. Appearance
        counts are shown where the provider includes them.
      </p>
    </>
  );
}

async function FixturesPanel({
  league,
  season,
  month,
}: {
  league: NonNullable<ReturnType<typeof findLeague>>;
  season: number;
  month?: string;
}) {
  let all: Match[] = [];
  let failed = false;

  try {
    all = await getLeagueFixtures(league, season);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        icon={<CalendarDays size={22} />}
        title="The fixture list could not be loaded"
        description="ESPN's scoreboard endpoint did not respond for this competition and season."
        action={{
          href: `/competitions/${league.slug}?tab=fixtures&season=${season}`,
          label: "Retry fixtures",
        }}
      />
    );
  }

  if (all.length === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={22} />}
        title="No fixtures returned for this season"
        description={`ESPN does not list a ${seasonLabel(season, league)} schedule for the ${league.name}. Try another season from the selector above.`}
      />
    );
  }

  const sorted = [...all].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const monthCounts = new Map<string, number>();
  for (const match of sorted) {
    const key = match.date.slice(0, 7);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }
  const months = [...monthCounts.entries()].map(([key, count]) => ({
    key,
    count,
    label: formatMonthTitle(Number(key.slice(0, 4)), Number(key.slice(5, 7))),
  }));

  const filtered = month
    ? sorted.filter((match) => match.date.slice(0, 7) === month)
    : sorted;

  const grouped = new Map<string, Match[]>();
  for (const match of filtered) {
    const key = match.date.slice(0, 7);
    const bucket = grouped.get(key) ?? [];
    bucket.push(match);
    grouped.set(key, bucket);
  }

  return (
    <>
      <div className="fixtures-toolbar">
        <MonthSelect months={months} value={month ?? "all"} />
        <span className="fixtures-count">
          {formatNumber(filtered.length)} of {formatNumber(sorted.length)} fixtures
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="No fixtures in this month"
          description="Choose another month, or reset the filter to see the whole season."
        />
      ) : (
        [...grouped.entries()].map(([key, matches]) => (
          <section className="match-group" key={key}>
            <div className="match-group__head">
              <h2 className="match-group__name">
                {formatMonthTitle(Number(key.slice(0, 4)), Number(key.slice(5, 7)))}
              </h2>
              <span className="small text-muted">
                {formatNumber(matches.length)} matches
              </span>
              <Link
                href={`/calendar?month=${key}`}
                className="match-group__link"
              >
                Calendar view
              </Link>
            </div>
            <div className="match-list">
              {matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))
      )}

      <p className="small text-muted" style={{ marginTop: 16 }}>
        Kick-off times are shown in your selected timezone.{" "}
        <Link href="/settings">Change timezone</Link>.
      </p>
    </>
  );
}

function RelatedCompetitions({
  slug,
  region,
}: {
  slug: string;
  region: string;
}) {
  const related = getAllLeagues()
    .filter((league) => league.region === region && league.slug !== slug)
    .slice(0, 4);
  if (related.length === 0) return null;
  return (
    <section className="section">
      <SectionHeader
        kicker={`More from ${region}`}
        title="Competitions in the same region"
        action={{ href: "/competitions", label: "All competitions" }}
      />
      <div className="competition-grid">
        {related.map((league) => (
          <CompetitionCard key={league.slug} league={league} />
        ))}
      </div>
    </section>
  );
}

async function LeagueContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await connection();
  const { slug } = await params;
  const query = await searchParams;
  const league = findLeague(slug);
  if (!league) notFound();

  const tab = parseTab(first(query.tab));
  const defaultSeason = defaultSeasonFor(league);
  const season = resolveSeason(league, first(query.season));
  const monthValue = first(query.month);
  const month = isIsoMonth(monthValue) ? monthValue : undefined;

  return (
    <>
      <CompetitionHero
        league={league}
        season={season}
        defaultSeason={defaultSeason}
      />

      <LinkTabs
        tabs={[
          { key: "standings", label: "Table" },
          { key: "scorers", label: "Scorers" },
          { key: "fixtures", label: "Fixtures" },
        ]}
        active={tab}
        baseHref={`/competitions/${league.slug}`}
        params={{ season: String(season) }}
        ariaLabel="Competition sections"
        className="league-tabs"
      />

      {tab === "standings" ? (
        <StandingsPanel league={league} season={season} />
      ) : tab === "scorers" ? (
        <ScorersPanel league={league} season={season} />
      ) : (
        <FixturesPanel league={league} season={season} month={month} />
      )}

      <div className="league-hero__meta" style={{ marginTop: 18 }}>
        <span className="small text-muted">
          <Globe2 size={12} aria-hidden="true" /> {league.country}
        </span>
        <span className="small text-muted">
          <Star size={12} aria-hidden="true" /> Star this competition to pin it
          on the competitions page
        </span>
        {league.aliases.length > 0 ? (
          <span className="small text-muted">
            <Users size={12} aria-hidden="true" /> Also known as{" "}
            {league.aliases.slice(0, 3).join(", ")}
          </span>
        ) : null}
        <Link href="/settings" className="small text-muted">
          Times follow your timezone
        </Link>
      </div>

      <RelatedCompetitions slug={league.slug} region={league.region} />
    </>
  );
}

export default function CompetitionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<LeagueSkeleton />}>
      <LeagueContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
