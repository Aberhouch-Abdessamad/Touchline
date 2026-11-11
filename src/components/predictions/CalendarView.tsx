"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/Primitives";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CalendarDay, HistoryItem } from "@/lib/predictions/stats";
import { CompetitionBadge, StatusChip, TeamBadge, usePct } from "./bits";
import { Filters, type FilterValues } from "./Filters";
import { Hero } from "./Shell";

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Heat tone from accuracy: 0..4 (none = neutral). */
function tone(day: CalendarDay | undefined): string {
  if (!day || day.total === 0) return "none";
  if (day.accuracy === null) return "pending";
  if (day.accuracy >= 75) return "high";
  if (day.accuracy >= 50) return "mid";
  if (day.accuracy >= 25) return "low";
  return "poor";
}

export function CalendarView({
  month,
  days,
  selected,
  dayItems,
  filters,
  options,
  failed,
}: {
  month: string;
  days: CalendarDay[];
  selected: string | null;
  dayItems: HistoryItem[];
  filters: FilterValues;
  options: { competitions: Array<{ slug: string; name: string; count: number }>; seasons: number[] };
  failed: boolean;
}) {
  const { t, f, lang, d } = useI18n();
  const pct = usePct();
  const P = t.predictions;
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefFor = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  // Monday-first grid.
  const offset = (first.getUTCDay() + 6) % 7;
  const byDate = new Map(days.map((day) => [day.date, day]));
  const cells: Array<string | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const monthLabel = d.date(`${month}-15T12:00:00Z`, { month: "long", year: "numeric", day: undefined });
  const todayMonth = new Date().toISOString().slice(0, 7);
  const selectedDay = selected ? byDate.get(selected) : undefined;

  return (
    <div className="pl-page">
      <Hero eyebrow={P.calendar.eyebrow} title={P.calendar.title} lede={P.calendar.sub} />
      <Filters
        values={filters}
        competitions={options.competitions}
        seasons={options.seasons}
        show={{ category: true, dates: false }}
        keep={["month", "day"]}
      />

      {failed ? (
        <EmptyState title={P.states.errorTitle} description={P.states.errorBody} />
      ) : (
        <div className="pl-grid pl-grid--cal">
          <section className="pl-panel">
            <header className="pl-cal__head">
              <Link
                className="pl-cal__nav"
                href={hrefFor({ month: shiftMonth(month, -1), day: undefined })}
                aria-label={P.calendar.previous}
              >
                <ChevronLeft size={18} aria-hidden="true" data-flip="rtl" />
              </Link>
              <h2 className="pl-cal__title">{monthLabel}</h2>
              <Link
                className="pl-cal__nav"
                href={hrefFor({ month: shiftMonth(month, 1), day: undefined })}
                aria-label={P.calendar.next}
              >
                <ChevronRight size={18} aria-hidden="true" data-flip="rtl" />
              </Link>
              {month !== todayMonth ? (
                <Link className="pl-cal__today" href={hrefFor({ month: undefined, day: undefined })}>
                  {P.calendar.today}
                </Link>
              ) : null}
            </header>

            <div className="pl-cal" role="grid" aria-label={monthLabel}>
              {P.calendar.weekdays.map((w) => (
                <span key={w} className="pl-cal__wd" role="columnheader">
                  {w}
                </span>
              ))}
              {cells.map((date, i) => {
                if (!date) return <span key={`e${i}`} className="pl-cal__cell is-empty" />;
                const day = byDate.get(date);
                const dayNum = Number(date.slice(8));
                const inner = (
                  <>
                    <span className="pl-cal__num">{dayNum}</span>
                    {day ? (
                      <>
                        <span className="pl-cal__acc">{day.accuracy === null ? "·" : pct(day.accuracy, 0)}</span>
                        <span className="pl-cal__count">{day.total}</span>
                      </>
                    ) : null}
                  </>
                );
                return day ? (
                  <Link
                    key={date}
                    role="gridcell"
                    href={hrefFor({ day: date })}
                    aria-current={selected === date ? "date" : undefined}
                    className={cn("pl-cal__cell", `is-${tone(day)}`, selected === date && "is-selected")}
                    aria-label={`${date}: ${day.total} ${P.calendar.predictions}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span key={date} role="gridcell" className="pl-cal__cell is-none">
                    {inner}
                  </span>
                );
              })}
            </div>
            <p className="pl-note">{P.calendar.legend}</p>
          </section>

          <section className="pl-panel pl-day">
            {!selected || !selectedDay ? (
              <p className="pl-empty-note">{selected ? P.calendar.dayEmpty : P.calendar.selectDay}</p>
            ) : (
              <>
                <h2 className="pl-panel__title">
                  {f(P.calendar.dayTitle, {
                    date: d.date(`${selected}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
                  })}
                </h2>
                <p className="pl-panel__sub">
                  {selectedDay.total} {P.calendar.predictions} ·{" "}
                  {f(P.calendar.correctShort, { n: selectedDay.correct })} ·{" "}
                  {f(P.calendar.incorrectShort, { n: selectedDay.incorrect })} · {P.calendar.accuracy}{" "}
                  {pct(selectedDay.accuracy)}
                </p>
                <ul className="pl-list pl-list--compact">
                  {dayItems.map((item) => (
                    <li key={item.matchId}>
                      <Link href={`/predictions/${item.matchId}`} className="pl-row pl-row--compact">
                        <div className="pl-row__teams">
                          <TeamBadge name={item.home.name} logo={item.home.logo} size={22} align="end" />
                          <span className="pl-score pl-score--actual">
                            {item.actualScore ? `${item.actualScore.home}–${item.actualScore.away}` : "—"}
                          </span>
                          <TeamBadge name={item.away.name} logo={item.away.logo} size={22} />
                        </div>
                        <div className="pl-row__result">
                          <CompetitionBadge
                            name={leagueDisplayName({ slug: item.competition.slug ?? "", name: item.competition.name }, lang)}
                            logo={item.competition.logo}
                            size={16}
                          />
                          <StatusChip status={item.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
