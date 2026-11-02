"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { DateJump } from "./DateJump";
import { addDaysISO, parseDateParam, todayISO } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { LOCALE_CONFIG } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";

export interface DayCounts {
  matches: number;
  live: number;
  scheduled: number;
  finished: number;
  competitions: number;
  goals: number;
}

/**
 * Whole-day formatters, pinned to UTC: `date` names a calendar day, so the
 * visible day must not shift with the viewer's timezone the way kick-off
 * times do. Only the language follows the UI locale; digits stay Latin.
 */
function buildFormatters(locale: string) {
  return {
    weekday: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }),
    day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }),
    month: new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }),
    year: new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" }),
    shortWeekday: new Intl.DateTimeFormat(locale, {
      weekday: "short",
      timeZone: "UTC",
    }),
    full: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    number: new Intl.NumberFormat(locale),
  };
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
  const { lang, t, f } = useI18n();
  const { weekday, day, month, year, shortWeekday, full, number } = useMemo(
    () => buildFormatters(LOCALE_CONFIG[lang].intl),
    [lang],
  );

  const value = (count: number | undefined): string =>
    count === undefined ? "—" : number.format(count);

  const today = todayISO();
  const dayDate = parseDateParam(date);
  const weekdayIndex = (dayDate.getUTCDay() + 6) % 7;
  const weekStart = addDaysISO(date, -weekdayIndex);
  const week = Array.from({ length: 7 }, (_, index) =>
    addDaysISO(weekStart, index),
  );

  let lede = t.matches.lede.loading;
  if (error) {
    lede = t.matches.lede.error;
  } else if (counts) {
    lede =
      counts.matches === 0
        ? t.matches.lede.empty
        : f(counts.competitions === 1 ? t.matches.lede.countOne : t.matches.lede.count, {
            matches: value(counts.matches),
            competitions: value(counts.competitions),
          });
  }

  const stats: Array<{
    key: "fixtures" | "live" | "goals" | "competitions";
    count?: number;
    live?: boolean;
  }> = [
    { key: "fixtures", count: counts?.matches },
    { key: "live", count: counts?.live, live: true },
    { key: "goals", count: counts?.goals },
    { key: "competitions", count: counts?.competitions },
  ];

  return (
    <section
      className="mc-hero"
      aria-label={f(t.matches.hero.ariaLabel, { date: full.format(dayDate) })}
    >
      <div className="mc-hero__bar">
        <p className="mc-hero__eyebrow">
          <span className="mc-hero__spark" aria-hidden="true" />
          {t.matches.hero.eyebrow}
        </p>
        <div className="mc-hero__actions">
          <Link className="mc-hero__action" href="/calendar">
            <CalendarDays size={14} aria-hidden="true" />
            {t.matches.hero.calendar}
          </Link>
          {date === today ? (
            <span className="mc-hero__today">{t.common.today}</span>
          ) : (
            <Link className="mc-hero__action is-accent" href="/matches">
              {t.matches.hero.backToToday}
            </Link>
          )}
        </div>
      </div>

      <div className="mc-hero__body">
        <div className="mc-hero__intro">
          <h1 className="mc-hero__title">
            <span className="mc-hero__weekday">{weekday.format(dayDate)}</span>
            <span className="mc-hero__date">
              <span className="mc-hero__daynum">{day.format(dayDate)}</span>
              <span className="mc-hero__month">{month.format(dayDate)}</span>
              <span className="mc-hero__year">{year.format(dayDate)}</span>
            </span>
            <span className="sr-only"> {t.matches.hero.fixturesSuffix}</span>
          </h1>
          <p className="mc-hero__lede">{lede}</p>
        </div>

        <dl className="mc-hero__stats">
          {stats.map((stat) => (
            <div
              key={stat.key}
              className={cn(
                "mc-hero__stat",
                stat.live && (stat.count ?? 0) > 0 && "is-live",
              )}
            >
              <dt>{t.matches.stats[stat.key]}</dt>
              <dd>{value(stat.count)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mc-hero__nav">
        <Link
          href={`/matches?date=${addDaysISO(date, -1)}`}
          className="mc-hero__arrow"
          aria-label={t.matches.dateNav.prev}
          title={t.matches.dateNav.prev}
        >
          <ChevronLeft size={16} aria-hidden="true" data-flip="rtl" />
        </Link>

        <ol className="mc-hero__week">
          {week.map((weekDate) => {
            const active = weekDate === date;
            const valueDate = parseDateParam(weekDate);
            return (
              <li key={weekDate}>
                <Link
                  href={`/matches?date=${weekDate}`}
                  className={cn(
                    "mc-hero__day",
                    active && "is-active",
                    weekDate === today && "is-today",
                  )}
                  aria-current={active ? "date" : undefined}
                  aria-label={f(t.matches.dateNav.weekAria, {
                    date: full.format(valueDate),
                  })}
                >
                  <span className="mc-hero__day-name">
                    {shortWeekday.format(valueDate)}
                  </span>
                  <span className="mc-hero__day-num">
                    {Number(weekDate.slice(8, 10))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <Link
          href={`/matches?date=${addDaysISO(date, 1)}`}
          className="mc-hero__arrow"
          aria-label={t.matches.dateNav.next}
          title={t.matches.dateNav.next}
        >
          <ChevronRight size={16} aria-hidden="true" data-flip="rtl" />
        </Link>

        <div className="mc-hero__jump">
          <DateJump date={date} />
        </div>
      </div>
    </section>
  );
}
