import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Radio,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Primitives";
import { LocalTime } from "@/components/ui/LocalTime";
import { TeamLogo } from "@/components/ui/Logos";
import { getMatchesByMonth } from "@/lib/api";
import { buildMonthGrid, formatMonthTitle, todayISO } from "@/lib/date";
import { cn, formatNumber } from "@/lib/utils";
import { isIsoDate, isIsoMonth } from "@/lib/validation";
import type { Match } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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

const shortDayFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  timeZone: "UTC",
});

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function currentMonth(): string {
  return todayISO().slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1;
  return new Date(Date.UTC(year, index + delta, 1)).toISOString().slice(0, 7);
}

function isLive(match: Match): boolean {
  return match.state === "live" || match.state === "halftime";
}

export const metadata = {
  title: "Calendar",
  description:
    "Browse football fixtures by month, open a single day, and export any month or match to Google Calendar, Outlook or an .ics file.",
  alternates: { canonical: "/calendar" },
};

function CalendarHero({
  month,
  selected,
  matches,
  byDate,
  failed,
  limited,
}: {
  month: string;
  selected: string;
  matches: Match[];
  byDate: Map<string, Match[]>;
  failed: boolean;
  limited: boolean;
}) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const monthName = MONTHS[monthNumber - 1];
  const monthTitle = formatMonthTitle(year, monthNumber);
  const liveCount = matches.filter(isLive).length;

  let busiest: { date: string; count: number } | undefined;
  for (const [date, bucket] of byDate) {
    if (!busiest || bucket.length > busiest.count) {
      busiest = { date, count: bucket.length };
    }
  }

  const lede = failed
    ? `The fixture feed did not answer for ${monthTitle}. The grid still works, so you can move to another month or retry.`
    : matches.length === 0
      ? `No fixtures are listed for ${monthTitle} yet. Try the next month, or jump back to today.`
      : `${formatNumber(matches.length)} ${
          matches.length === 1 ? "fixture" : "fixtures"
        } across ${formatNumber(byDate.size)} ${
          byDate.size === 1 ? "day" : "days"
        }, loaded from ESPN's public scoreboard.`;

  return (
    <section className="cal-hero" aria-labelledby="cal-title">
      <div className="cal-hero__bar">
        <p className="cal-hero__eyebrow">
          <span className="cal-hero__spark" aria-hidden="true" />
          Season calendar
        </p>
        <div className="cal-hero__actions">
          <span className="cal-hero__tag">ESPN fixtures</span>
          <a
            className="cal-hero__action"
            href={`/api/calendar?month=${month}`}
            download
          >
            Month .ics
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
          <p className="cal-hero__focus-label">Selected day</p>
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
              aria-label="Previous month"
              title="Previous month"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </Link>
            <Link
              href={`/calendar?month=${currentMonth()}&date=${todayISO()}`}
              className="cal-hero__today"
            >
              This month
            </Link>
            <Link
              href={`/calendar?month=${shiftMonth(month, 1)}`}
              className="cal-hero__arrow"
              aria-label="Next month"
              title="Next month"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <nav className="cal-months" aria-label="Months of the year">
        {MONTHS.map((name, index) => {
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
                {name.slice(0, 3)}
              </span>
              <span className="sr-only">{name}</span>
            </Link>
          );
        })}
      </nav>

      <dl className="cal-hero__stats">
        <div className="cal-hero__stat">
          <dt>Fixtures</dt>
          <dd>{matches.length ? formatNumber(matches.length) : "—"}</dd>
        </div>
        <div className="cal-hero__stat">
          <dt>Active days</dt>
          <dd>{byDate.size ? formatNumber(byDate.size) : "—"}</dd>
        </div>
        <div className={cn("cal-hero__stat", liveCount > 0 && "is-live")}>
          <dt>Live now</dt>
          <dd>{liveCount ? formatNumber(liveCount) : "0"}</dd>
        </div>
        <div className="cal-hero__stat">
          <dt>Busiest day</dt>
          <dd className="cal-hero__stat-date">
            {busiest ? (
              <>
                {shortDayFormat.format(
                  new Date(`${busiest.date}T12:00:00Z`),
                )}
                <span className="cal-hero__stat-note">
                  {formatNumber(busiest.count)}{" "}
                  {busiest.count === 1 ? "fixture" : "fixtures"}
                </span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {failed ? (
        <p className="cal-hero__note cal-hero__note--error" role="status">
          Feed unavailable — showing an empty grid. Pick another month or reload
          to try again.
        </p>
      ) : limited ? (
        <p className="cal-hero__note cal-hero__note--limited" role="status">
          The provider caps a single response, so this month may show the first{" "}
          {formatNumber(matches.length)} fixtures. Daily views in the match
          centre stay complete.
        </p>
      ) : null}
    </section>
  );
}

function MonthGrid({
  month,
  selected,
  byDate,
}: {
  month: string;
  selected: string;
  byDate: Map<string, Match[]>;
}) {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const days = buildMonthGrid(year, monthNumber);
  const today = todayISO();
  const monthTitle = formatMonthTitle(year, monthNumber);

  return (
    <section className="cal-grid-card" aria-labelledby="cal-grid-title">
      <div className="cal-grid-card__head">
        <div>
          <h2 className="cal-grid-card__title" id="cal-grid-title">
            {monthTitle}
          </h2>
          <p className="cal-grid-card__sub">
            Pick a day to see its fixtures. Dots mark days with matches.
          </p>
        </div>
        <div className="cal-grid-card__nav">
          <Link
            href={`/calendar?month=${shiftMonth(month, -1)}`}
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Link>
          <Link
            href={`/calendar?month=${currentMonth()}&date=${today}`}
            aria-label="Jump to this month"
            title="This month"
          >
            <CalendarDays size={15} aria-hidden="true" />
          </Link>
          <Link
            href={`/calendar?month=${shiftMonth(month, 1)}`}
            aria-label="Next month"
            title="Next month"
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
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

          return (
            <Link
              key={day.date}
              href={`/calendar?month=${month}&date=${day.date}`}
              className={classes}
              aria-label={`${day.date}: ${dayMatches.length} ${
                dayMatches.length === 1 ? "match" : "matches"
              }${live ? ", live now" : ""}`}
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
          <i className="cal-legend__dot" aria-hidden="true" /> Fixtures
        </span>
        <span>
          <i className="cal-legend__dot cal-legend__dot--live" aria-hidden="true" />{" "}
          Live now
        </span>
        <span>
          <i className="cal-legend__dot cal-legend__dot--selected" aria-hidden="true" />{" "}
          Selected day
        </span>
        <Link href={`/matches?date=${selected}`} className="cal-legend__link">
          Match centre
          <ExternalLink size={12} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function DayPanel({ date, matches }: { date: string; matches: Match[] }) {
  const liveCount = matches.filter(isLive).length;

  return (
    <section className="cal-day-panel" aria-labelledby="cal-day-title">
      <div className="cal-day-panel__head">
        <div>
          <p className="cal-day-panel__eyebrow">
            Selected day
            {liveCount > 0 ? (
              <span className="cal-day-panel__live">
                <span aria-hidden="true" />
                {liveCount} live
              </span>
            ) : null}
          </p>
          <h2 className="cal-day-panel__title" id="cal-day-title">
            <LocalTime date={`${date}T12:00:00Z`} mode="full" fallback={date} />
          </h2>
        </div>
        <p className="cal-day-panel__count">
          {matches.length === 0
            ? "No fixtures"
            : `${formatNumber(matches.length)} ${
                matches.length === 1 ? "fixture" : "fixtures"
              }`}
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="cal-day-panel__empty">
          <CalendarDays size={20} aria-hidden="true" />
          <p className="cal-day-panel__empty-title">Nothing listed here</p>
          <p className="cal-day-panel__empty-note">
            No fixtures were returned for this day. Pick another date from the
            grid, or open the match centre for live coverage.
          </p>
          <Link href={`/matches?date=${date}`} className="cal-day-panel__link">
            Open the match centre
            <ExternalLink size={13} aria-hidden="true" />
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
                      {match.clock || "LIVE"}
                    </>
                  ) : match.state === "finished" ? (
                    "FT"
                  ) : (
                    <LocalTime date={match.date} mode="time" fallback="TBC" />
                  )}
                </span>
                <span className="cal-row__main">
                  <span className="cal-row__comp">
                    {match.competition.name}
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
                  <ChevronRight size={14} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

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
          <div className="cal-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
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

  const byDate = new Map<string, Match[]>();
  for (const match of matches) {
    const key = match.date.slice(0, 10);
    const bucket = byDate.get(key) ?? [];
    bucket.push(match);
    byDate.set(key, bucket);
  }

  const selectedMatches = (byDate.get(selected) ?? []).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  const monthTitle = formatMonthTitle(year, monthNumber);

  return (
    <div className="cal-page">
      <CalendarHero
        month={month}
        selected={selected}
        matches={matches}
        byDate={byDate}
        failed={failed}
        limited={limited}
      />

      <div className="cal-layout">
        <MonthGrid month={month} selected={selected} byDate={byDate} />

        <div className="cal-side">
          <DayPanel date={selected} matches={selectedMatches} />

          <section className="cal-export" aria-labelledby="cal-export-title">
            <div className="cal-export__head">
              <div>
                <p className="cal-export__eyebrow">Export</p>
                <h2 className="cal-export__title" id="cal-export-title">
                  Take it with you
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
                  Export {monthTitle}
                  <small>.ics · every fixture this month</small>
                </span>
              </a>
              <a
                className="cal-export__button"
                href={`/api/calendar?date=${selected}`}
                download
              >
                <Download size={16} aria-hidden="true" />
                <span>
                  Export the selected day
                  <small>.ics · {selected}</small>
                </span>
              </a>
              <p className="cal-export__note">
                Files use UTC timestamps, so fixtures land at the right moment
                in every timezone. Google Calendar and Outlook both accept the
                same .ics file.
              </p>
              <Link
                href={`/matches?date=${selected}`}
                className="cal-export__link"
              >
                <ExternalLink size={14} aria-hidden="true" />
                Open this day in the match centre
              </Link>
            </div>
          </section>
        </div>

        <section className="cal-guide" aria-labelledby="cal-guide-title">
          <div className="cal-guide__head">
            <h2 className="cal-guide__title" id="cal-guide-title">
              How the calendar works
            </h2>
            <Radio size={15} aria-hidden="true" />
          </div>
          <ul className="cal-guide__list">
            <li>
              Months are loaded from ESPN&apos;s public scoreboard, the same
              feed that powers the match centre.
            </li>
            <li>
              A dot marks a day with fixtures; a red dot means at least one
              match is live.
            </li>
            <li>
              Exports include kick-off time, competition, round and venue where
              the provider supplies them.
            </li>
          </ul>
        </section>
      </div>
    </div>
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
