import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RefreshCw } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { T } from "@/components/i18n/T";
import { getTeamPage } from "@/lib/api";
import { TeamPageView } from "./TeamPageView";

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
        title={<T k="team.errors.loadTitle" />}
        description={<T k="team.errors.loadDescription" />}
        action={{ href: `/team/${id}`, label: <T k="common.retry" /> }}
      >
        <Link href="/search" className="btn btn--ghost">
          <T k="team.errors.searchTeam" />
        </Link>
      </EmptyState>
    );
  }

  if (!data) notFound();

  return <TeamPageView data={data} />;
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
