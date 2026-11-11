"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock, History, ShieldCheck, Target, Trophy, XCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/Primitives";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Summary } from "@/lib/predictions/stats";
import type { CategoryKey } from "@/lib/predictions/types";
import { AccuracyBar, AccuracyLine, OutcomeDonut } from "./charts";
import { CompetitionBadge, Panel, usePct } from "./bits";
import { Filters, type FilterValues } from "./Filters";
import { Hero } from "./Shell";

function StatCard({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note?: string;
  tone?: "good" | "bad" | "warn" | "accent";
}) {
  return (
    <div className={cn("pl-stat", tone && `pl-stat--${tone}`)}>
      <span className="pl-stat__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="pl-stat__label">{label}</p>
      <p className="pl-stat__value">{value}</p>
      {note ? <p className="pl-stat__note">{note}</p> : null}
    </div>
  );
}

export function DashboardView({
  summary,
  filters,
  failed,
}: {
  summary: Summary | null;
  filters: FilterValues;
  failed: boolean;
}) {
  const { t, f, lang, d } = useI18n();
  const pct = usePct();
  const P = t.predictions;

  if (failed || !summary) {
    return (
      <div className="pl-page">
        <Hero eyebrow={P.kicker} title={P.titleTop} accent={P.titleMain} lede={P.lede} />
        <EmptyState title={P.states.errorTitle} description={P.states.errorBody} />
      </div>
    );
  }

  const o = summary.overview;
  const hasAnything = o.total > 0 || o.excluded > 0;
  const catLabel = (key: CategoryKey) => P.categories[key];

  return (
    <div className="pl-page">
      <Hero
        eyebrow={P.kicker}
        title={P.titleTop}
        accent={P.titleMain}
        lede={P.lede}
        aside={
          <div className="pl-hero__meter">
            <p className="pl-hero__meter-label">{P.stats.overall}</p>
            <p className="pl-hero__meter-value">{pct(o.overallAccuracy)}</p>
            <p className="pl-hero__meter-note">
              {f(P.stats.evaluatedOf, { n: o.evaluated })}
            </p>
            <span className="pl-hero__meter-bar" aria-hidden="true">
              <span style={{ width: `${o.overallAccuracy ?? 0}%` }} />
            </span>
          </div>
        }
      />

      <Filters
        values={filters}
        competitions={summary.options.competitions}
        seasons={summary.options.seasons}
      />

      {!hasAnything ? (
        <EmptyState
          title={P.states.emptyTitle}
          description={P.states.emptyBody}
          action={{ href: "/matches", label: P.states.emptyAction }}
        />
      ) : (
        <>
          {o.evaluated === 0 ? (
            <div className="pl-notice" role="status">
              <Clock size={18} aria-hidden="true" />
              <div>
                <strong>{P.states.noEvaluatedTitle}</strong>
                <p>{f(P.states.noEvaluatedBody, { n: o.total })}</p>
              </div>
            </div>
          ) : null}

          {/* Overall performance cards */}
          <section aria-label={P.overview.title} className="pl-stats">
            <StatCard icon={<Target size={18} />} label={P.stats.total} value={String(o.total)}
              note={o.excluded ? f(P.stats.excluded, { n: o.excluded }) : undefined} />
            <StatCard tone="good" icon={<CheckCircle2 size={18} />} label={P.stats.correct} value={String(o.correct)} />
            <StatCard tone="bad" icon={<XCircle size={18} />} label={P.stats.incorrect} value={String(o.incorrect)} />
            <StatCard tone="warn" icon={<Clock size={18} />} label={P.stats.pending} value={String(o.pending)} />
            <StatCard tone="accent" icon={<ShieldCheck size={18} />} label={P.stats.overall} value={pct(o.overallAccuracy)}
              note={P.stats.overallNote} />
            <StatCard tone="accent" icon={<Target size={18} />} label={P.stats.exact} value={pct(o.exactScoreAccuracy)}
              note={`${P.stats.exactNote} · ${f(P.stats.evaluatedOf, { n: o.exactScoreEvaluated })}`} />
            <StatCard tone="accent" icon={<Trophy size={18} />} label={P.stats.winner} value={pct(o.winnerAccuracy)}
              note={`${P.stats.winnerNote} · ${f(P.stats.evaluatedOf, { n: o.winnerEvaluated })}`} />
          </section>
          <p className="pl-formula">{P.formula}</p>

          {/* Charts */}
          <div className="pl-grid pl-grid--charts">
            <Panel eyebrow={P.overview.eyebrow} title={P.timeline.title} sub={P.timeline.sub}>
              <AccuracyLine points={summary.timeline} />
            </Panel>
            <Panel title={P.split.title} sub={P.split.sub}>
              <OutcomeDonut correct={o.correct} incorrect={o.incorrect} />
            </Panel>
          </div>

          {/* Highlights */}
          <Panel eyebrow={P.highlights.eyebrow} title={P.highlights.title}>
            <div className="pl-highlights">
              <div className="pl-highlight">
                <p className="pl-highlight__label">{P.highlights.bestCompetition}</p>
                {summary.highlights.bestCompetition ? (
                  <>
                    <p className="pl-highlight__value">
                      {leagueDisplayName(
                        { slug: summary.highlights.bestCompetition.slug, name: summary.highlights.bestCompetition.name },
                        lang,
                      )}
                    </p>
                    <p className="pl-highlight__note">
                      {f(P.highlights.of, {
                        pct: summary.highlights.bestCompetition.accuracy.toFixed(1),
                        n: summary.highlights.bestCompetition.evaluated,
                      })}
                    </p>
                  </>
                ) : (
                  <p className="pl-highlight__note">{f(P.highlights.needSample, { n: summary.thresholds.leader })}</p>
                )}
              </div>
              <div className="pl-highlight">
                <p className="pl-highlight__label">{P.highlights.bestCategory}</p>
                {summary.highlights.bestCategory ? (
                  <>
                    <p className="pl-highlight__value">{catLabel(summary.highlights.bestCategory.key)}</p>
                    <p className="pl-highlight__note">
                      {f(P.highlights.of, {
                        pct: summary.highlights.bestCategory.accuracy.toFixed(1),
                        n: summary.highlights.bestCategory.evaluated,
                      })}
                    </p>
                  </>
                ) : (
                  <p className="pl-highlight__note">{f(P.highlights.needSample, { n: summary.thresholds.leader })}</p>
                )}
              </div>
              <div className="pl-highlight">
                <p className="pl-highlight__label">{P.highlights.bestPeriod}</p>
                {summary.highlights.bestPeriod ? (
                  <>
                    <p className="pl-highlight__value">
                      {d.date(`${summary.highlights.bestPeriod.month}-15T12:00:00Z`, { month: "long", year: "numeric", day: undefined })}
                    </p>
                    <p className="pl-highlight__note">
                      {f(P.highlights.of, {
                        pct: summary.highlights.bestPeriod.accuracy.toFixed(1),
                        n: summary.highlights.bestPeriod.evaluated,
                      })}
                    </p>
                  </>
                ) : (
                  <p className="pl-highlight__note">{f(P.highlights.needSampleMonth, { n: summary.highlights.thresholds.period })}</p>
                )}
              </div>
              <div className="pl-highlight">
                <p className="pl-highlight__label">{P.highlights.streak}</p>
                <p className="pl-highlight__value">
                  {summary.highlights.longestStreak}{" "}
                  <small>{P.highlights.streakUnit}</small>
                </p>
                {summary.highlights.currentStreak ? (
                  <p className="pl-highlight__note">
                    {f(
                      summary.highlights.currentStreak.type === "correct"
                        ? P.highlights.currentStreakCorrect
                        : P.highlights.currentStreakIncorrect,
                      { n: summary.highlights.currentStreak.length },
                    )}
                  </p>
                ) : null}
              </div>
              <div className="pl-highlight">
                <p className="pl-highlight__label">{P.highlights.evaluated}</p>
                <p className="pl-highlight__value">{summary.highlights.totalEvaluated}</p>
              </div>
            </div>
          </Panel>

          {/* Breakdown */}
          <Panel eyebrow={P.breakdown.eyebrow} title={P.breakdown.title} sub={P.breakdown.sub}>
            <div className="pl-tablewrap">
              <table className="pl-table">
                <thead>
                  <tr>
                    <th>{P.breakdown.type}</th>
                    <th className="num">{P.breakdown.evaluated}</th>
                    <th className="num">{P.breakdown.correct}</th>
                    <th className="num">{P.breakdown.incorrect}</th>
                    <th>{P.breakdown.accuracy}</th>
                    <th className="num">{P.breakdown.unavailable}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.categories.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <strong>{catLabel(row.key)}</strong>
                        <span className="pl-table__hint">{P.categoryHints[row.key]}</span>
                      </td>
                      <td className="num">{row.evaluated}</td>
                      <td className="num">{row.correct}</td>
                      <td className="num">{row.incorrect}</td>
                      <td>
                        <AccuracyBar value={row.accuracy} muted={!row.reliable} />
                        <span className={cn("pl-sample", row.reliable ? "is-ok" : "is-low")}>
                          {row.evaluated === 0
                            ? ""
                            : row.reliable
                              ? P.breakdown.reliable
                              : P.breakdown.limited}
                          {row.meanAbsoluteError !== null
                            ? ` · ${P.breakdown.mae} ${row.meanAbsoluteError.toFixed(2)}`
                            : ""}
                        </span>
                      </td>
                      <td className="num">{row.unavailable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pl-note">{P.breakdown.unavailableNote}</p>
          </Panel>

          {/* Competition leaderboard */}
          <Panel eyebrow={P.competitions.eyebrow} title={P.competitions.title} sub={P.competitions.sub}>
            {summary.competitions.length === 0 ? (
              <p className="pl-empty-note">
                {f(P.competitions.empty, { min: summary.thresholds.competition })}
              </p>
            ) : (
              <div className="pl-tablewrap">
                <table className="pl-table pl-table--rank">
                  <thead>
                    <tr>
                      <th className="num">{P.competitions.rank}</th>
                      <th>{P.competitions.competition}</th>
                      <th className="num">{P.competitions.predictions}</th>
                      <th className="num">{P.competitions.correct}</th>
                      <th className="num">{P.competitions.incorrect}</th>
                      <th>{P.competitions.accuracy}</th>
                      <th className="num">{P.competitions.exact}</th>
                      <th>{P.competitions.best}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.competitions.map((row, index) => (
                      <tr key={row.slug}>
                        <td className="num">{row.reliable ? index + 1 : "·"}</td>
                        <td>
                          <Link href={`/predictions/history?competition=${row.slug}`} className="pl-comp-link">
                            <CompetitionBadge
                              name={leagueDisplayName({ slug: row.slug, name: row.name }, lang)}
                              logo={row.logo}
                            />
                          </Link>
                          <span className={cn("pl-tag", row.reliable ? "pl-tag--ok" : "pl-tag--low")}>
                            {row.reliable ? P.competitions.reliableTag : P.competitions.emerging}
                          </span>
                        </td>
                        <td className="num">{row.total}</td>
                        <td className="num">{row.correct}</td>
                        <td className="num">{row.incorrect}</td>
                        <td><AccuracyBar value={row.accuracy} muted={!row.reliable} /></td>
                        <td className="num">{pct(row.exactScoreAccuracy)}</td>
                        <td>
                          {row.bestCategory ? (
                            <span className="pl-best">
                              {catLabel(row.bestCategory.key)} <b>{pct(row.bestCategory.accuracy, 0)}</b>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="pl-note">
              {f(P.competitions.reliableNote, { n: summary.thresholds.leader })}
              {summary.hiddenCompetitions > 0
                ? ` ${f(P.competitions.hidden, { n: summary.hiddenCompetitions, min: summary.thresholds.competition })}`
                : ""}
            </p>
          </Panel>

          {/* Confidence analysis */}
          <Panel eyebrow={P.calibration.eyebrow} title={P.calibration.title} sub={P.calibration.sub}>
            {summary.calibration.sample === 0 ? (
              <p className="pl-empty-note">{P.calibration.empty}</p>
            ) : (
              <div className="pl-grid pl-grid--calib">
                <div className="pl-tablewrap">
                  <table className="pl-table">
                    <thead>
                      <tr>
                        <th>{P.calibration.band}</th>
                        <th className="num">{P.calibration.matches}</th>
                        <th>{P.calibration.accuracy}</th>
                        <th className="num">{P.calibration.avgConfidence}</th>
                        <th className="num">{P.calibration.gap}</th>
                        <th className="num">{P.calibration.brier}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.calibration.bins.map((bin) => (
                        <tr key={bin.label}>
                          <td><strong>{bin.label}</strong></td>
                          <td className="num">
                            {bin.count}
                            {bin.count > 0 && bin.count < 10 ? (
                              <span className="pl-sample is-low"> · {P.calibration.small}</span>
                            ) : null}
                          </td>
                          <td><AccuracyBar value={bin.accuracy} muted={bin.count < 10} /></td>
                          <td className="num">{pct(bin.meanConfidence)}</td>
                          <td className="num">
                            {bin.accuracy !== null && bin.meanConfidence !== null
                              ? `${bin.accuracy - bin.meanConfidence > 0 ? "+" : ""}${(bin.accuracy - bin.meanConfidence).toFixed(1)}`
                              : "—"}
                          </td>
                          <td className="num">{bin.brier === null ? "—" : bin.brier.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <aside className="pl-brier">
                  <h3>{P.calibration.brierTitle}</h3>
                  <p>{P.calibration.brierBody}</p>
                  <dl>
                    <div>
                      <dt>{P.calibration.outcomeBrier}</dt>
                      <dd>{summary.calibration.outcomeBrier?.toFixed(3) ?? "—"}</dd>
                      <small>{f(P.calibration.baseline, { n: summary.calibration.outcomeBaseline.toFixed(3) })}</small>
                    </div>
                    <div>
                      <dt>{P.calibration.bttsBrier}</dt>
                      <dd>{summary.calibration.bttsBrier?.toFixed(3) ?? "—"}</dd>
                      <small>{f(P.calibration.baseline, { n: "0.250" })}</small>
                    </div>
                    <div>
                      <dt>{P.calibration.over25Brier}</dt>
                      <dd>{summary.calibration.over25Brier?.toFixed(3) ?? "—"}</dd>
                      <small>{f(P.calibration.baseline, { n: "0.250" })}</small>
                    </div>
                  </dl>
                  <p className="pl-note">{f(P.calibration.sample, { n: summary.calibration.sample })}</p>
                </aside>
              </div>
            )}
          </Panel>

          <div className="pl-cta">
            <Link href="/predictions/history" className="pl-cta__link">
              <History size={18} aria-hidden="true" /> {P.cta.history}
            </Link>
            <Link href="/predictions/calendar" className="pl-cta__link">
              <CalendarDays size={18} aria-hidden="true" /> {P.cta.calendar}
            </Link>
          </div>
        </>
      )}

      <section className="pl-method">
        <h2>{P.method.title}</h2>
        <ul>
          {P.method.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="pl-attribution">{P.attribution}</p>
      </section>
    </div>
  );
}
