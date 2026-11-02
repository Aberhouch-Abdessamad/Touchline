import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarX2 } from "lucide-react";
import { MatchDayHeader } from "@/components/soccer/MatchDayHeader";
import { MatchesExplorer } from "@/components/soccer/MatchesExplorer";
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { RefreshTicker } from "@/components/ui/RefreshTicker";
import { T } from "@/components/i18n/T";
import { getAllLeagues, getMatchesByDate } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { isIsoDate } from "@/lib/validation";
import type { Match } from "@/lib/types";

export const metadata = {
  title: "Match centre",
  description:
    "Every football fixture for a chosen day, grouped by competition, with live scores, kick-off times, favourites and results.",
  alternates: { canonical: "/matches" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function MatchesSkeleton() {
  return (
    <div className="mc-page" aria-hidden="true">
      <div className="mc-hero mc-hero--skeleton">
        <div className="mc-hero__bar">
          <Skeleton width={118} height={10} />
          <Skeleton width={168} height={30} />
        </div>
        <div className="mc-hero__body">
          <div className="mc-hero__intro">
            <Skeleton width="min(320px, 80%)" height={54} />
            <Skeleton
              width="min(260px, 70%)"
              height={12}
              className="mc-skel-lede"
            />
          </div>
          <div className="mc-hero__stats">
            {[0, 1, 2, 3].map((stat) => (
              <div className="mc-hero__stat" key={stat}>
                <Skeleton width={52} height={26} />
                <Skeleton width={40} height={8} className="mc-skel-label" />
              </div>
            ))}
          </div>
        </div>
        <div className="mc-hero__nav">
          <Skeleton width="100%" height={42} />
        </div>
      </div>

      <div className="mc-toolbar">
        <Skeleton width={280} height={34} />
        <Skeleton width={220} height={34} className="mc-skel-push" />
      </div>

      <div className="mc-groups mc-groups--skeleton">
        {[0, 1, 2, 3].map((card) => (
          <div className="mc-skel-card" key={card}>
            <Skeleton width={150} height={14} />
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={48} />
          </div>
        ))}
      </div>
    </div>
  );
}

async function MatchesContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const requested = first(params.date);
  const date = isIsoDate(requested) ? requested : todayISO();

  let matches: Match[] = [];
  let failed = false;
  try {
    matches = await getMatchesByDate(date);
  } catch {
    failed = true;
  }

  const live = matches.filter(
    (match) => match.state === "live" || match.state === "halftime",
  ).length;
  const finished = matches.filter((match) => match.state === "finished").length;
  const scheduled = matches.filter((match) => match.state === "scheduled").length;
  const competitions = new Set(
    matches.map(
      (match) =>
        match.league?.slug ?? match.competition.slug ?? match.competition.name,
    ),
  ).size;
  const goals = matches.reduce((total, match) => {
    if (
      match.state !== "live" &&
      match.state !== "halftime" &&
      match.state !== "finished"
    ) {
      return total;
    }
    return (
      total +
      Number(match.home.score ?? 0) +
      Number(match.away.score ?? 0)
    );
  }, 0);

  const counts = {
    matches: matches.length,
    live,
    scheduled,
    finished,
    competitions,
    goals,
  };

  return (
    <>
      <MatchDayHeader
        date={date}
        counts={failed ? undefined : counts}
        error={failed}
      />
      <RefreshTicker intervalMs={live > 0 ? 30_000 : 90_000} />

      {failed ? (
        <EmptyState
          icon={<CalendarX2 size={22} />}
          title={<T k="matches.empty.loadErrorTitle" />}
          description={<T k="matches.empty.loadErrorDescription" />}
          action={{
            href: `/matches?date=${date}`,
            label: <T k="matches.empty.loadErrorAction" />,
          }}
        />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={22} />}
          title={<T k="matches.empty.noFixturesTitle" />}
          description={<T k="matches.empty.noFixturesDescription" />}
          action={{
            href: "/calendar",
            label: <T k="matches.empty.noFixturesAction" />,
          }}
        >
          <Link href="/competitions" className="btn btn--ghost">
            <T k="matches.empty.browseCompetitions" />
          </Link>
        </EmptyState>
      ) : (
        <MatchesExplorer matches={matches} />
      )}

      <T
        as="p"
        k="matches.pageNote"
        vars={{ total: getAllLeagues().length }}
        className="mc-note mc-note--page"
      />
    </>
  );
}

export default function MatchesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="mc-page">
      <Suspense fallback={<MatchesSkeleton />}>
        <MatchesContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
