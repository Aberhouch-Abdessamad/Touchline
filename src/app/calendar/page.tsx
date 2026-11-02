import { Suspense } from "react";
import { connection } from "next/server";
import { Skeleton } from "@/components/ui/Primitives";
import { T } from "@/components/i18n/T";
import { getMatchesByMonth } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { isIsoDate, isIsoMonth } from "@/lib/validation";
import type { Match } from "@/lib/types";
import { CalendarView } from "./CalendarView";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Key material only — the skeleton renders no real text.
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonth(): string {
  return todayISO().slice(0, 7);
}

export const metadata = {
  title: "Calendar",
  description:
    "Browse football fixtures by month, open a single day, and export any month or match to Google Calendar, Outlook or an .ics file.",
  alternates: { canonical: "/calendar" },
};

function CalendarSkeleton() {
  return (
    <div className="cal-page" aria-hidden="true">
      <section className="cal-hero cal-hero--skeleton">
        <div className="cal-hero__bar">
          <Skeleton width={130} height={10} />
          <Skeleton width={100} height={26} />
        </div>
        <div className="cal-hero__body">
          <div className="cal-hero__intro">
            <Skeleton width="58%" height={48} />
            <Skeleton width="46%" height={13} className="cal-skel-gap" />
          </div>
          <div className="cal-hero__focus">
            <Skeleton width={78} height={9} />
            <Skeleton width={160} height={18} className="cal-skel-gap" />
            <Skeleton width={150} height={32} className="cal-skel-gap" />
          </div>
        </div>
        <div className="cal-months">
          {MONTHS.map((name) => (
            <div className="cal-month" key={name}>
              <Skeleton width={26} height={24} />
            </div>
          ))}
        </div>
        <div className="cal-hero__stats">
          {[0, 1, 2, 3].map((stat) => (
            <div className="cal-hero__stat" key={stat}>
              <Skeleton width={62} height={8} />
              <Skeleton width={46} height={24} className="cal-skel-gap" />
            </div>
          ))}
        </div>
      </section>

      <div className="cal-layout">
        <section className="cal-grid-card">
          <div className="cal-grid-card__head">
            <Skeleton width={160} height={20} />
            <Skeleton width={102} height={32} />
          </div>
          <div className="cal-weekdays" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <T key={index} k={`calendar.month.weekdays.${index}`} />
            ))}
          </div>
          <div className="cal-grid">
            {Array.from({ length: 42 }).map((_, index) => (
              <div className="cal-day" key={index}>
                <Skeleton width={18} height={16} />
                <Skeleton width={26} height={8} />
              </div>
            ))}
          </div>
        </section>
        <div className="cal-side">
          <section className="cal-day-panel">
            <div className="cal-day-panel__head">
              <Skeleton width={150} height={18} />
              <Skeleton width={54} height={12} />
            </div>
            <div className="cal-day-panel__list">
              {[0, 1, 2, 3].map((row) => (
                <div className="cal-row" key={row}>
                  <Skeleton width={32} height={12} />
                  <div style={{ display: "grid", gap: 7 }}>
                    <Skeleton width="55%" height={8} />
                    <Skeleton width="85%" height={11} />
                    <Skeleton width="75%" height={11} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="cal-export">
            <div className="cal-export__head">
              <Skeleton width={120} height={16} />
            </div>
            <div className="cal-export__body">
              <Skeleton width="100%" height={38} />
              <Skeleton width="100%" height={38} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

async function CalendarContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const requestedMonth = first(params.month);
  const month = isIsoMonth(requestedMonth) ? requestedMonth : currentMonth();

  const today = todayISO();
  const requestedDate = first(params.date);
  const selected =
    isIsoDate(requestedDate) && requestedDate.startsWith(month)
      ? requestedDate
      : today.startsWith(month)
        ? today
        : `${month}-01`;

  let matches: Match[] = [];
  let limited = false;
  let failed = false;

  try {
    const result = await getMatchesByMonth(month);
    matches = result.matches;
    limited = result.limited;
  } catch {
    failed = true;
  }

  const selectedMatches = matches
    .filter((match) => match.date.slice(0, 10) === selected)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <CalendarView
      month={month}
      selected={selected}
      today={today}
      matches={matches}
      selectedMatches={selectedMatches}
      failed={failed}
      limited={limited}
    />
  );
}

export default function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}
