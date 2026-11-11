import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { DetailView } from "@/components/predictions/DetailView";
import { ensureFresh } from "@/lib/predictions/maintain";
import { getDetail } from "@/lib/predictions/stats";
import { verifyMatch } from "@/lib/predictions/verify";
import { isTeamId } from "@/lib/validation";
import { PredictionsSkeleton } from "../loading-skeleton";

export const metadata = {
  title: "AI Prediction details",
  description: "A locked Touchline AI prediction compared with the official match result.",
  robots: { index: false },
};

async function Detail({ params }: { params: Promise<{ matchId: string }> }) {
  await connection();
  const { matchId } = await params;
  if (!isTeamId(matchId)) notFound();
  ensureFresh();
  let detail = await getDetail(matchId).catch(() => null);
  if (!detail) notFound();
  // Opportunistic verification when the match has kicked off but is not yet evaluated.
  if (detail.evaluation?.status !== "evaluated" && detail.evaluation?.status !== "void") {
    const kickoff = detail.item.kickoff ? Date.parse(detail.item.kickoff) : NaN;
    if (!Number.isNaN(kickoff) && kickoff < new Date().getTime()) {
      await verifyMatch(matchId).catch(() => undefined);
      detail = (await getDetail(matchId).catch(() => null)) ?? detail;
    }
  }
  return <DetailView detail={detail} />;
}

export default function PredictionDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}
