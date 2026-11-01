import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, RefreshCw, ShieldCheck, Trophy } from "lucide-react";
import { getLeague } from "@/data/leagues";
import { TeamLogo } from "@/components/ui/Logos";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { Badge, EmptyState, SectionHeader, Skeleton } from "@/components/ui/Primitives";
import { SeasonSelect } from "@/components/competitions/LeagueFilters";
import { MatchRow } from "@/components/soccer/MatchRow";
import { getTeamPage } from "@/lib/api";
import { seasonLabel } from "@/lib/date";
import type { Match, TeamFixture } from "@/lib/types";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = {
  title: "Team profile",
  description:
    "A team's season fixtures, results, form and league context, built from ESPN's public team profile and schedule feeds.",
};

function toMatch(fixture: TeamFixture): Match {
  const homeScore = fixture.homeScore ? Number(fixture.homeScore) : undefined;
  const awayScore = fixture.awayScore ? Number(fixture.awayScore) : undefined;
  const finished =
    fixture.state === "finished" ||
    fixture.state === "live" ||
    fixture.state === "halftime";
  const homeWinner =
    finished &&
    homeScore !== undefined &&
    awayScore !== undefined &&
    homeScore > awayScore;
  const awayWinner =
    finished &&
    homeScore !== undefined &&
    awayScore !== undefined &&
    awayScore > homeScore;
  const league = fixture.leagueSlug ? getLeague(fixture.leagueSlug) : undefined;

  return {
    id: fixture.id,
    date: fixture.date,
    name: fixture.name,
    state: fixture.state,
    statusLabel: fixture.statusLabel,
    statusDetail: "",
    competition: {
      name: fixture.leagueName ?? "Competition",
      slug: fixture.leagueSlug,
    },
    league,
    home: {
      ...fixture.home,
      homeAway: "home",
      score: fixture.homeScore,
      winner: homeWinner,
    },
    away: {
      ...fixture.away,
      homeAway: "away",
      score: fixture.awayScore,
      winner: awayWinner,
    },
    venue: fixture.venue,
    broadcasts: [],
  };
}

function TeamSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="league-hero">
        <Skeleton width={62} height={62} />
        <div className="league-hero__text" style={{ display: "grid", gap: 9 }}>
          <Skeleton width={110} height={10} />
          <Skeleton width="45%" height={30} />
          <Skeleton width="35%" height={12} />
        </div>
        <Skeleton width={220} height={40} />
      </div>
      <div className="match-list" style={{ marginTop: 22 }}>
        {[0, 1, 2, 3, 4].map((row) => (
          <div className="match-row" key={row}>
            <Skeleton width={40} height={26} />
            <div style={{ display: "grid", gap: 6 }}>
              <Skeleton width="48%" height={13} />
              <Skeleton width="42%" height={13} />
            </div>
            <Skeleton width={22} height={18} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FixtureSection({
  title,
  fixtures,
  empty,
}: {
  title: string;
  fixtures: TeamFixture[];
  empty: string;
}) {
  return (
    <section className="match-group">
      <div className="match-group__head">
        <h2 className="match-group__name">{title}</h2>
        <span className="small text-muted">{fixtures.length}</span>
      </div>
      {fixtures.length === 0 ? (
        <div className="match-list">
          <div className="content-card__empty">{empty}</div>
        </div>
      ) : (
        <div className="match-list">
          {fixtures.map((fixture) => (
            <MatchRow key={fixture.id} match={toMatch(fixture)} showCompetition />
          ))}
        </div>
      )}
    </section>
  );
}

async function TeamContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const requestedSeason = first(query.season);

  let data: Awaited<ReturnType<typeof getTeamPage>> = null;
  let failed = false;
  try {
    data = await getTeamPage(id, requestedSeason);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        icon={<RefreshCw size={22} />}
        title="This team could not be loaded"
        description="ESPN's team endpoint did not respond, or this team is not indexed. Try again in a moment."
        action={{ href: `/team/${id}`, label: "Retry" }}
      >
        <Link href="/search" className="btn btn--ghost">
          Search for a team
        </Link>
      </EmptyState>
    );
  }

  if (!data) notFound();

  const { team, fixtures, league, season } = data;
  const upcoming = fixtures.filter(
    (fixture) =>
      fixture.state === "scheduled" ||
      fixture.state === "postponed" ||
      fixture.state === "unknown",
  );
  const results = fixtures.filter(
    (fixture) =>
      fixture.state === "finished" ||
      fixture.state === "live" ||
      fixture.state === "halftime" ||
      fixture.state === "canceled",
  );

  return (
    <>
      <header className="league-hero">
        <TeamLogo src={team.logo} name={team.name} size={66} decorative={false} />
        <div className="league-hero__text">
          <p className="kicker">
            {league ? (
              <Link href={`/competitions/${league.slug}`}>{league.name}</Link>
            ) : (
              "Team profile"
            )}
          </p>
          <h1 className="league-hero__title">{team.name}</h1>
          <div className="league-hero__meta">
            {team.abbreviation ? <Badge tone="muted">{team.abbreviation}</Badge> : null}
            <Badge tone="accent">{seasonLabel(season, league ?? undefined)}</Badge>
            {team.standingSummary ? (
              <Badge tone="muted">{team.standingSummary}</Badge>
            ) : null}
            {team.recordSummary ? (
              <Badge tone="muted">{team.recordSummary}</Badge>
            ) : null}
            {team.seasonSummary ? (
              <Badge tone="muted">{team.seasonSummary}</Badge>
            ) : null}
          </div>
        </div>
        <div className="league-hero__actions">
          <SeasonSelect
            season={season}
            defaultSeason={season}
            region={league?.region ?? ""}
          />
          <FavoriteButton
            kind="team"
            item={{
              id: team.id,
              name: team.shortName || team.name,
              abbreviation: team.abbreviation,
              logo: team.logo,
              leagueSlug: league?.slug ?? team.leagueSlug,
            }}
            withLabel
          />
          <ShareButton title={team.name} withLabel />
        </div>
      </header>

      <div className="stat-strip" style={{ marginBottom: 24 }}>
        <div className="stat-strip__item">
          <span className="stat-strip__value">{fixtures.length}</span>
          <span className="stat-strip__label">Fixtures this season</span>
        </div>
        <div className="stat-strip__item">
          <span className="stat-strip__value">{results.length}</span>
          <span className="stat-strip__label">Played</span>
        </div>
        <div className="stat-strip__item">
          <span className="stat-strip__value">{upcoming.length}</span>
          <span className="stat-strip__label">Still to come</span>
        </div>
        <div className="stat-strip__item">
          <span className="stat-strip__value">
            {league ? seasonLabel(season, league) : season}
          </span>
          <span className="stat-strip__label">Selected season</span>
        </div>
      </div>

      <div className="fixtures-toolbar">
        {league ? (
          <Link
            href={`/competitions/${league.slug}?season=${season}`}
            className="btn btn--ghost btn--sm"
          >
            <Trophy size={15} aria-hidden="true" />
            {league.abbreviation} table
          </Link>
        ) : null}
        <Link href="/matches" className="btn btn--ghost btn--sm">
          <CalendarDays size={15} aria-hidden="true" />
          Match centre
        </Link>
        <span className="fixtures-count">
          <ShieldCheck size={12} aria-hidden="true" /> Source: ESPN team schedule
        </span>
      </div>

      {fixtures.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="No fixtures published for this season"
          description="ESPN does not list a schedule for this team in the selected season. Try another season above, or search for the competition."
          action={{ href: "/competitions", label: "Browse competitions" }}
        />
      ) : (
        <>
          <FixtureSection
            title="Upcoming fixtures"
            fixtures={upcoming}
            empty="No upcoming fixtures are listed for this season."
          />
          <FixtureSection
            title="Results"
            fixtures={results}
            empty="No results are listed for this season."
          />
        </>
      )}

      <section className="section">
        <SectionHeader
          kicker="Keep exploring"
          title="Follow the competition"
          description="A team's season only makes sense next to its table, its rivals and the fixture list."
          action={
            league
              ? { href: `/competitions/${league.slug}`, label: league.abbreviation }
              : { href: "/competitions", label: "Competitions" }
          }
        />
        <div className="fixtures-toolbar">
          {league ? (
            <>
              <Link
                href={`/competitions/${league.slug}?tab=standings&season=${season}`}
                className="btn btn--soft"
              >
                League table
              </Link>
              <Link
                href={`/competitions/${league.slug}?tab=fixtures&season=${season}`}
                className="btn btn--soft"
              >
                Full season
              </Link>
              <Link
                href={`/competitions/${league.slug}?tab=scorers&season=${season}`}
                className="btn btn--soft"
              >
                Top scorers
              </Link>
            </>
          ) : (
            <Link href="/competitions" className="btn btn--soft">
              All competitions
            </Link>
          )}
        </div>
      </section>

      <p className="small text-muted" style={{ marginTop: 14 }}>
        Team names, crests and season records come from ESPN&apos;s public team
        profile. Where a field is missing, Touchline leaves it out rather than
        guessing.
      </p>
    </>
  );
}

export default function TeamPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<TeamSkeleton />}>
      <TeamContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
