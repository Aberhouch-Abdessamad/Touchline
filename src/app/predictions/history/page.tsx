import { Suspense } from "react";
import { connection } from "next/server";
import { HistoryView } from "@/components/predictions/HistoryView";
import { ensureFresh } from "@/lib/predictions/maintain";
import { parseHistoryFilter } from "@/lib/predictions/query";
import { getHistory, getSummary } from "@/lib/predictions/stats";
import { PredictionsSkeleton } from "../loading-skeleton";

export const metadata = {
  title: "AI Prediction History",
  description:
    "Archive of every locked Touchline AI prediction next to the actual result, filterable by competition, season, date and outcome.",
  alternates: { canonical: "/predictions/history" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function History({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const filter = parseHistoryFilter((key) => params[key]);
  let history = null;
  let options = { competitions: [] as Array<{ slug: string; name: string; count: number }>, seasons: [] as number[] };
  let failed = false;
  try {
    ensureFresh();
    const [h, s] = await Promise.all([getHistory(filter), getSummary({})]);
    history = h;
    options = s.options;
  } catch (error) {
    console.error("[predictions] history failed:", error);
    failed = true;
  }
  return (
    <HistoryView
      history={history}
      filters={filter}
      status={filter.status ?? "all"}
      options={options}
      failed={failed}
    />
  );
}

export default function HistoryPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <History searchParams={searchParams} />
    </Suspense>
  );
}
