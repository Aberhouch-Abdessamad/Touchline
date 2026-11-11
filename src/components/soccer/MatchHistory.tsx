"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  History,
  RefreshCw,
  Target,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { analysis as analysisDict } from "@/lib/i18n/domains/analysis";
import { history as historyDict } from "@/lib/i18n/domains/history";
import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/dict";
import type { StoredHistorical } from "@/lib/analysis/store";
import type { Match } from "@/lib/types";
import { errorMessageKey } from "@/components/soccer/MatchAnalysis";

type Status = "idle" | "loading" | "ready" | "error";
type Language = "en" | "ar";

interface ApiErrorPayload {
  error?: { message?: string; code?: string };
}

/** Slugged lookup key: lowercase, letters/digits only ("Possession %" → "possession"). */
function slugKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type StatLabels = Dict["matchDetails"]["stats"]["statLabels"];

/**
 * Friendly label for an ESPN stat, keyed by both the raw stat name and the
 * raw label; falls back to the untouched provider label when unknown.
 * (Mirror of the stats tab logic — kept local so the panel is self-contained.)
 */
function statLabelFor(
  name: string,
  label: string,
  labels: StatLabels,
): string {
  const table = labels as Record<string, string>;
  const candidates = [
    slugKey(name),
    slugKey(label),
    name.trim().toLowerCase(),
    label.trim().toLowerCase(),
  ];
  for (const candidate of candidates) {
    const hit = table[candidate];
    if (hit) return hit;
  }
  return label;
}

/** Numeric reading of a provider display value, or null when not comparable. */
function numericValue(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace("%", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function HistStatRow({
  row,
  labels,
  unavailable,
}: {
  row: StoredHistorical["statistics"]["rows"][number];
  labels: StatLabels;
  unavailable: string;
}) {
  const label = statLabelFor(row.name, row.label, labels);
  const home = row.home.trim() || unavailable;
  const away = row.away.trim() || unavailable;
  const homeValue = numericValue(row.home);
  const awayValue = numericValue(row.away);
  const comparable = homeValue !== null && awayValue !== null;
  const total = comparable ? homeValue + awayValue : 0;
  const homeWidth = comparable
    ? total > 0
      ? Math.round((homeValue / total) * 100)
      : 50
    : 0;

  return (
    <div className="stat-compare__row">
      <div className="stat-compare__values">
        <span className="stat-compare__value u-dir-ltr">{home}</span>
        <span className="stat-compare__label">{label}</span>
        <span className="stat-compare__value stat-compare__value--away u-dir-ltr">
          {away}
        </span>
      </div>
      {comparable ? (
        <div className="stat-compare__track" aria-hidden="true">
          <span
            className="stat-compare__home"
            style={{ width: `${homeWidth}%` }}
          />
          <span
            className="stat-compare__away"
            style={{ width: `${100 - homeWidth}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function HistoryBody({
  stored,
  match,
}: {
  stored: StoredHistorical;
  match: Match;
}) {
  const { t, f, d, lang } = useI18n();
  const h = useMemo(
    () => (lang === "ar" ? historyDict.ar : historyDict.en),
    [lang],
  );
  // The Arabic mirror carries translated text only; its numbers and event
  // references are validated against the English report before persistence.
  const analysis = useMemo(
    () =>
      lang === "ar"
        ? (stored.translation?.analysis ?? stored.analysis)
        : stored.analysis,
    [lang, stored],
  );
  const labels = t.matchDetails.stats.statLabels;

  const notesByRef = useMemo(() => {
    const map = new Map<number, (typeof analysis.timeline)[number]>();
    for (const note of analysis.timeline) map.set(note.eventRef, note);
    return map;
  }, [analysis]);

  const turningPointEvent =
    analysis.whyItEnded.turningPoint !== undefined
      ? stored.facts.events.find(
          (event) => event.index === analysis.whyItEnded.turningPoint?.eventRef,
        )
      : undefined;

  const kindLabel = (kind: (typeof stored.facts.events)[number]["kind"]) =>
    h.kinds[
      {
        goal: "goal",
        "penalty-goal": "penaltyGoal",
        "own-goal": "ownGoal",
        "penalty-missed": "penaltyMissed",
        "yellow-card": "yellowCard",
        "red-card": "redCard",
        var: "var",
      }[kind] as keyof typeof h.kinds
    ];

  const sideName = (side: "home" | "away" | null) =>
    side === "home"
      ? match.home.shortName || match.home.name
      : side === "away"
        ? match.away.shortName || match.away.name
        : undefined;

  return (
    <div className="hist-body">
      {/* ---- Factual header: logos, competition, date, final score ------- */}
      <div className="hist-header">
        <div className="hist-header__team">
          <TeamLogo src={match.home.logo} name={match.home.name} size={34} />
          <span className="hist-header__name">{match.home.shortName}</span>
        </div>
        <div className="hist-header__center">
          <span className="hist-header__score u-dir-ltr">
            {stored.fixture.finalScore.home}–{stored.fixture.finalScore.away}
          </span>
          <span className="hist-header__status">
            {stored.fixture.statusLabel} · {h.finished}
          </span>
          <span className="hist-header__comp">
            {stored.fixture.competition}
            {stored.fixture.round ? ` · ${stored.fixture.round}` : ""}
          </span>
          <LocalTime
            date={stored.fixture.kickoff}
            mode="date"
            className="hist-header__date"
          />
          {stored.fixture.htScore ? (
            <span className="hist-header__ht u-dir-ltr">
              {h.halfTime}: {stored.fixture.htScore.home}–
              {stored.fixture.htScore.away}
            </span>
          ) : null}
        </div>
        <div className="hist-header__team hist-header__team--away">
          <TeamLogo src={match.away.logo} name={match.away.name} size={34} />
          <span className="hist-header__name">{match.away.shortName}</span>
        </div>
      </div>

      {/* ---- Summary + reliability ---------------------------------------- */}
      <section className="hist-section">
        <div className="analysis-lead">
          <span
            className={cn(
              "analysis-pill",
              `analysis-pill--${analysis.reliability.level}`,
            )}
          >
            {h.reliability.label} ·{" "}
            {h.reliability.levels[analysis.reliability.level]}
          </span>
          <h3 className="hist-section__title">{h.summaryTitle}</h3>
          <p className="analysis-summary">{analysis.summary}</p>
        </div>
      </section>

      {/* ---- Why it ended this way ---------------------------------------- */}
      <section className="hist-section">
        <h3 className="hist-section__title">{h.whyTitle}</h3>
        <p className="hist-why">{analysis.whyItEnded.reasoning}</p>
        {analysis.whyItEnded.turningPoint ? (
          <div className="hist-turning">
            <span className="hist-turning__label">
              {h.turningPoint}
              {turningPointEvent ? (
                <span className="hist-turning__ref u-dir-ltr">
                  {" "}
                  · {turningPointEvent.minute}
                </span>
              ) : null}
            </span>
            {turningPointEvent ? (
              <span className="hist-turning__fact u-dir-ltr">
                {turningPointEvent.text}
              </span>
            ) : null}
            <p className="hist-turning__body">
              {analysis.whyItEnded.turningPoint.explanation}
            </p>
          </div>
        ) : null}
      </section>

      {/* ---- Timeline: provider facts painted in code, AI notes beneath -- */}
      <section className="hist-section">
        <div className="hist-section__head">
          <h3 className="hist-section__title">{h.timelineTitle}</h3>
          <span className="hist-section__meta">
            {f(h.substitutions, {
              home: String(stored.facts.substitutions.home),
              away: String(stored.facts.substitutions.away),
            })}
          </span>
        </div>
        {stored.facts.events.length === 0 ? (
          <p className="hist-note">{h.noEvents}</p>
        ) : (
          <ol className="hist-timeline">
            {stored.facts.events.map((event) => {
              const note = notesByRef.get(event.index);
              return (
                <li
                  className={cn(
                    "hist-event",
                    event.side ? `hist-event--${event.side}` : undefined,
                  )}
                  key={`${event.index}-${event.text}`}
                >
                  <div className="hist-event__line">
                    <span className="hist-event__minute u-dir-ltr">
                      {event.minute || "—"}
                    </span>
                    <span
                      className={cn("hist-chip", `hist-chip--${event.kind}`)}
                    >
                      {kindLabel(event.kind)}
                    </span>
                    {event.side ? (
                      <span className="hist-event__side">
                        {sideName(event.side)}
                      </span>
                    ) : null}
                    {event.scoreAfter ? (
                      <span className="hist-event__score u-dir-ltr">
                        {event.scoreAfter.home}–{event.scoreAfter.away}
                      </span>
                    ) : null}
                  </div>
                  <div className="hist-event__main">
                    <span className="hist-event__text u-dir-ltr">
                      {event.text}
                    </span>
                    {note ? (
                      <div className="hist-event__note">
                        <p>{note.description}</p>
                        {note.impact ? (
                          <p className="hist-event__impact">
                            <strong>{h.impact}: </strong>
                            {note.impact}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {!stored.facts.timelineComplete && stored.facts.events.length > 0 ? (
          <p className="hist-note hist-note--warn">{h.timelineIncomplete}</p>
        ) : null}
      </section>

      {/* ---- Statistical comparison --------------------------------------- */}
      <section className="hist-section">
        <h3 className="hist-section__title">{h.statsTitle}</h3>
        {stored.statistics.available && stored.statistics.rows.length > 0 ? (
          <div className="stat-compare hist-stats">
            {stored.statistics.rows.map((row) => (
              <HistStatRow
                key={`${row.name}-${row.label}`}
                row={row}
                labels={labels}
                unavailable={h.unavailable}
              />
            ))}
          </div>
        ) : (
          <p className="hist-note">{h.statUnavailable}</p>
        )}
      </section>

      {/* ---- Tactical breakdown ------------------------------------------- */}
      <section className="hist-section">
        <h3 className="hist-section__title">{h.tacticsTitle}</h3>
        <div className="hist-tactics">
          {(
            [
              { team: match.home, points: analysis.tactics.home },
              { team: match.away, points: analysis.tactics.away },
            ] as const
          ).map(({ team, points }) => (
            <div className="hist-tactics__team" key={team.id}>
              <span className="hist-tactics__name">{team.shortName}</span>
              {points.length > 0 ? (
                <ul>
                  {points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : (
                <p className="hist-note">{h.tacticsUnavailable}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ---- Key match factors -------------------------------------------- */}
      <section className="hist-section">
        <h3 className="hist-section__title">{h.factorsTitle}</h3>
        <ul className="hist-factors">
          {analysis.keyFactors.map((factor) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      </section>

      {/* ---- AI verdict ---------------------------------------------------- */}
      <section className="hist-verdict">
        <span className="hist-verdict__kicker">{h.verdictTitle}</span>
        <h3 className="hist-verdict__headline">
          {analysis.verdict.headline}
        </h3>
        <p className="hist-verdict__body">{analysis.verdict.body}</p>
      </section>

      {/* ---- Provenance ---------------------------------------------------- */}
      <details className="analysis-about">
        <summary>{h.aboutTitle}</summary>
        <div className="analysis-about__body">
          <p>
            <span className="analysis-about__key">{h.reliability.label}: </span>
            {h.reliability.levels[analysis.reliability.level]} —{" "}
            {analysis.reliability.reason}
          </p>
          <p>{h.providerNote}</p>
          <p className="analysis-about__meta u-dir-ltr">
            {f(h.generatedAt, { time: d.dateTime(stored.generatedAt) })} ·{" "}
            {stored.answeredBy}
          </p>
          <p className="analysis-about__disclaimer">{h.disclaimer}</p>
        </div>
      </details>
    </div>
  );
}

export function MatchHistory({ match }: { match: Match }) {
  const { lang } = useI18n();
  const h = useMemo(
    () => (lang === "ar" ? historyDict.ar : historyDict.en),
    [lang],
  );
  const e = useMemo(
    () => (lang === "ar" ? analysisDict.ar : analysisDict.en),
    [lang],
  );
  const [status, setStatus] = useState<Status>("idle");
  const [stored, setStored] = useState<StoredHistorical | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [translating, setTranslating] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const mounted = useRef(true);
  const translationAttempted = useRef<string | null>(null);
  const matchId = match.id;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A previously stored retrospective is shown without spending a gateway call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/match/${matchId}/analysis?kind=past`,
          { cache: "no-store" },
        );
        if (response.status === 404) return;
        const payload = (await response.json()) as
          | { data?: StoredHistorical }
          | ApiErrorPayload;
        if (!response.ok) {
          if (!cancelled) {
            setErrorCode((payload as ApiErrorPayload).error?.code);
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: StoredHistorical }).data;
        if (
          !cancelled &&
          data?.version === 1 &&
          data.kind === "historical"
        ) {
          setStored(data);
          setStatus("ready");
        }
      } catch {
        // Offline or a route hiccup: keep the idle state so the user can ask.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const analyze = useCallback(
    async (refresh: boolean, language?: Language) => {
      const params = new URLSearchParams();
      params.set("kind", "past");
      if (refresh) params.set("refresh", "1");
      if (language === "ar") params.set("lang", "ar");
      // A refresh in Arabic rides in one backend flow (generate + translate),
      // so the finished report arrives already in Arabic with no English
      // flash in between; only the standalone mirror request uses the pill.
      const isTranslation = !refresh && language === "ar";

      if (isTranslation) {
        setTranslating(true);
        setTranslationFailed(false);
      } else {
        setStatus("loading");
        setErrorCode(undefined);
      }

      try {
        const response = await fetch(
          `/api/match/${matchId}/analysis?${params.toString()}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ refresh }),
          },
        );
        const payload = (await response.json()) as
          | { data?: StoredHistorical }
          | ApiErrorPayload;
        if (!response.ok) {
          if (isTranslation) {
            // Keep the English report on screen; the note explains the gap.
            if (mounted.current) {
              setTranslating(false);
              setTranslationFailed(true);
            }
            return;
          }
          if (mounted.current) {
            setErrorCode((payload as ApiErrorPayload).error?.code);
            setStored((current) => current); // keep any previous retrospective
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: StoredHistorical }).data;
        if (!data) throw new Error("Missing retrospective payload");
        if (mounted.current) {
          setStored(data);
          setStatus("ready");
          if (language === "ar") {
            setTranslating(false);
            setTranslationFailed(!data.translation);
          }
        }
      } catch {
        if (mounted.current) {
          if (isTranslation) {
            setTranslating(false);
            setTranslationFailed(true);
          } else {
            setErrorCode(undefined);
            setStatus("error");
          }
        }
      }
    },
    [matchId],
  );

  // Arabic UI with an English-only stored retrospective: ask once for the
  // mirror. The English report stays visible while the translation runs.
  useEffect(() => {
    if (status !== "ready" || !stored) return;
    if (lang !== "ar" || stored.translation) return;
    const key = `${matchId}:${stored.generatedAt}`;
    if (translationAttempted.current === key) return;
    translationAttempted.current = key;
    void analyze(false, "ar");
  }, [lang, status, stored, matchId, analyze]);

  return (
    <section
      className="match-panel match-analysis match-history"
      aria-live="polite"
      aria-busy={translating}
    >
      <header className="match-panel__head">
        <div className="match-panel__heading">
          <div className="match-panel__kicker">{h.kicker}</div>
          <h2 className="match-panel__title">{h.title}</h2>
        </div>
        <div className="match-panel__meta">
          <span className="analysis-badge">
            <BrainCircuit size={13} aria-hidden="true" />
            {h.badge}
          </span>
          {status === "ready" && stored ? (
            <button
              type="button"
              className="analysis-refresh"
              onClick={() =>
                void analyze(true, lang === "ar" ? "ar" : undefined)
              }
              title={h.regenerate}
              aria-label={h.regenerate}
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span className="analysis-refresh__label">{h.regenerate}</span>
            </button>
          ) : null}
        </div>
      </header>

      {translating ? (
        <div className="analysis-translating" role="status">
          <Activity
            size={13}
            aria-hidden="true"
            className="analysis-translating__icon"
          />
          <span>{h.translating}</span>
        </div>
      ) : null}

      {status === "ready" &&
      stored &&
      lang === "ar" &&
      !stored.translation &&
      translationFailed ? (
        <div className="analysis-note analysis-note--action">
          <span>{h.translationUnavailable}</span>
          <button
            type="button"
            className="analysis-note__retry"
            onClick={() => {
              translationAttempted.current = null;
              void analyze(false, "ar");
            }}
          >
            {h.translateRetry}
          </button>
        </div>
      ) : null}

      {status === "idle" ? (
        <div className="analysis-empty">
          <span className="analysis-empty__icon" aria-hidden="true">
            <History size={20} />
          </span>
          <h3 className="analysis-empty__title">{h.empty.title}</h3>
          <p className="analysis-empty__body">{h.empty.body}</p>
          <button
            type="button"
            className="btn btn--accent analysis-cta"
            onClick={() => void analyze(true, lang === "ar" ? "ar" : undefined)}
          >
            <Target size={16} aria-hidden="true" />
            {h.empty.action}
          </button>
          <p className="analysis-empty__note">{h.empty.note}</p>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="analysis-loading">
          <span className="analysis-loading__icon" aria-hidden="true">
            <Activity size={20} />
          </span>
          <div>
            <h3 className="analysis-empty__title">{h.loading.title}</h3>
            <p className="analysis-empty__body">{h.loading.body}</p>
          </div>
          <div className="analysis-loading__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="analysis-error">
          <span className="analysis-error__icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <div className="analysis-error__body">
            <h3 className="analysis-empty__title">{e.error.title}</h3>
            <p>{e.error[errorMessageKey(errorCode)]}</p>
            {stored ? (
              <p className="analysis-error__note">{e.error.cachedFallback}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn--ghost analysis-cta"
            onClick={() =>
              void analyze(Boolean(stored), lang === "ar" ? "ar" : undefined)
            }
          >
            <RefreshCw size={15} aria-hidden="true" />
            {e.error.retry}
          </button>
        </div>
      ) : null}

      {status === "ready" && stored ? (
        <HistoryBody stored={stored} match={match} />
      ) : null}
    </section>
  );
}
