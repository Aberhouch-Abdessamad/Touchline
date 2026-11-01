import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DateJump } from "./DateJump";
import { addDaysISO, parseDateParam, todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";

export interface DayCounts {
  matches: number;
  live: number;
  scheduled: number;
  finished: number;
  competitions: number;
  goals: number;
}

const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  timeZone: "UTC",
});

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  timeZone: "UTC",
});

const monthFormat = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
});

const yearFormat = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  timeZone: "UTC",
});

const shortWeekdayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "UTC",
});

const fullFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const numberFormat = new Intl.NumberFormat("en-GB");

function value(count: number | undefined): string {
  return count === undefined ? "—" : numberFormat.format(count);
}

/**
 * The match centre masthead. It replaces the usual page header with the day
 * being viewed, the day's tallies and a full week strip, so the page opens on
 * the fixture list rather than on a title and a separate date card.
 */
export function MatchDayHeader({
  date,
  counts,
  error = false,
}: {
  date: string;
  counts?: DayCounts;
  error?: boolean;
}) {
  const today = todayISO();
  const day = parseDateParam(date);
  const weekdayIndex = (day.getUTCDay() + 6) % 7;
  const weekStart = addDaysISO(date, -weekdayIndex);
  const week = Array.from({ length: 7 }, (_, index) =>
    addDaysISO(weekStart, index),
  );

  let lede = "Fixtures are loading for this date.";
  if (error) {
    lede =
      "The scoreboard feed did not respond. The date controls still work, so you can move to another day.";
  } else if (counts) {
    lede =
      counts.matches === 0
        ? "No fixtures are scheduled for this date. Try another day or browse the season calendar."
        : `${value(counts.matches)} fixtures across ${
            counts.competitions
          } ${
            counts.competitions === 1 ? "competition" : "competitions"
          }. Kick-offs are shown in your local time.`;
  }

  const stats: Array<{ label: string; count?: number; live?: boolean }> = [
    { label: "Fixtures", count: counts?.matches },
    { label: "Live now", count: counts?.live, live: true },
    { label: "Goals", count: counts?.goals },
    { label: "Competitions", count: counts?.competitions },
  ];

  return (
    <section
      className="mc-hero"
      aria-label={`Match centre for ${fullFormat.format(day)}`}
    >
      <div className="mc-hero__bar">
        <p className="mc-hero__eyebrow">
          <span className="mc-hero__spark" aria-hidden="true" />
          Match centre
        </p>
        <div className="mc-hero__actions">
          <Link className="mc-hero__action" href="/calendar">
            <CalendarDays size={14} aria-hidden="true" />
            Calendar
          </Link>
          {date === today ? (
            <span className="mc-hero__today">Today</span>
          ) : (
            <Link className="mc-hero__action is-accent" href="/matches">
              Back to today
            </Link>
          )}
        </div>
      </div>

      <div className="mc-hero__body">
        <div className="mc-hero__intro">
          <h1 className="mc-hero__title">
            <span className="mc-hero__weekday">{weekdayFormat.format(day)}</span>
            <span className="mc-hero__date">
              <span className="mc-hero__daynum">{dayFormat.format(day)}</span>
              <span className="mc-hero__month">{monthFormat.format(day)}</span>
              <span className="mc-hero__year">{yearFormat.format(day)}</span>
            </span>
            <span className="sr-only"> fixtures</span>
          </h1>
          <p className="mc-hero__lede">{lede}</p>
        </div>

        <dl className="mc-hero__stats">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={cn(
                "mc-hero__stat",
                stat.live && (stat.count ?? 0) > 0 && "is-live",
              )}
            >
              <dt>{stat.label}</dt>
              <dd>{value(stat.count)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mc-hero__nav">
        <Link
          href={`/matches?date=${addDaysISO(date, -1)}`}
          className="mc-hero__arrow"
          aria-label="Previous day"
          title="Previous day"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>

        <ol className="mc-hero__week">
          {week.map((value) => {
            const active = value === date;
            const valueDate = parseDateParam(value);
            const label = fullFormat.format(valueDate);
            return (
              <li key={value}>
                <Link
                  href={`/matches?date=${value}`}
                  className={cn(
                    "mc-hero__day",
                    active && "is-active",
                    value === today && "is-today",
                  )}
                  aria-current={active ? "date" : undefined}
                  aria-label={`Fixtures for ${label}`}
                >
                  <span className="mc-hero__day-name">
                    {shortWeekdayFormat.format(valueDate)}
                  </span>
                  <span className="mc-hero__day-num">
                    {Number(value.slice(8, 10))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <Link
          href={`/matches?date=${addDaysISO(date, 1)}`}
          className="mc-hero__arrow"
          aria-label="Next day"
          title="Next day"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Link>

        <div className="mc-hero__jump">
          <DateJump date={date} />
        </div>
      </div>
    </section>
  );
}
