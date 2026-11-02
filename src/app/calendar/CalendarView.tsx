"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Radio,
} from "lucide-react";
import { useMemo } from "react";
import { LocalTime } from "@/components/ui/LocalTime";
import { TeamLogo } from "@/components/ui/Logos";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { buildMonthGrid } from "@/lib/date";
import { cn, formatNumber } from "@/lib/utils";
import type { Match } from "@/lib/types";

interface CalendarViewProps {
  /** Selected month, ISO "YYYY-MM". */
  month: string;
  /** Selected day, ISO "YYYY-MM-DD". */
  selected: string;
  /** Today's ISO date, resolved server-side to keep SSR/hydration aligned. */
  today: string;
  matches: Match[];
  selectedMatches: Match[];
  failed: boolean;
  limited: boolean;
}

function isLive(match: Match): boolean {
  return match.state === "live" || match.state === "halftime";
}

function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return new Date(Date.UTC(year, index + delta, 1)).toISOString().slice(0, 7);
}

function CalendarHero({
  month,
  selected,
  today,
  matches,
  byDate,
  failed,
  limited,
}: {
  month: string;
  selected: string;
  today: string;
  matches: Match[];
  byDate: Map<string, Match[]>;
  failed: boolean;
  limited: boolean;
}) {
  const { t, f, d } = useI18n();

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const monthName = t.calendar.month.names[monthNumber - 1];
  const monthTitle = d.monthTitle(year, monthNumber);
  const liveCount = matches.filter(isLive).length;

  let busiest: { date: string; count: number } | undefined;
  for (const [date, bucket] of byDate) {
    if (!busiest || bucket.length > busiest.count) {
      busiest = { date, count: bucket.length };
    }
  }

  const fixtureCount =
    matches.length === 1
      ? t.calendar.month.counts.fixtureOne
      : f(t.calendar.month.counts.fixtureMany, {
          n: formatNumber(matches.length),
        });
  const dayCount =
    byDate.size === 1
      ? t.calendar.month.counts.dayOne
      : f(t.calendar.month.counts.dayMany, { n: formatNumber(byDate.size) });

  const lede = failed
    ? f(t.calendar.month.ledeFailed, { month: monthTitle })
    : matches.length === 0
      ? f(t.calendar.month.ledeEmpty, { month: monthTitle })
      : f(t.calendar.month.ledeCount, { fixtures: fixtureCount, days: dayCount });

  return (
    <section className="cal-hero" aria-labelledby="cal-title">
      <div className="cal-hero__bar">
        <p className="cal-hero__eyebrow">
          <span className="cal-hero__spark" aria-hidden="true" />
          {t.calendar.month.eyebrow}
        </p>
        <div className="cal-hero__actions">
          <span className="cal-hero__tag">{t.calendar.month.tag}</span>
          <a
            className="cal-hero__action"
            href={`/api/calendar?month=${month}`}
            download
          >
            {t.calendar.month.icsAction} <span className="u-dir-ltr">.ics</span>
            <Download size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="cal-hero__body">
        <div className="cal-hero__intro">
          <h1 className="cal-hero__title" id="cal-title">
            <span className="cal-hero__title-top">{monthName}</span>
            <span className="cal-hero__title-main">{year}</span>
          </h1>
          <p className="cal-hero__lede">{lede}</p>
        </div>

        <div className="cal-hero__focus">
          <p className="cal-hero__focus-label">
            {t.calendar.month.focusLabel}
          </p>
          <p className="cal-hero__focus-date">
            <LocalTime
              date={`${selected}T12:00:00Z`}
              mode="full"
              fallback={selected}
            />
          </p>
          <div className="cal-hero__nav">
            <Link
              href={`/calendar?month=${shiftMonth(month, -1)}`}
              className="cal-hero__arrow"
              aria-label={t.calendar.month.prevMonth}
              title={t.calendar.month.prevMonth}
            >
              <ChevronLeft size={16} aria-hidden="true" data-flip="rtl" />
            </Link>
            <Link
              href={`/calendar?month=${today.slice(0, 7)}&date=${today}`}
              className="cal-hero__today"
            >
              {t.calendar.month.thisMonth}
            </Link>
            <Link
              href={`/calendar?month=${shiftMonth(month, 1)}`}
              className="cal-hero__arrow"
              aria-label={t.calendar.month.nextMonth}
              title={t.calendar.month.nextMonth}
            >
              <ChevronRight size={16} aria-hidden="true" data-flip="rtl" />
            </Link>
          </div>
        </div>
      </div>

      <nav className="cal-months" aria-label={t.calendar.month.monthsNav}>
        {t.calendar.month.names.map((name, index) => {
          const value = `${year}-${String(index + 1).padStart(2, "0")}`;
          const active = index + 1 === monthNumber;
          return (
            <Link
              key={value}
              href={`/calendar?month=${value}`}
              className={cn("cal-month", active && "is-active")}
              aria-current={active ? "page" : undefined}
            >
              <span className="cal-month__short" aria-hidden="true">
                {t.calendar.month.shorts[index]}
              </span>
              <span className="sr-only">{name}</span>
            </Link>
          );
        })}
      </nav>

      <dl className="cal-hero__stats">
        <div className="cal-hero__stat">
          <dt>{t.calendar.month.stats.fixtures}</dt>
          <dd>
            {matches.length ? formatNumber(matches.length) : "—"}
          </dd>
        </div>
        <div className="cal-hero__stat">
          <dt>{t.calendar.month.stats.days}</dt>
          <dd>{byDate.size ? formatNumber(byDate.size) : "—"}</dd>
        </div>
        <div className={cn("cal-hero__stat", liveCount > 0 && "is-live")}>
          <dt>{t.calendar.month.stats.live}</dt>
          <dd>{liveCount ? formatNumber(liveCount) : "0"}</dd>
        </div>
        <div className="cal-hero__stat">
          <dt>{t.calendar.month.stats.busiest}</dt>
          <dd className="cal-hero__stat-date">
            {busiest ? (
              <>
                {d.date(`${busiest.date}T12:00:00Z`, {
                  weekday: "short",
                  month: undefined,
                  year: undefined,
                  timeZone: "UTC",
                })}
                <span className="cal-hero__stat-note">
                  {busiest.count === 1
                    ? t.calendar.month.counts.fixtureOne
                    : f(t.calendar.month.counts.fixtureMany, {
                        n: formatNumber(busiest.count),
                      })}
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {failed ? (
        <p
          className="cal-hero__note cal-hero__note--error"
          role="status"
        >
          {t.calendar.month.failedNote}
        </p>
      ) : limited ? (
        <p
          className="cal-hero__note cal-hero__note--limited"
          role="status"
        >
          {f(t.calendar.month.limitedNote, {
            n: formatNumber(matches.length),
          })}
        </p>
      ) : null}
    </section>
  );
}

function MonthGrid({
  month,
  selected,
  today,
  byDate,
}: {
  month: string;
  selected: string;
  today: string;
  byDate: Map<string, Match[]>;
}) {
  const { t, f, d } = useI18n();

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const days = useMemo(
    () => buildMonthGrid(year, monthNumber),
    [year, monthNumber],
  );
  const monthTitle = d.monthTitle(year, monthNumber);

  return (
    <section className="cal-grid-card" aria-labelledby="cal-grid-title">
      <div className="cal-grid-card__head">
        <div>
          <h2 className="cal-grid-card__title" id="cal-grid-title">
            {monthTitle}
          </h2>
          <p className="cal-grid-card__sub">{t.calendar.month.gridSub}</p>
        </div>
        <div className="cal-grid-card__nav">
          <Link
            href={`/calendar?month=${shiftMonth(month, -1)}`}
            aria-label={t.calendar.month.prevMonth}
            title={t.calendar.month.prevMonth}
          >
            <ChevronLeft size={16} aria-hidden="true" data-flip="rtl" />
          </Link>
          <Link
            href={`/calendar?month=${today.slice(0, 7)}&date=${today}`}
            aria-label={t.calendar.month.jumpToThisMonth}
            title={t.calendar.month.thisMonth}
          >
            <CalendarDays size={15} aria-hidden="true" />
          </Link>
          <Link
            href={`/calendar?month=${shiftMonth(month, 1)}`}
            aria-label={t.calendar.month.nextMonth}
            title={t.calendar.month.nextMonth}
          >
            <ChevronRight size={16} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      </div>

      <div className="cal-weekdays" aria-hidden="true">
        {t.calendar.month.weekdays.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="cal-grid">
        {days.map((day) => {
          const dayMatches = byDate.get(day.date) ?? [];
          const live = dayMatches.some(isLive);
          const classes = cn(
            "cal-day",
            !day.inMonth && "is-outside",
            day.date === today && "is-today",
            day.date === selected && "is-selected",
            live && "is-live",
          );
          const label =
            dayMatches.length === 1
              ? f(live ? t.calendar.day.cellOneLive : t.calendar.day.cellOne, {
                  date: day.date,
                })
              : f(live ? t.calendar.day.cellManyLive : t.calendar.day.cellMany, {
                  date: day.date,
                  n: dayMatches.length,
                });

          return (
            <Link
              key={day.date}
              href={`/calendar?month=${month}&date=${day.date}`}
              className={classes}
              aria-label={label}
              aria-current={day.date === selected ? "date" : undefined}
            >
              <span className="cal-day__num">
                {Number(day.date.slice(8, 10))}
              </span>
              <span className="cal-day__meta">
                {dayMatches.length > 0 ? (
                  <>
                    <span
                      className={cn(
                        "cal-day__dot",
                        live && "cal-day__dot--live",
                      )}
                      aria-hidden="true"
                    />
                    <span className="cal-day__count">{dayMatches.length}</span>
                  </>
                ) : (
                  <span className="cal-day__blank" aria-hidden="true" />
                )}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="cal-legend">
        <span>
          <i className="cal-legend__dot" aria-hidden="true" />{" "}
          {t.calendar.legend.fixtures}
        </span>
        <span>
          <i
            className="cal-legend__dot cal-legend__dot--live"
            aria-hidden="true"
          />{" "}
          {t.calendar.legend.live}
        </span>
        <span>
          <i
            className="cal-legend__dot cal-legend__dot--selected"
            aria-hidden="true"
          />{" "}
          {t.calendar.legend.selected}
        </span>
        <Link href={`/matches?date=${selected}`} className="cal-legend__link">
          {t.calendar.legend.matchCentre}
          <ExternalLink size={12} aria-hidden="true" data-flip="rtl" />
        </Link>
      </div>
    </section>
  );
}

function DayPanel({ date, matches }: { date: string; matches: Match[] }) {
  const { t, f, lang } = useI18n();
  const liveCount = matches.filter(isLive).length;

  return (
    <section className="cal-day-panel" aria-labelledby="cal-day-title">
      <div className="cal-day-panel__head">
        <div>
          <p className="cal-day-panel__eyebrow">
            {t.calendar.day.eyebrow}
            {liveCount > 0 ? (
              <span className="cal-day-panel__live">
                <span aria-hidden="true" />
                {f(t.calendar.day.liveBadge, { n: formatNumber(liveCount) })}
              </span>
            ) : null}
          </p>
          <h2 className="cal-day-panel__title" id="cal-day-title">
            <LocalTime date={`${date}T12:00:00Z`} mode="full" fallback={date} />
          </h2>
        </div>
        <p className="cal-day-panel__count">
          {matches.length === 0
            ? t.calendar.day.none
            : matches.length === 1
              ? t.calendar.month.counts.fixtureOne
              : f(t.calendar.month.counts.fixtureMany, {
                  n: formatNumber(matches.length),
                })}
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="cal-day-panel__empty">
          <CalendarDays size={20} aria-hidden="true" />
          <p className="cal-day-panel__empty-title">
            {t.calendar.day.emptyTitle}
          </p>
          <p className="cal-day-panel__empty-note">
            {t.calendar.day.emptyNote}
          </p>
          <Link href={`/matches?date=${date}`} className="cal-day-panel__link">
            {t.calendar.day.openMatchCentre}
            <ExternalLink size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      ) : (
        <div className="cal-day-panel__list">
          {matches.map((match) => {
            const live = isLive(match);
            return (
              <Link
                key={match.id}
                href={`/match/${match.id}`}
                className={cn("cal-row", live && "is-live")}
              >
                <span className="cal-row__time">
                  {live ? (
                    <>
                      <span className="cal-row__pulse" aria-hidden="true" />
                      {match.clock || t.common.stateShort.live}
                    </>
                  ) : match.state === "finished" ? (
                    t.common.stateShort.finished
                  ) : (
                    <LocalTime
                      date={match.date}
                      mode="time"
                      fallback={t.common.tbc}
                    />
                  )}
                </span>
                <span className="cal-row__main">
                  <span className="cal-row__comp">
                    {leagueDisplayName(
                      {
                        slug: match.league?.slug ?? match.competition.slug,
                        name: match.competition.name,
                      },
                      lang,
                    )}
                  </span>
                  <span className="cal-row__teams">
                    <span className="cal-row__team">
                      <TeamLogo
                        src={match.home.logo}
                        name={match.home.name}
                        size={15}
                      />
                      <span className="cal-row__name">
                        {match.home.shortName || match.home.name}
                      </span>
                      <span className="cal-row__goals">
                        {match.state === "scheduled" ? "" : (match.home.score ?? "–")}
                      </span>
                    </span>
                    <span className="cal-row__team">
                      <TeamLogo
                        src={match.away.logo}
                        name={match.away.name}
                        size={15}
                      />
                      <span className="cal-row__name">
                        {match.away.shortName || match.away.name}
                      </span>
                      <span className="cal-row__goals">
                        {match.state === "scheduled" ? "" : (match.away.score ?? "–")}
                      </span>
                    </span>
                  </span>
                </span>
                <span className="cal-row__arrow" aria-hidden="true">
                  <ChevronRight size={14} data-flip="rtl" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CalendarExport({ month, selected }: { month: string; selected: string }) {
  const { t, f, d } = useI18n();

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));

  return (
    <section className="cal-export" aria-labelledby="cal-export-title">
      <div className="cal-export__head">
        <div>
          <p className="cal-export__eyebrow">{t.calendar.export.eyebrow}</p>
          <h2 className="cal-export__title" id="cal-export-title">
            {t.calendar.export.title}
          </h2>
        </div>
        <Download size={16} aria-hidden="true" />
      </div>
      <div className="cal-export__body">
        <a
          className="cal-export__button cal-export__button--primary"
          href={`/api/calendar?month=${month}`}
          download
        >
          <Download size={16} aria-hidden="true" />
          <span>
            {f(t.calendar.export.monthButton, {
              month: d.monthTitle(year, monthNumber),
            })}
            <small>
              <span className="u-dir-ltr">.ics</span>
              {" · "}
              {t.calendar.export.monthHint}
            </small>
          </span>
        </a>
        <a
          className="cal-export__button"
          href={`/api/calendar?date=${selected}`}
          download
        >
          <Download size={16} aria-hidden="true" />
          <span>
            {t.calendar.export.dayButton}
            <small>
              <span className="u-dir-ltr">.ics</span>
              {" · "}
              <span className="u-dir-ltr">{selected}</span>
            </small>
          </span>
        </a>
        <p className="cal-export__note">{t.calendar.export.note}</p>
        <Link href={`/matches?date=${selected}`} className="cal-export__link">
          <ExternalLink size={14} aria-hidden="true" data-flip="rtl" />
          {t.calendar.export.openInMatchCentre}
        </Link>
      </div>
    </section>
  );
}

function CalendarGuide() {
  const { t } = useI18n();

  return (
    <section className="cal-guide" aria-labelledby="cal-guide-title">
      <div className="cal-guide__head">
        <h2 className="cal-guide__title" id="cal-guide-title">
          {t.calendar.guide.title}
        </h2>
        <Radio size={15} aria-hidden="true" />
      </div>
      <ul className="cal-guide__list">
        {t.calendar.guide.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function CalendarView({
  month,
  selected,
  today,
  matches,
  selectedMatches,
  failed,
  limited,
}: CalendarViewProps) {
  const byDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const match of matches) {
      const key = match.date.slice(0, 10);
      const bucket = map.get(key) ?? [];
      bucket.push(match);
      map.set(key, bucket);
    }
    return map;
  }, [matches]);

  return (
    <div className="cal-page">
      <CalendarHero
        month={month}
        selected={selected}
        today={today}
        matches={matches}
        byDate={byDate}
        failed={failed}
        limited={limited}
      />

      <div className="cal-layout">
        <MonthGrid month={month} selected={selected} today={today} byDate={byDate} />

        <div className="cal-side">
          <DayPanel date={selected} matches={selectedMatches} />
          <CalendarExport month={month} selected={selected} />
        </div>

        <CalendarGuide />
      </div>
    </div>
  );
}
