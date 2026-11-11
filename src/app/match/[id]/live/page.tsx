import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/Primitives";
import { getMatchDetails } from "@/lib/api";
import { isTeamId } from "@/lib/validation";
import { LiveAnalyst } from "@/components/soccer/LiveAnalyst";
import type { MatchDetails } from "@/lib/types";

type Params = Promise<{ id: string }>;

export function generateMetadata() {
  return {
    title: "Live match analyst",
    description:
      "Real-time AI reading of an in-play match: who is dominating, live win probabilities, next goal, momentum, tactical notes and the automatic final report.",
  };
}

function LiveSkeleton() {
  return (
    <div className="live-desk" aria-hidden="true">
      <div className="live-head">
        <div className="live-head__top">
          <Skeleton width={130} height={14} />
          <Skeleton width={150} height={26} />
        </div>
        <Skeleton width={210} height={22} />
        <div className="live-head__board" style={{ marginTop: 14 }}>
          <Skeleton width="100%" height={72} />
        </div>
      </div>
      <div className="live-desk__panels">
        {[0, 1, 2].map((row) => (
          <div className="match-panel" key={row}>
            <div style={{ padding: "16px 18px 0" }}>
              <Skeleton width={110} height={13} />
            </div>
            <div style={{ display: "grid", gap: 10, padding: "14px 18px 18px" }}>
              <Skeleton width="100%" height={12} />
              <Skeleton width="82%" height={12} />
              <Skeleton width="64%" height={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function LiveContent({ params }: { params: Params }) {
  await connection();
  const { id } = await params;
  if (!isTeamId(id)) notFound();
  let match: MatchDetails["match"] | null = null;
  try {
    // Only the header is needed server-side (teams, logos, competition); the
    // live document itself is fetched by the dashboard client afterwards, so
    // an upstream hiccup here must not block the desk.
    const details = await getMatchDetails(id);
    match = details?.match ?? null;
  } catch {
    // Transient failure: the desk renders with the client-side header.
  }
  return <LiveAnalyst matchId={id} initial={match} />;
}

export default function LivePage({ params }: { params: Params }) {
  // Route params are request-time data: read them inside the Suspense
  // boundary so the static shell (skeleton) can be served instantly.
  return (
    <Suspense fallback={<LiveSkeleton />}>
      <LiveContent params={params} />
    </Suspense>
  );
}
