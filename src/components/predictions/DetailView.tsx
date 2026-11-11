"use client";

import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Hero } from "./Shell";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { getDetail } from "@/lib/predictions/stats";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/predictions/types";
import { CompetitionBadge, StatusChip, outcomeLabel, usePct } from "./bits";

type Detail = NonNullable<Awaited<ReturnType<typeof getDetail>>>;

function Prob({ label, value, active }: { label: string; value: number; active: boolean }) {
  const pct = usePct();
  return (
    <div className={cn("pl-prob", active && "is-pick")}>
      <span className="pl-prob__label">{label}</span>
      <span className="pl-prob__bar" aria-hidden="true">
        <span style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="pl-prob__value">{pct(value * 100, 0)}</span>
    </div>
  );
}

export function DetailView({ detail }: { detail: Detail }) {
  const { t, f, lang, d } = useI18n();
  const pct = usePct();
  const P = t.predictions;
  const D = P.detail;
  const { item, ledger, evaluation } = detail;
  const pred = ledger.prediction;
  const picks = ledger.picks;
  const actual = evaluation?.actual;
  const categories = evaluation?.categories ?? {};
  const catLabel = (key: CategoryKey) => P.categories[key];

  const home = item.home.name;
  const away = item.away.name;
  const winnerLabel = (o: typeof picks.outcome) =>
    o === "home" ? home : o === "away" ? away : P.outcomes.draw;

  // Rule-based insight: derived only from stored picks + provider result.
  const judged = CATEGORY_KEYS.filter((k) => {
    const v = categories[k]?.verdict;
    return v === "correct" || v === "incorrect";
  });
  const right = judged.filter((k) => categories[k]?.verdict === "correct");
  const wrong = judged.filter((k) => categories[k]?.verdict === "incorrect");
  const skipped = CATEGORY_KEYS.filter((k) => categories[k]?.verdict === "unavailable");
  const list = (keys: CategoryKey[]) => keys.map(catLabel).join(", ");
  const insight: string[] = [];
  if (judged.length > 0) {
    insight.push(
      right.length === judged.length
        ? D.insight.allCorrect
        : right.length === 0
          ? D.insight.noneCorrect
          : f(D.insight.mixed, { correct: right.length, evaluated: judged.length }),
    );
    if (right.length) insight.push(f(D.insight.right, { list: list(right) }));
    if (wrong.length) insight.push(f(D.insight.wrong, { list: list(wrong) }));
    if (skipped.length) insight.push(f(D.insight.skipped, { list: list(skipped) }));
    if (categories.outcome?.verdict === "correct" && categories.exactScore?.verdict === "incorrect") {
      insight.push(D.insight.winnerNotScore);
    }
    if (categories.exactScore?.verdict === "correct") insight.push(D.insight.scoreNotWinner);
    if (actual && categories.outcome?.verdict === "incorrect" && picks.probabilities[picks.outcome] >= 0.5) {
      insight.push(
        f(D.insight.confidentMiss, {
          pct: Math.round(picks.probabilities[picks.outcome] * 100),
          pick: winnerLabel(picks.outcome),
          actual: actual.outcome === "draw" ? P.outcomes.draw : `${winnerLabel(actual.outcome)}`,
        }),
      );
    }
  }

  return (
    <div className="pl-page">
      <Hero
        eyebrow={D.eyebrow}
        title={
          <>
            {home} <span className="pl-vs">vs</span> {away}
          </>
        }
        lede={
          <span className="pl-hero__meta">
            <CompetitionBadge
              name={leagueDisplayName({ slug: item.competition.slug ?? "", name: item.competition.name }, lang)}
              logo={item.competition.logo}
            />
            {item.kickoff ? (
              <time dateTime={item.kickoff}>
                {d.date(item.kickoff, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
              </time>
            ) : null}
            <StatusChip status={item.status} />
          </span>
        }
      />

      <div className="pl-detail-actions">
        <Link href="/predictions/history" className="pl-back">
          <ArrowLeft size={16} aria-hidden="true" data-flip="rtl" /> {D.back}
        </Link>
        <Link href={`/match/${item.matchId}`} className="pl-back">
          {D.matchCentre} <ArrowUpRight size={16} aria-hidden="true" data-flip="rtl" />
        </Link>
      </div>

      {evaluation?.status === "void" && evaluation.voidReason ? (
        <div className="pl-notice pl-notice--void" role="status">
          <div>
            <strong>{D.voidTitle}</strong>
            <p>{P.voidReasons[evaluation.voidReason]}</p>
          </div>
        </div>
      ) : null}

      {/* 1. Original prediction */}
      <section className="pl-panel pl-panel--ai">
        <header className="pl-panel__head">
          <div>
            <p className="pl-eyebrow">Touchline AI</p>
            <h2 className="pl-panel__title">{D.original}</h2>
            <p className="pl-panel__sub">{D.originalSub}</p>
          </div>
        </header>
        <dl className="pl-meta">
          <div>
            <dt>{D.createdAt}</dt>
            <dd>
              <time dateTime={ledger.recordedAt}>
                {d.date(ledger.recordedAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </time>
            </dd>
          </div>
          <div>
            <dt>{D.source}</dt>
            <dd>{ledger.source === "live" ? D.sourceLive : D.sourceBackfill}</dd>
          </div>
        </dl>

        <div className="pl-detail-grid">
          <div className="pl-box">
            <h3>{D.predictedScore}</h3>
            <p className="pl-bigscore">
              {picks.score.home}–{picks.score.away}
            </p>
            <p className="pl-box__note">{pred.predictedScore.explanation}</p>
          </div>
          <div className="pl-box">
            <h3>{D.probabilities}</h3>
            <Prob label={home} value={picks.probabilities.home} active={picks.outcome === "home"} />
            <Prob label={P.outcomes.draw} value={picks.probabilities.draw} active={picks.outcome === "draw"} />
            <Prob label={away} value={picks.probabilities.away} active={picks.outcome === "away"} />
          </div>
          <div className="pl-box">
            <h3>{D.expectedGoals}</h3>
            <p className="pl-xg">
              <span>{pred.expectedGoals.home.toFixed(2)}</span>
              <small>–</small>
              <span>{pred.expectedGoals.away.toFixed(2)}</span>
            </p>
            <p className="pl-box__note">
              {pred.expectedGoals.total.toFixed(2)} · {pred.expectedGoals.explanation}
            </p>
          </div>
          <div className="pl-box">
            <h3>{D.goalsMarkets}</h3>
            <ul className="pl-kv">
              {picks.over15 ? (
                <li>
                  <span>{P.categories.over15}</span>
                  <b>{f(picks.over15 === "over" ? D.over : D.under, { line: "1.5" })}</b>
                </li>
              ) : null}
              {picks.over25 ? (
                <li>
                  <span>{P.categories.over25}</span>
                  <b>{f(picks.over25 === "over" ? D.over : D.under, { line: "2.5" })}</b>
                </li>
              ) : null}
              <li>
                <span>{D.btts}</span>
                <b>{picks.btts ? (picks.btts === "yes" ? D.yes : D.no) : "—"} · {pct(picks.bttsProbability * 100, 0)}</b>
              </li>
              <li>
                <span>{D.cards}</span>
                <b>
                  {D.yellow} {picks.yellow.toFixed(1)} · {D.red} {picks.red.toFixed(1)}
                </b>
              </li>
            </ul>
          </div>
        </div>

        <div className="pl-prose">
          <h3>{D.explanation}</h3>
          <p>{pred.summary}</p>
          {pred.keyFactors.length ? (
            <>
              <h3>{D.keyFactors}</h3>
              <ul>
                {pred.keyFactors.map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>

      {/* 2. Actual result (facts only) */}
      <section className="pl-panel pl-panel--fact">
        <header className="pl-panel__head">
          <div>
            <p className="pl-eyebrow">ESPN</p>
            <h2 className="pl-panel__title">{D.actualTitle}</h2>
            <p className="pl-panel__sub">{D.actualSub}</p>
          </div>
        </header>
        {!actual ? (
          <p className="pl-empty-note">{D.pendingResult}</p>
        ) : (
          <>
            <div className="pl-detail-grid">
              <div className="pl-box">
                <h3>{D.finalScore}</h3>
                <p className="pl-bigscore">
                  {actual.finalScore.home}–{actual.finalScore.away}
                </p>
              </div>
              <div className="pl-box">
                <h3>{D.actualWinner}</h3>
                <p className="pl-box__strong">{outcomeLabel(t, actual.outcome)}</p>
                <p className="pl-box__note">
                  {D.goals}: {actual.totalGoals}
                </p>
              </div>
              <div className="pl-box">
                <h3>{D.cardsActual}</h3>
                {actual.yellow || actual.red ? (
                  <ul className="pl-kv">
                    <li>
                      <span>{D.yellow}</span>
                      <b>{actual.yellow ? `${actual.yellow.home} + ${actual.yellow.away} = ${actual.yellow.total}` : "—"}</b>
                    </li>
                    <li>
                      <span>{D.red}</span>
                      <b>{actual.red ? `${actual.red.home} + ${actual.red.away} = ${actual.red.total}` : "—"}</b>
                    </li>
                  </ul>
                ) : (
                  <p className="pl-box__note">{D.cardsUnavailable}</p>
                )}
              </div>
            </div>
            <h3 className="pl-subhead">{D.events}</h3>
            {actual.events.length === 0 ? (
              <p className="pl-empty-note">{D.noEvents}</p>
            ) : (
              <ol className="pl-events">
                {actual.events.map((event, i) => (
                  <li key={`${event.minute}-${i}`} className={cn("pl-event", `pl-event--${event.type}`)}>
                    <span className="pl-event__min">{event.minute}</span>
                    <span className="pl-event__text">
                      {event.player ?? ""}
                      {event.side ? ` · ${event.side === "home" ? home : away}` : ""}
                    </span>
                    <span className="pl-event__type">{event.type}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </section>

      {/* 3. Evaluation */}
      {evaluation?.status === "evaluated" ? (
        <section className="pl-panel">
          <header className="pl-panel__head">
            <div>
              <h2 className="pl-panel__title">{D.evaluationTitle}</h2>
              <p className="pl-panel__sub">{D.evaluationSub}</p>
            </div>
          </header>
          <div className="pl-tablewrap">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>{D.market}</th>
                  <th>{D.predictedCol}</th>
                  <th>{D.actualCol}</th>
                  <th>{D.verdictCol}</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_KEYS.map((key) => {
                  const c = categories[key];
                  if (!c) return null;
                  return (
                    <tr key={key}>
                      <td>
                        <strong>{catLabel(key)}</strong>
                      </td>
                      <td>{c.predicted ?? "—"}</td>
                      <td>{c.actual ?? "—"}</td>
                      <td>
                        <StatusChip status={c.verdict} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {/* 4. Insight */}
      {insight.length > 0 ? (
        <section className="pl-panel">
          <header className="pl-panel__head">
            <div>
              <h2 className="pl-panel__title">{D.insightTitle}</h2>
              <p className="pl-panel__sub">{D.insightSub}</p>
            </div>
          </header>
          <ul className="pl-insight">
            {insight.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="pl-attribution">{P.attribution}</p>
    </div>
  );
}
