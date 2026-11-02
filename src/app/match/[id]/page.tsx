import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { RefreshCw } from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { T } from "@/components/i18n/T";
import { getMatchDetails } from "@/lib/api";
import { MatchDetailView } from "./MatchDetailView";
import type { MatchDetails } from "@/lib/types";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = ["summary", "stats", "lineups", "h2h", "form"] as const;
type TabKey = (typeof TABS)[number];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | undefined): TabKey {
  return TABS.includes(value as TabKey) ? (value as TabKey) : "summary";
}

export function generateMetadata() {
  return {
    title: "Match centre",
    description:
      "Live scoreboard, key events, team statistics, lineups, head-to-head record and recent form for a single fixture.",
  };
}

function MatchSkeleton() {
  return (
    <div className="match-page" aria-hidden="true">
      <div className="match-utility">
        <Skeleton width={260} height={12} />
        <Skeleton width={168} height={32} />
      </div>
      <div className="match-board match-board--skeleton">
        <div className="match-board__top">
          <Skeleton width={210} height={14} />
          <Skeleton width={96} height={24} />
        </div>
        <div className="match-board__body">
          <div className="match-board__side">
            <Skeleton width={88} height={88} />
            <Skeleton width={150} height={20} />
            <Skeleton width={100} height={9} />
          </div>
          <div className="match-board__center">
            <Skeleton width={130} height={56} />
            <Skeleton width={160} height={11} />
          </div>
          <div className="match-board__side">
            <Skeleton width={88} height={88} />
            <Skeleton width={150} height={20} />
            <Skeleton width={100} height={9} />
          </div>
        </div>
        <div className="match-board__meta">
          <Skeleton width={260} height={10} />
        </div>
      </div>
      <div className="link-tabs match-tabs">
        <Skeleton width="100%" height={42} />
      </div>
      <div className="match-layout">
        <div className="match-panel">
          <div className="match-panel__head">
            <Skeleton width={120} height={16} />
          </div>
          <div className="match-panel__body" style={{ display: "grid", gap: 16 }}>
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton width="100%" height={13} key={row} />
            ))}
          </div>
        </div>
        <div className="match-panel">
          <div className="match-panel__head">
            <Skeleton width={100} height={16} />
          </div>
          <div className="match-panel__body" style={{ display: "grid", gap: 14 }}>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton width="100%" height={12} key={row} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

async function MatchContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const tab = parseTab(first(query.tab));

  let details: MatchDetails | null = null;
  let failed = false;
  try {
    details = await getMatchDetails(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        icon={<RefreshCw size={22} />}
        title={<T k="matchDetails.errors.loadTitle" />}
        description={<T k="matchDetails.errors.loadDescription" />}
        action={{ href: `/match/${id}`, label: <T k="common.retry" /> }}
      >
        <Link href="/matches" className="btn btn--ghost">
          <T k="matchDetails.errors.backToMatchCentre" />
        </Link>
      </EmptyState>
    );
  }

  if (!details) notFound();

  return <MatchDetailView details={details} tab={tab} />;
}

export default function MatchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<MatchSkeleton />}>
      <MatchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
