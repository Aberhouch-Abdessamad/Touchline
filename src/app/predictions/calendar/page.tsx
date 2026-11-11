import { Suspense } from "react";
import { connection } from "next/server";
import { CalendarView } from "@/components/predictions/CalendarView";
import { ensureFresh } from "@/lib/predictions/maintain";
import { parseMonthParam, parseStatsFilter } from "@/lib/predictions/query";
import { getCalendar, getHistory, getSummary, type CalendarDay, type HistoryItem } from "@/lib/predictions/stats";
import { isIsoDate } from "@/lib/validation";
import { PredictionsSkeleton } from "../loading-skeleton";

export const metadata = {
  title: "AI Prediction Accuracy Calendar",
  description: "Daily accuracy of Touchline AI predictions. Select a day to inspect its matches.",
  alternates: { canonical: "/predictions/calendar" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Calendar({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const filter = { ...parseStatsFilter((key) => params[key]), from: undefined, to: undefined };
  const month = parseMonthParam(params.month);
  const dayParam = one(params.day);
  const selected = isIsoDate(dayParam) && dayParam.startsWith(month) ? dayParam : null;

  let days: CalendarDay[] = [];
  let dayItems: HistoryItem[] = [];
  let options = { competitions: [] as Array<{ slug: string; name: string; count: number }>, seasons: [] as number[] };
  let failed = false;
  try {
    ensureFresh();
    const [cal, summary] = await Promise.all([getCalendar(month, filter), getSummary({})]);
    days = cal;
    options = summary.options;
    if (selected) {
      const history = await getHistory({ ...filter, from: selected, to: selected, pageSize: 100 });
      dayItems = history.items.filter((item) => item.status !== "void");
    }
  } catch (error) {
    console.error("[predictions] calendar failed:", error);
    failed = true;
  }
  return (
    <CalendarView
      month={month}
      days={days}
      selected={selected}
      dayItems={dayItems}
      filters={filter}
      options={options}
      failed={failed}
    />
  );
}

export default function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PredictionsSkeleton />}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}
