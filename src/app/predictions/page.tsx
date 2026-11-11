import { Suspense } from "react";
import { connection } from "next/server";
import { DashboardView } from "@/components/predictions/DashboardView";
import { ensureFresh } from "@/lib/predictions/maintain";
import { parseStatsFilter } from "@/lib/predictions/query";
import { getSummary, type Summary } from "@/lib/predictions/stats";
import { PredictionsSkeleton } from "./loading-skeleton";

export const metadata = {
  title: "AI Predictions League",
  description:
    "Prediction accuracy and performance of Touchline AI: every pre-kick-off prediction is locked, then checked against the official result.",
  alternates: { canonical: "/predictions" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Dashboard({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const filter = parseStatsFilter((key) => params[key]);
  let summary: Summary | null = null;
  let failed = false;
  try {
    ensureFresh();
    summary = await getSummary(filter);
  } catch (error) {
    console.error("[predictions] dashboard failed:", error);
    failed = true;
  }
  return <DashboardView summary={summary} filters={filter} failed={failed} />;
}

export default function PredictionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
