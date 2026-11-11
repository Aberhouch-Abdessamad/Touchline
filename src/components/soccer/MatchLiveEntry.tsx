"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  RefreshCw,
  Radio,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { live as liveDict } from "@/lib/i18n/domains/live";
import { cn } from "@/lib/utils";
import type { StoredLive } from "@/lib/analysis/store";
import type { LiveAnalysis, LiveInsight } from "@/lib/ai/live-schema";
import {
  liveDomPct,
  liveErrorMessageKey,
  livePct,
  type LiveCaptureResponse,
  type LiveMatchHeader,
} from "@/components/soccer/liveApi";

/**
 * Compact in-play companion of the AI Live Match Analyst.
 *
 * Shown in the match summary tab while the match is live or at half-time, it
 * keeps the latest stored capture on screen and polls the capture endpoint on
 * the server-suggested cadence (pausing while the tab is hidden), so a viewer
 * who never opens the desk still sees the reading evolve. The analyst never
 * blocks the UI: any capture failure keeps the stored reading visible.
 */
const POLL_FALLBACK_SECONDS = 30;

/** Collapsed statistical explanation; the numbers stay visible above it. */
function Why({ text, label }: { text?: string; label: string }) {
  if (!text) return null;
  return (
    <details className="analysis-why">
      <summary>{label}</summary>
      <p>{text}</p>
    </details>
  );
}

/** One live insight with its event quote (when the insight cites one). */
function Insight({
  insight,
  events,
  labels,
}: {
  insight: LiveInsight;
  events: StoredLive["snapshots"][number]["events"];
  labels: { low: string; medium: string; high: string; stat: string; event: string };
}) {
  const cited = insight.eventRef
    ? events.find((event) => event.index === insight.eventRef)
    : undefined;
  return (
    <li className={cn("live-insight", `live-insight--${insight.impact}`)}>
      <div className="live-insight__head">
        <strong className="live-insight__title">{insight.title}</strong>
        <span className="live-insight__tag">{labels[insight.impact]}</span>
      </div>
      <p className="live-insight__body">{insight.explanation}</p>
      {insight.stat ? (
        <p className="live-insight__ref u-dir-ltr">
          <span className="live-insight__key">{labels.stat}: </span>
          {insight.stat}
        </p>
      ) : null}
      {cited ? (
        <p className="live-insight__ref u-dir-ltr">
          <span className="live-insight__key">{labels.event}: </span>
          {cited.minute ? `${cited.minute} · ` : ""}
          {cited.text}
        </p>
      ) : null}
    </li>
  );
}

export function MatchLiveEntry({
  matchId,
  homeName,
  awayName,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
}) {
  const { lang, f, d } = useI18n();
  const a = useMemo(() => (lang === "ar" ? liveDict.ar : liveDict.en), [lang]);

  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [doc, setDoc] = useState<StoredLive | null>(null);
  const [header, setHeader] = useState<LiveMatchHeader | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  /** Last capture outcome, as a compact note; `finished` ends polling. */
  const [note, setNote] = useState<
    "skipped" | "unchanged" | "finished" | null
  >(null);
  const [pollSeconds, setPollSeconds] = useState(POLL_FALLBACK_SECONDS);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  /** Refs mirror the values the polling loop must read between renders. */
  const mounted = useRef(true);
  const docRef = useRef<StoredLive | null>(null);
  const busyRef = useRef(false);
  const finishedRef = useRef(false);
  const dueRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  /** Filled in after `schedulePoll` is defined; read from `capture`. */
  const scheduleRef = useRef<(delayMs: number) => void>(() => {});
  const langRef = useRef(lang);
  const pollSecondsRef = useRef(pollSeconds);

  useEffect(() => {
    langRef.current = lang;
    pollSecondsRef.current = pollSeconds;
  }, [lang, pollSeconds]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const rememberDoc = useCallback((next: StoredLive | null) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  /**
   * One POST to the capture endpoint. `refresh` forces a capture (manual
   * button); every other call lets the server's trigger policy decide.
   */
  const capture = useCallback(
    async (refresh: boolean) => {
      if (busyRef.current || !mounted.current) return;
      busyRef.current = true;
      setBusy(true);
      const language = langRef.current;
      const query = new URLSearchParams();
      if (refresh) query.set("refresh", "1");
      if (language === "ar") query.set("lang", "ar");
      const queryString = query.toString();

      try {
        const response = await fetch(
          `/api/match/${matchId}/live${queryString ? `?${queryString}` : ""}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ refresh }),
          },
        );
        const payload = (await response.json()) as
          | { data?: LiveCaptureResponse }
          | { error?: { message?: string; status?: number; code?: string } };
        if (!mounted.current) return;
        if (!response.ok) {
          const code = (payload as { error?: { code?: string } }).error?.code;
          setErrorCode(code);
          if (code === "match_not_live") {
            // The match ended mid-poll: stop polling, keep the reading.
            finishedRef.current = true;
            setNote("finished");
          } else if (!docRef.current) {
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: LiveCaptureResponse }).data;
        if (!data) return;

        setHeader(data.match);
        if (data.live) {
          rememberDoc(data.live);
          setStatus("ready");
        } else if (!docRef.current) {
          // Nothing stored and nothing captured: back to the ask screen.
          setStatus("idle");
          setNote("skipped");
          return;
        }
        setErrorCode(undefined);
        setNote(
          data.status === "captured"
            ? null
            : data.status === "unchanged"
              ? "unchanged"
              : "skipped",
        );
        if (data.match.state === "finished") finishedRef.current = true;
        if (data.meta?.pollAfterSeconds) {
          pollSecondsRef.current = data.meta.pollAfterSeconds;
          setPollSeconds(data.meta.pollAfterSeconds);
        }
      } catch {
        // Network hiccup: keep whatever is on screen; the loop retries.
        setErrorCode(undefined);
        if (!docRef.current) setStatus("error");
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
        // Every capture attempt — success or failure — arms the next poll, so
        // a transient error never silently stops the loop.
        if (mounted.current && docRef.current && !finishedRef.current) {
          dueRef.current = Date.now() + pollSecondsRef.current * 1000;
          scheduleRef.current(pollSecondsRef.current * 1000);
        }
      }
    },
    [matchId, rememberDoc],
  );

  const schedulePoll = useCallback(
    (delayMs: number) => {
      const schedule = (ms: number) => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          // A hidden tab must not spend gateway calls; the visibility handler
          // picks the capture back up when the tab is shown again.
          if (document.hidden) {
            schedule(10_000);
            return;
          }
          if (Date.now() >= dueRef.current) void capture(false);
          else schedule(Math.max(dueRef.current - Date.now(), 1_000));
        }, ms);
      };
      schedule(delayMs);
    },
    [capture],
  );

  useEffect(() => {
    scheduleRef.current = schedulePoll;
  }, [schedulePoll]);

  // A previously stored document is shown without spending a gateway call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/match/${matchId}/live${lang === "ar" ? "?lang=ar" : ""}`,
          { cache: "no-store" },
        );
        if (response.status === 404 || cancelled) return;
        const payload = (await response.json()) as {
          data?: {
            live?: StoredLive;
            meta?: { pollAfterSeconds?: number };
          };
        };
        if (!response.ok || cancelled) {
          setErrorCode(undefined);
          setStatus("error");
          return;
        }
        const stored = payload.data?.live;
        if (stored?.version === 1 && stored.kind === "live") {
          rememberDoc(stored);
          setStatus("ready");
          if (payload.data?.meta?.pollAfterSeconds) {
            setPollSeconds(payload.data.meta.pollAfterSeconds);
          }
        }
      } catch {
        // Offline or a route hiccup: keep the idle state so the user can ask.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, lang, rememberDoc]);

  // Polling loop: only while a reading exists, the tab is visible (dueRef
  // checks) and the match has not finished. The server decides the rest.
  useEffect(() => {
    if (status !== "ready" || finishedRef.current) return;
    dueRef.current = Date.now() + pollSeconds * 1000;
    schedulePoll(pollSeconds * 1000);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status, pollSeconds, schedulePoll]);

  // Hidden state is mirrored for the "paused" chip; a due capture runs as
  // soon as the tab reappears.
  useEffect(() => {
    const onVisibility = () => {
      setHidden(document.hidden);
      if (
        !document.hidden &&
        docRef.current &&
        status === "ready" &&
        !finishedRef.current &&
        Date.now() >= dueRef.current
      ) {
        void capture(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [status, capture]);

  const snapshot = doc?.snapshots[doc.snapshots.length - 1];
  const analysis: LiveAnalysis | undefined = snapshot
    ? lang === "ar"
      ? (snapshot.translation?.analysis ?? snapshot.analysis)
      : snapshot.analysis
    : undefined;
  const minuteLabel = header?.minuteLabel ?? snapshot?.minuteLabel ?? "";
  const score = header?.score ?? snapshot?.score;
  const updatedAt = snapshot?.capturedAt;
  /** What produced the reading on screen — the stored snapshot's own trigger. */
  const triggerLabel = snapshot ? a.trigger[snapshot.trigger] : undefined;
  const showNote = note !== null && !errorCode;
  const finishNote = note === "finished";

  return (
    <section
      className="match-panel match-live"
      aria-live="polite"
      aria-busy={busy || hidden}
    >
      <header className="match-panel__head">
        <div className="match-panel__heading">
          <div className="match-panel__kicker">
            <Radio size={13} aria-hidden="true" />
            {a.kicker}
          </div>
          <h2 className="match-panel__title">{a.title}</h2>
        </div>
        <div className="match-panel__meta">
          <span className="analysis-badge">
            <BrainCircuit size={13} aria-hidden="true" />
            {a.badge}
          </span>
          {status === "ready" && doc ? (
            <button
              type="button"
              className="analysis-refresh"
              onClick={() => void capture(true)}
              title={a.refresh}
              aria-label={a.refresh}
              disabled={busy}
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span className="analysis-refresh__label">
                {busy ? a.refreshing : a.refresh}
              </span>
            </button>
          ) : null}
        </div>
      </header>

      {status === "idle" ? (
        <div className="analysis-empty">
          <span className="analysis-empty__icon" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <h3 className="analysis-empty__title">{a.empty.title}</h3>
          <p className="analysis-empty__body">{a.empty.body}</p>
          <button
            type="button"
            className="btn btn--accent analysis-cta"
            onClick={() => {
              setStatus("loading");
              void capture(false);
            }}
          >
            <Activity size={16} aria-hidden="true" />
            {a.empty.action}
          </button>
          <p className="analysis-empty__note">{a.empty.note}</p>
        </div>
      ) : null}

      {status === "loading" ? (
        <div className="analysis-loading">
          <span className="analysis-loading__icon" aria-hidden="true">
            <Activity size={20} />
          </span>
          <div>
            <h3 className="analysis-empty__title">{a.loading.title}</h3>
            <p className="analysis-empty__body">{a.loading.body}</p>
          </div>
          <div className="analysis-loading__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      ) : null}

      {status === "error" && !doc ? (
        <div className="analysis-error">
          <span className="analysis-error__icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <div className="analysis-error__body">
            <h3 className="analysis-empty__title">{a.error.title}</h3>
            <p>{a.error[liveErrorMessageKey(errorCode)]}</p>
          </div>
          <button
            type="button"
            className="btn btn--ghost analysis-cta"
            onClick={() => {
              setStatus("idle");
              void capture(false);
            }}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {a.error.retry}
          </button>
        </div>
      ) : null}

      {status === "ready" && doc && snapshot && analysis && score ? (
        <>
          {showNote ? (
            <div className="live-note" role="status">
              <span>
                {finishNote
                  ? a.error.notLive
                  : note === "unchanged"
                    ? a.aiDegraded
                    : a.captureSkipped}
              </span>
              {finishNote ? (
                <a className="live-note__link" href={`/match/${matchId}`}>
                  {a.dashboard.back}
                  <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
                </a>
              ) : null}
            </div>
          ) : null}
          {errorCode ? (
            <div className="analysis-note live-note" role="status">
              <span>{a.error[liveErrorMessageKey(errorCode)]}</span>
            </div>
          ) : null}

          <div className="live-body">
            <div className="live-statusline">
              <span className="live-pill live-pill--live">
                {snapshot.state === "halftime" ? a.halfTime : a.inPlay}
              </span>
              <span className="live-statusline__score u-dir-ltr">
                {score.home}–{score.away}
              </span>
              {minuteLabel ? (
                <span className="live-statusline__minute u-dir-ltr">
                  {minuteLabel}
                </span>
              ) : null}
              <span className="live-statusline__auto">{a.auto}</span>
            </div>

            {analysis.reliability.insufficientData ? (
              <div className="analysis-warning">
                <AlertTriangle size={15} aria-hidden="true" />
                <div>
                  <strong>{a.reliability.insufficient}</strong>
                </div>
              </div>
            ) : null}

            <div className="analysis-lead">
              <span
                className={cn(
                  "analysis-pill",
                  `analysis-pill--${analysis.reliability.level}`,
                )}
              >
                {a.reliability.label} ·{" "}
                {a.reliability.levels[analysis.reliability.level]}
              </span>
              <p className="analysis-summary">{analysis.overview}</p>
            </div>

            <section className="live-section">
              <span className="analysis-label">{a.dominance.label}</span>
              <div className="live-dom">
                <span className="live-dom__name">
                  {f(a.dominance.home, { team: homeName })}
                </span>
                <div className="live-dom__track" aria-hidden="true">
                  <span
                    className="live-dom__fill live-dom__fill--home"
                    style={{
                      width: `${Math.round(analysis.dominance.homePercent)}%`,
                    }}
                  />
                  <span
                    className="live-dom__fill live-dom__fill--away"
                    style={{
                      width: `${Math.round(analysis.dominance.awayPercent)}%`,
                    }}
                  />
                </div>
                <span className="live-dom__name live-dom__name--away">
                  {f(a.dominance.away, { team: awayName })}
                </span>
              </div>
              <div className="live-dom__values u-dir-ltr">
                <span>{liveDomPct(analysis.dominance.homePercent)}</span>
                <span className="live-dom__hint">{a.dominance.note}</span>
                <span>{liveDomPct(analysis.dominance.awayPercent)}</span>
              </div>
              <Why text={analysis.dominance.reasoning} label={a.why} />
            </section>

            <section className="live-section">
              <div className="live-section__head">
                <span className="analysis-label">{a.probabilities.label}</span>
                <span className="live-tag">{a.probabilities.labelNote}</span>
              </div>
              <div className="analysis-prob-grid">
                {(
                  [
                    {
                      key: "home",
                      label: f(a.probabilities.home, { team: homeName }),
                      value: analysis.probabilities.home,
                    },
                    {
                      key: "draw",
                      label: a.probabilities.draw,
                      value: analysis.probabilities.draw,
                    },
                    {
                      key: "away",
                      label: f(a.probabilities.away, { team: awayName }),
                      value: analysis.probabilities.away,
                    },
                  ] as const
                ).map((bar) => (
                  <div className="analysis-prob" key={bar.key}>
                    <div className="analysis-prob__top">
                      <span className="analysis-prob__label">{bar.label}</span>
                      <span className="analysis-prob__value u-dir-ltr">
                        {livePct(bar.value)}
                      </span>
                    </div>
                    <div className="analysis-prob__track" aria-hidden="true">
                      <span
                        className={cn(
                          "analysis-prob__fill",
                          `analysis-prob__fill--${bar.key}`,
                        )}
                        style={{
                          width: `${Math.max(2, Math.round(bar.value * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Why
                text={analysis.probabilities.changeNote ?? analysis.probabilities.explanation}
                label={analysis.probabilities.changeNote ? a.dashboard.changes.title : a.why}
              />
            </section>

            {analysis.nextGoal.available &&
            analysis.nextGoal.home !== undefined &&
            analysis.nextGoal.away !== undefined &&
            analysis.nextGoal.noMore !== undefined ? (
              <section className="live-section">
                <div className="live-section__head">
                  <span className="analysis-label">{a.nextGoal.label}</span>
                  <span className="live-tag u-dir-ltr">
                    {livePct(analysis.nextGoal.home)} /{" "}
                    {livePct(analysis.nextGoal.away)} /{" "}
                    {livePct(analysis.nextGoal.noMore)}
                  </span>
                </div>
                <Why text={analysis.nextGoal.explanation} label={a.why} />
              </section>
            ) : (
              <div className="live-note">
                <span>{a.nextGoal.unavailable}</span>
              </div>
            )}

            {analysis.insights.length > 0 ? (
              <section className="live-section">
                <span className="analysis-label">{a.insights.label}</span>
                <ul className="live-insights">
                  {analysis.insights.map((insight, index) => (
                    <Insight
                      key={`${insight.title}-${index}`}
                      insight={insight}
                      events={snapshot.events}
                      labels={{
                        low: a.reliability.levels.low,
                        medium: a.reliability.levels.medium,
                        high: a.reliability.levels.high,
                        stat: a.insights.stat,
                        event: a.insights.event,
                      }}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="live-section">
              <span className="analysis-label">{a.risks.label}</span>
              <ul className="live-risks">
                {analysis.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
              <p className="live-section__sub">{a.risks.note}</p>
            </section>
          </div>

          <footer className="live-footer">
            <span className="live-footer__time">
              {updatedAt
                ? f(a.lastUpdate, { time: d.time(updatedAt) })
                : a.auto}
            </span>
            {triggerLabel ? (
              <span className="live-footer__trigger u-dir-ltr">
                {triggerLabel}
              </span>
            ) : null}
            {hidden ? <span className="live-footer__paused">{a.paused}</span> : null}
            <a
              className="live-footer__link"
              href={`/match/${matchId}/live`}
            >
              {a.openDashboard}
              <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
            </a>
          </footer>
        </>
      ) : null}
    </section>
  );
}
