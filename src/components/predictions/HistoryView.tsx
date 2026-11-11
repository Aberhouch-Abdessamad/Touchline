"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/Primitives";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { getHistory, StatsFilter } from "@/lib/predictions/stats";
import { CompetitionBadge, StatusChip, TeamBadge, outcomeLabel, usePct } from "./bits";
import { Filters, type FilterValues } from "./Filters";
import { Hero } from "./Shell";

type History = Awaited<ReturnType<typeof getHistory>>;

const STATUSES = ["all", "correct", "incorrect", "pending"] as const;

export function HistoryView({
  history,
  filters,
  status,
  options,
  failed,
}: {
  history: History | null;
  filters: FilterValues & StatsFilter;
  status: (typeof STATUSES)[number];
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
      if (!value || value === "all") next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <div className="pl-page">
      <Hero eyebrow={P.history.eyebrow} title={P.history.title} lede={P.history.sub} />
      <Filters
        values={filters}
        competitions={options.competitions}
        seasons={options.seasons}
        keep={["status"]}
      />

      <div className="pl-seg" role="tablist" aria-label={P.filters.status}>
        {STATUSES.map((key) => (
          <Link
            key={key}
            role="tab"
            aria-selected={status === key}
            href={hrefFor({ status: key, page: undefined })}
            className={cn("pl-seg__item", status === key && "is-active")}
          >
            {P.history[key]}
          </Link>
        ))}
      </div>

      {failed || !history ? (
        <EmptyState title={P.states.errorTitle} description={P.states.errorBody} />
      ) : history.items.length === 0 ? (
        <EmptyState
          title={P.history.empty.title}
          description={P.history.empty.description}
          action={{ href: "/matches", label: P.history.empty.action }}
        />
      ) : (
        <>
          <p className="pl-count">{f(P.history.showing, { n: history.total })}</p>
          <ul className="pl-list">
            {history.items.map((item) => (
              <li key={item.matchId}>
                <Link href={`/predictions/${item.matchId}`} className="pl-row">
                  <div className="pl-row__meta">
                    <CompetitionBadge
                      name={leagueDisplayName(
                        { slug: item.competition.slug ?? "", name: item.competition.name },
                        lang,
                      )}
                      logo={item.competition.logo}
                      size={18}
                    />
                    {item.kickoff ? (
                      <time dateTime={item.kickoff}>
                        {d.date(item.kickoff, { day: "numeric", month: "short", year: "numeric" })}
                      </time>
                    ) : null}
                  </div>
                  <div className="pl-row__teams">
                    <TeamBadge name={item.home.name} logo={item.home.logo} align="end" />
                    <div className="pl-row__scores">
                      <span className="pl-score pl-score--pred" title={P.history.predicted}>
                        <small>{P.history.predicted}</small>
                        {item.predictedScore.home}–{item.predictedScore.away}
                      </span>
                      <span className="pl-score pl-score--actual" title={P.history.actual}>
                        <small>{P.history.actual}</small>
                        {item.actualScore ? `${item.actualScore.home}–${item.actualScore.away}` : "—"}
                      </span>
                    </div>
                    <TeamBadge name={item.away.name} logo={item.away.logo} />
                  </div>
                  <div className="pl-row__result">
                    <StatusChip status={item.status} />
                    <span className="pl-row__sub">
                      {outcomeLabel(t, item.predictedOutcome)} · {pct(item.confidence * 100, 0)}
                    </span>
                    <span className="pl-row__sub">
                      {item.status === "void" && item.voidReason
                        ? P.voidReasons[item.voidReason as keyof typeof P.voidReasons]
                        : item.marketsEvaluated > 0
                          ? f(P.history.markets, { correct: item.marketsCorrect, evaluated: item.marketsEvaluated })
                          : P.history.noMarkets}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {history.pages > 1 ? (
            <nav className="pl-pager" aria-label={P.history.page.replace("{page}", String(history.page)).replace("{pages}", String(history.pages))}>
              {history.page > 1 ? (
                <Link className="pl-pager__btn" href={hrefFor({ page: String(history.page - 1) })} rel="prev">
                  <ChevronLeft size={16} aria-hidden="true" data-flip="rtl" /> {P.history.previous}
                </Link>
              ) : (
                <span className="pl-pager__btn is-disabled" aria-disabled="true">
                  <ChevronLeft size={16} aria-hidden="true" data-flip="rtl" /> {P.history.previous}
                </span>
              )}
              <span className="pl-pager__info">
                {f(P.history.page, { page: history.page, pages: history.pages })}
              </span>
              {history.page < history.pages ? (
                <Link className="pl-pager__btn" href={hrefFor({ page: String(history.page + 1) })} rel="next">
                  {P.history.next} <ChevronRight size={16} aria-hidden="true" data-flip="rtl" />
                </Link>
              ) : (
                <span className="pl-pager__btn is-disabled" aria-disabled="true">
                  {P.history.next} <ChevronRight size={16} aria-hidden="true" data-flip="rtl" />
                </span>
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
