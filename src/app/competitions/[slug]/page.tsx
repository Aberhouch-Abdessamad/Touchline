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
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { LeagueHero } from "@/components/competitions/LeagueHero";
import { LeagueTabs } from "@/components/competitions/LeagueTabs";
import { ScorerList } from "@/components/competitions/ScorerList";
import { FixturesView } from "@/components/competitions/FixturesView";
import { RelatedCompetitions } from "@/components/competitions/RelatedCompetitions";
import { StandingsTable } from "@/components/competitions/StandingsTable";
import { T } from "@/lib/i18n";
import {
  defaultSeasonFor,
  findLeague,
  getAllLeagues,
  getLeagueFixtures,
  getScorers,
  getStandings,
  resolveSeason,
} from "@/lib/api";
import { seasonLabel } from "@/lib/date";
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
        title={<T k="competitions.detail.errors.tableTitle" />}
        description={<T k="competitions.detail.errors.tableBody" />}
        action={{
          href: `/competitions/${league.slug}?tab=standings&season=${season}`,
          label: <T k="competitions.detail.errors.tableRetry" />,
        }}
      />
    );
  }

  if (!available || groups.length === 0) {
    return (
      <EmptyState
        icon={<LayoutList size={22} />}
        title={<T k="competitions.detail.errors.tableUnavailableTitle" />}
        description={
          reason ?? <T k="competitions.detail.errors.tableUnavailableBody" />
        }
        action={{
          href: `/competitions/${league.slug}?tab=fixtures&season=${season}`,
          label: <T k="competitions.detail.errors.tableUnavailableAction" />,
        }}
      />
    );
  }

  return (
    <>
      <p className="standings-note">
        <T k="competitions.standings.noteFirst" />{" "}
        <strong>
          <span className="u-dir-ltr">{seasonLabel(season, league)}</span>
        </strong>
        . <T k="competitions.standings.noteLast" />
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
        title={<T k="competitions.detail.errors.scorersTitle" />}
        description={<T k="competitions.detail.errors.scorersBody" />}
        action={{
          href: `/competitions/${league.slug}?tab=scorers&season=${season}`,
          label: <T k="competitions.detail.errors.scorersRetry" />,
        }}
      />
    );
  }

  if (!available) {
    return (
      <EmptyState
        icon={<Trophy size={22} />}
        title={<T k="competitions.detail.errors.scorersUnavailableTitle" />}
        description={
          reason ?? <T k="competitions.detail.errors.scorersUnavailableBody" />
        }
      />
    );
  }

  return (
    <>
      <div className="scorer-grid">
        <ScorerList
          scorers={board.goals}
          metric="goals"
          season={season}
          region={league.region}
        />
        <ScorerList
          scorers={board.assists}
          metric="assists"
          season={season}
          region={league.region}
        />
      </div>
      <p className="small text-muted" style={{ marginTop: 16 }}>
        <T k="competitions.scorers.footnote" />
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
        title={<T k="competitions.detail.errors.fixturesTitle" />}
        description={<T k="competitions.detail.errors.fixturesBody" />}
        action={{
          href: `/competitions/${league.slug}?tab=fixtures&season=${season}`,
          label: <T k="competitions.detail.errors.fixturesRetry" />,
        }}
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
  const groups = [...grouped.entries()].map(([key, matches]) => ({
    key,
    matches,
  }));

  return (
    <FixturesView
      league={league}
      season={season}
      months={months}
      groups={groups}
      total={sorted.length}
      filteredCount={filtered.length}
      month={month}
    />
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
  const related = getAllLeagues()
    .filter((item) => item.region === league.region && item.slug !== league.slug)
    .slice(0, 4);

  return (
    <>
      <LeagueHero
        league={league}
        season={season}
        defaultSeason={defaultSeason}
      />

      <LeagueTabs
        active={tab}
        baseHref={`/competitions/${league.slug}`}
        season={season}
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
          <Star size={12} aria-hidden="true" />{" "}
          <T k="competitions.detail.starHint" />
        </span>
        {league.aliases.length > 0 ? (
          <span className="small text-muted">
            <Users size={12} aria-hidden="true" />{" "}
            <T
              k="competitions.detail.alsoKnownAs"
              vars={{ names: league.aliases.slice(0, 3).join(", ") }}
            />
          </span>
        ) : null}
        <Link href="/settings" className="small text-muted">
          <T k="competitions.detail.timesNote" />
        </Link>
      </div>

      <RelatedCompetitions related={related} region={league.region} />
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
