import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { DateJump } from "./DateJump";
import { addDaysISO, todayISO } from "@/lib/date";

/**
 * Date stepper shared by the match centre and calendar day views. The current
 * date is always passed in from a request-time component.
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
        aria-label="Previous day"
        title="Previous day"
      >
        <ChevronLeft size={17} aria-hidden="true" />
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
          Today
        </Link>
      ) : null}

      <Link
        href={params(addDaysISO(date, 1))}
        className="date-nav__arrow"
        aria-label="Next day"
        title="Next day"
      >
        <ChevronRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}
