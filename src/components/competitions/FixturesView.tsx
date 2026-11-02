"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/ui/Primitives";
import { MatchRow } from "@/components/soccer/MatchRow";
import { MonthSelect } from "./LeagueFilters";
import { formatNumber } from "@/lib/utils";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { seasonLabel } from "@/lib/date";
import type { League } from "@/data/leagues";
import type { Match } from "@/lib/types";

interface FixtureMonth {
  /** ISO month key, "YYYY-MM". */
  key: string;
  count: number;
}

interface FixtureGroup {
  key: string;
  matches: Match[];
}

/**
 * Client view for a league's season fixtures: month toolbar, grouped month
 * lists and the empty states. The parent server panel owns the fetching,
 * sorting and grouping.
 */
export function FixturesView({
  league,
  season,
  months,
  groups,
  total,
  filteredCount,
  month,
}: {
  league: League;
  season: number;
  months: FixtureMonth[];
  groups: FixtureGroup[];
  total: number;
  filteredCount: number;
  month?: string;
}) {
  const { t, f, d, lang } = useI18n();

  if (total === 0) {
    return (
      <EmptyState
        icon={<CalendarDays size={22} />}
        title={t.competitions.detail.errors.fixturesSeasonTitle}
        description={
          <>
            {t.competitions.detail.errors.fixturesSeasonLead}{" "}
            <span className="u-dir-ltr">{seasonLabel(season, league)}</span>{" "}
            {f(t.competitions.detail.errors.fixturesSeasonTrail, {
              league: leagueDisplayName(league, lang),
            })}
          </>
        }
      />
    );
  }

  return (
    <>
      <div className="fixtures-toolbar">
        <MonthSelect months={months} value={month ?? "all"} />
        <span className="fixtures-count">
          {f(t.competitions.fixtures.count, {
            n: formatNumber(filteredCount),
            total: formatNumber(total),
          })}
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title={t.competitions.fixtures.monthEmptyTitle}
          description={t.competitions.fixtures.monthEmptyBody}
        />
      ) : (
        groups.map((group) => {
          const [year, monthNumber] = group.key.split("-").map(Number);
          return (
            <section className="match-group" key={group.key}>
              <div className="match-group__head">
                <h2 className="match-group__name">
                  {d.monthTitle(year, monthNumber)}
                </h2>
                <span className="small text-muted">
                  {formatNumber(group.matches.length)}{" "}
                  {group.matches.length === 1
                    ? t.competitions.fixtures.groupCountOne
                    : t.competitions.fixtures.groupCountMany}
                </span>
                <Link
                  href={`/calendar?month=${group.key}`}
                  className="match-group__link"
                >
                  {t.competitions.fixtures.calendarView}
                </Link>
              </div>
              <div className="match-list">
                {group.matches.map((match) => (
                  <MatchRow key={match.id} match={match} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <p className="small text-muted" style={{ marginTop: 16 }}>
        {t.competitions.fixtures.kickoffNote}{" "}
        <Link href="/settings">{t.competitions.fixtures.changeTimezone}</Link>
      </p>
    </>
  );
}
