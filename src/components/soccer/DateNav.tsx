"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { DateJump } from "./DateJump";
import { addDaysISO, todayISO } from "@/lib/date";
import { useI18n } from "@/lib/i18n";

/**
 * Date stepper shared by the match centre and calendar day views. The current
 * date is always passed in from a request-time component. In RTL the arrows
 * mirror via CSS (`data-flip`), the visual order follows `dir`, and the DOM
 * order never changes.
 */
export function DateNav({
  date,
  basePath = "/matches",
  extraParams,
}: {
  date: string;
  basePath?: string;
  extraParams?: Record<string, string>;
}) {
  const { t } = useI18n();
  const params = (target: string) => {
    const query = new URLSearchParams(extraParams);
    query.set("date", target);
    return `${basePath}?${query.toString()}`;
  };
  const today = todayISO();

  return (
    <div className="date-nav">
      <Link
        href={params(addDaysISO(date, -1))}
        className="date-nav__arrow"
        aria-label={t.matches.dateNav.prev}
        title={t.matches.dateNav.prev}
      >
        <ChevronLeft size={17} aria-hidden="true" data-flip="rtl" />
      </Link>

      <div className="date-nav__center">
        <span className="date-nav__label">
          <span className="date-nav__day">
            <LocalTime date={`${date}T12:00:00Z`} mode="weekday" fallback={date} />
          </span>
          <span className="date-nav__full">
            <LocalTime date={`${date}T12:00:00Z`} mode="full" fallback={date} />
          </span>
        </span>
      </div>

      <DateJump date={date} basePath={basePath} />

      {date !== today ? (
        <Link
          href={params(today)}
          className="btn btn--ghost btn--sm date-nav__today"
        >
          {t.common.today}
        </Link>
      ) : null}

      <Link
        href={params(addDaysISO(date, 1))}
        className="date-nav__arrow"
        aria-label={t.matches.dateNav.next}
        title={t.matches.dateNav.next}
      >
        <ChevronRight size={17} aria-hidden="true" data-flip="rtl" />
      </Link>
    </div>
  );
}
