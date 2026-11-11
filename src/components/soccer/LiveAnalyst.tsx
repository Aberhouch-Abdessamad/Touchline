"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Radio,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { live as liveDict } from "@/lib/i18n/domains/live";
import { cn } from "@/lib/utils";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import type { Match } from "@/lib/types";
import type {
  HistoricalEventFact,
  HistoricalEventKind,
} from "@/lib/analysis/retrospective-dataset";
import type {
  LiveFinalReport,
  StoredLive,
  StoredLiveSnapshot,
} from "@/lib/analysis/store";
import type { LiveStatRow } from "@/lib/analysis/live-dataset";
import type { LiveInsight } from "@/lib/ai/live-schema";
import type { HistoricalWinner } from "@/lib/ai/historical-schema";
import {
  liveDomPct,
  liveErrorMessageKey,
  livePct,
  type LiveCaptureResponse,
  type LiveMatchHeader,
  type LiveReadResponse,
} from "@/components/soccer/liveApi";

/**
 * The dedicated AI Live Match Analyst desk at /match/[id]/live.
 *
 * Unlike the compact entry panel, this surface mirrors the entire stored live
 * document: header, overview and reliability, the published statistics,
 * dominance, live probabilities against the pre-match prediction, the next
 * goal estimate, a momentum chart built only from stored captures, insights,
 * tactical reading, the event timeline, the probability trajectory and the
 * deterministic final report. It never blocks on the AI: any capture failure
 * keeps the last stored reading on screen.
 */
type Status = "idle" | "loading" | "ready" | "error";

const POLL_FALLBACK_SECONDS = 30;
/** Snapshots charted on the momentum line and listed in the changes table. */
const TRAJECTORY_WINDOW = 8;

type MomentumMarkerKind = "goal" | "redCard" | "penalty";

interface TimelineRow {
  key: string;
  /** "Pre-match" or the capture's clock label. */
  label: string;
  /** Local capture time, absent on the pre-match row. */
  time?: string;
  score: { home: number; away: number };
  probabilities: { home: number; draw: number; away: number };
  /** Movement since the previous snapshot, in percentage points. */
  delta?: { home: number; draw: number; away: number };
}

/** Collapse a provider event kind onto the dictionary's event label. */
function kindLabel(kind: HistoricalEventKind): keyof (typeof liveDict)["en"]["kinds"] {
  switch (kind) {
    case "penalty-goal":
      return "penaltyGoal";
    case "own-goal":
      return "ownGoal";
    case "penalty-missed":
      return "penaltyMissed";
    case "yellow-card":
      return "yellowCard";
    case "red-card":
      return "redCard";
    case "var":
      return "var";
    default:
      return "goal";
  }
}

function winnerKey(winner: HistoricalWinner): "homeWin" | "draw" | "awayWin" {
  return winner === "home" ? "homeWin" : winner === "away" ? "awayWin" : "draw";
}

/** Signed percentage-point delta, language-neutral ("+3.1" / "-2.4"). */
function deltaText(delta: number): string {
  const value = Math.round(delta * 10) / 10;
  return `${value > 0 ? "+" : ""}${value}`;
}

function teamHeaderOf(team: Match["home"]): LiveMatchHeader["home"] {
  const score = Number.parseInt(team.score ?? "", 10);
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    abbreviation: team.abbreviation,
    logo: team.logo,
    color: team.color,
    score: Number.isFinite(score) ? score : 0,
    record: team.record,
  };
}

/** Map the server-rendered match onto the capture endpoint's header shape. */
function headerFromMatch(match: Match): LiveMatchHeader {
  const home = teamHeaderOf(match.home);
  const away = teamHeaderOf(match.away);
  return {
    id: match.id,
    name: match.name,
    kickoff: match.date,
    state: match.state,
    statusLabel: match.statusLabel,
    competition: match.competition,
    minuteLabel: match.clock ?? "",
    score: { home: home.score, away: away.score },
    home,
    away,
  };
}

function Why({ text, label }: { text?: string; label: string }) {
  if (!text) return null;
  return (
    <details className="analysis-why">
      <summary>{label}</summary>
      <p>{text}</p>
    </details>
  );
}

/** One insight with its statistic and event anchors. */
function Insight({
  insight,
  events,
  labels,
}: {
  insight: LiveInsight;
  events: HistoricalEventFact[];
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

/** One published statistical row as a mirrored bar with verbatim values. */
function StatBar({ row }: { row: LiveStatRow }) {
  const total = row.homeValue + row.awayValue;
  const homeShare = total > 0 ? (row.homeValue / total) * 100 : 50;
  return (
    <li className="live-stat">
      <div className="live-stat__top">
        <span className="live-stat__value u-dir-ltr">{row.home || "0"}</span>
        <span className="live-stat__label">{row.label || row.name}</span>
        <span className="live-stat__value u-dir-ltr">{row.away || "0"}</span>
      </div>
      <div className="live-stat__track" aria-hidden="true">
        <span
          className="live-stat__fill live-stat__fill--home"
          style={{
            width: `${
              row.percent
                ? Math.min(100, Math.max(0, row.homeValue))
                : homeShare
            }%`,
          }}
        />
        <span
          className="live-stat__fill live-stat__fill--away"
          style={{
            width: `${
              row.percent
                ? Math.min(100, Math.max(0, row.awayValue))
                : 100 - homeShare
            }%`,
          }}
        />
      </div>
    </li>
  );
}

/**
 * Momentum chart: one point per stored capture, x on the provider clock (or
 * capture order when the clock is unpublished), y the home dominance share.
 * Markers are derived in code from events that appeared between two captures.
 */
function MomentumChart({
  snapshots,
  momentumNote,
  homeName,
  awayName,
  labels,
}: {
  snapshots: StoredLiveSnapshot[];
  momentumNote?: string;
  homeName: string;
  awayName: string;
  labels: {
    goal: string;
    redCard: string;
    penalty: string;
    empty: string;
    note: string;
  };
}) {
  const charted = useMemo(() => snapshots.slice(-TRAJECTORY_WINDOW), [snapshots]);

  const markers = useMemo(() => {
    const signature = (event: HistoricalEventFact) =>
      `${event.kind}|${event.side ?? ""}|${event.clockValue ?? event.minute}|${event.text}`;
    const bySnapshot = new Map<string, MomentumMarkerKind>();
    for (let i = 1; i < snapshots.length; i += 1) {
      const previous = new Set(snapshots[i - 1].events.map(signature));
      const fresh = snapshots[i].events.filter(
        (event) => !previous.has(signature(event)),
      );
      if (fresh.length === 0) continue;
      const kind: MomentumMarkerKind | undefined = fresh.some(
        (event) => event.kind === "red-card",
      )
        ? "redCard"
        : fresh.some(
              (event) =>
                event.kind === "penalty-goal" || event.kind === "penalty-missed",
            )
          ? "penalty"
          : fresh.some(
                (event) => event.kind === "goal" || event.kind === "own-goal",
              )
            ? "goal"
            : undefined;
      if (kind) bySnapshot.set(snapshots[i].id, kind);
    }
    return bySnapshot;
  }, [snapshots]);

  const hasClock = charted.every(
    (snapshot) => typeof snapshot.clockValue === "number",
  );
  const firstClock = charted[0]?.clockValue ?? 0;
  const clockSpan = hasClock
    ? (charted[charted.length - 1]?.clockValue ?? 0) - firstClock
    : 0;
  const xOf = (snapshot: StoredLiveSnapshot, index: number): number => {
    if (hasClock && clockSpan > 0) {
      return ((snapshot.clockValue ?? 0) - firstClock) / clockSpan * 100;
    }
    if (charted.length === 1) return 50;
    return (index / (charted.length - 1)) * 100;
  };

  if (charted.length < 2) {
    return <p className="live-note">{labels.empty}</p>;
  }

  const points = charted
    .map((snapshot, index) => {
      const x = Math.min(100, Math.max(0, xOf(snapshot, index)));
      const y = Math.min(100, Math.max(0, snapshot.analysis.dominance.homePercent));
      return `${x},${100 - y}`;
    })
    .join(" ");

  return (
    <>
      <div className="live-chart">
        <div className="live-chart__axis" aria-hidden="true">
          <span>{homeName}</span>
          <span>50%</span>
          <span>{awayName}</span>
        </div>
        <div
          className="live-chart__plot"
          role="img"
          aria-label={`${homeName} / ${awayName}`}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1={0} y1={50} x2={100} y2={50} className="live-chart__mid" />
            <polyline points={points} className="live-chart__line" />
          </svg>
          {charted.map((snapshot, index) => (
            <span
              key={snapshot.id}
              className="live-chart__dot"
              style={{
                left: `${Math.min(100, Math.max(0, xOf(snapshot, index)))}%`,
                top: `${100 - snapshot.analysis.dominance.homePercent}%`,
              }}
              title={`${snapshot.minuteLabel} · ${snapshot.score.home}–${snapshot.score.away} · ${liveDomPct(snapshot.analysis.dominance.homePercent)}`}
            />
          ))}
          {charted.map((snapshot, index) => {
            const marker = markers.get(snapshot.id);
            if (!marker) return null;
            return (
              <span
                key={`marker-${snapshot.id}`}
                className={cn("live-chart__marker", `live-chart__marker--${marker}`)}
                style={{ left: `${Math.min(96, Math.max(4, xOf(snapshot, index)))}%` }}
                title={labels[marker]}
              />
            );
          })}
        </div>
      </div>
      <ul className="live-chart__legend">
        <li>
          <span className="live-chart__swatch live-chart__swatch--goal" aria-hidden="true" />
          {labels.goal}
        </li>
        <li>
          <span className="live-chart__swatch live-chart__swatch--redCard" aria-hidden="true" />
          {labels.redCard}
        </li>
        <li>
          <span className="live-chart__swatch live-chart__swatch--penalty" aria-hidden="true" />
          {labels.penalty}
        </li>
      </ul>
      {momentumNote ? <p className="live-chart__momentum">{momentumNote}</p> : null}
      <p className="live-section__sub">{labels.note}</p>
    </>
  );
}

/** Published event timeline of the latest capture. */
function EventList({
  events,
  timelineComplete,
  labels,
  kinds,
}: {
  events: HistoricalEventFact[];
  timelineComplete: boolean;
  labels: { title: string; empty: string; minute: string; timelineIncomplete: string };
  kinds: (typeof liveDict)["en"]["kinds"];
}) {
  if (events.length === 0) {
    return <p className="live-note">{labels.empty}</p>;
  }
  return (
    <>
      <ol className="live-events">
        {events.map((event) => (
          <li key={event.index} className={cn("live-event", `live-event--${event.kind}`)}>
            <span className="live-event__minute u-dir-ltr">{event.minute}</span>
            <span className="live-event__body">
              <span className="live-event__kind">
                {kinds[kindLabel(event.kind)]}
                {event.scoreAfter ? (
                  <span className="live-event__score u-dir-ltr">
                    {event.scoreAfter.home}–{event.scoreAfter.away}
                  </span>
                ) : null}
              </span>
              <span className="live-event__text">{event.text}</span>
            </span>
          </li>
        ))}
      </ol>
      {!timelineComplete ? (
        <p className="hist-note hist-note--warn">{labels.timelineIncomplete}</p>
      ) : null}
    </>
  );
}

/** Deterministic final report, computed in code after the final whistle. */
function FinalReport({
  report,
  homeName,
  awayName,
  finalLabels,
  kinds,
}: {
  report: LiveFinalReport;
  homeName: string;
  awayName: string;
  finalLabels: (typeof liveDict)["en"]["dashboard"]["final"];
  kinds: (typeof liveDict)["en"]["kinds"];
}) {
  const { f } = useI18n();
  const swingText = (swing: { min: number; max: number; range: number }) =>
    `${Math.round(swing.min * 100)}–${Math.round(swing.max * 100)}% (±${(
      swing.range * 100
    ).toFixed(1)})`;
  const outcomeLabel = (winner: HistoricalWinner) =>
    winner === "even"
      ? finalLabels.draw
      : f(finalLabels[winnerKey(winner)], {
          team: winner === "home" ? homeName : awayName,
        });

  return (
    <div className="live-final">
      <div className="live-final__facts">
        <div className="live-final__fact">
          <span className="analysis-label">{finalLabels.finalScore}</span>
          <span className="live-final__value u-dir-ltr">
            {report.finalScore.home}–{report.finalScore.away}
          </span>
        </div>
        <div className="live-final__fact">
          <span className="analysis-label">{finalLabels.htScore}</span>
          <span className="live-final__value u-dir-ltr">
            {report.htScore
              ? `${report.htScore.home}–${report.htScore.away}`
              : finalLabels.notAvailable}
          </span>
        </div>
        <div className="live-final__fact">
          <span className="analysis-label">{finalLabels.winner}</span>
          <span className="live-final__value">{outcomeLabel(report.winner)}</span>
        </div>
      </div>

      <div className="live-final__block">
        <span className="analysis-label">{finalLabels.accuracyTitle}</span>
        <dl className="live-final__accuracy">
          <div>
            <dt>{finalLabels.samples}</dt>
            <dd className="u-dir-ltr">{report.accuracy.samples}</dd>
          </div>
          <div>
            <dt>{finalLabels.argmaxHits}</dt>
            <dd className="u-dir-ltr">{report.accuracy.argmaxHits}</dd>
          </div>
          <div>
            <dt>{finalLabels.argmaxAccuracy}</dt>
            <dd className="u-dir-ltr">{livePct(report.accuracy.argmaxAccuracy)}</dd>
          </div>
          <div>
            <dt>{finalLabels.brier}</dt>
            <dd className="u-dir-ltr">{report.accuracy.brier.toFixed(2)}</dd>
          </div>
          <div>
            <dt>{finalLabels.meanActual}</dt>
            <dd className="u-dir-ltr">
              {livePct(report.accuracy.meanActualProbability)}
            </dd>
          </div>
        </dl>
        <p className="live-final__note">{finalLabels.brierNote}</p>
      </div>

      <div className="live-final__block">
        <span className="analysis-label">{finalLabels.preMatchTitle}</span>
        {report.preMatch ? (
          <>
            <div className="live-final__prematch">
              <div>
                <span className="live-final__key">{finalLabels.predictedScore}</span>
                <span className="u-dir-ltr">
                  {report.preMatch.predictedScore.home}–
                  {report.preMatch.predictedScore.away}
                </span>
              </div>
              <div>
                <span className="live-final__key">
                  {finalLabels.predictedOutcome}
                </span>
                <span>{outcomeLabel(report.preMatch.predictedOutcome)}</span>
              </div>
              <div>
                <span className="live-final__key">{finalLabels.exactScore}</span>
                <span>
                  {report.preMatch.exactScore
                    ? finalLabels.exactScoreYes
                    : finalLabels.exactScoreNo}
                </span>
              </div>
            </div>
            <p className="live-final__verdict">
              {report.preMatch.outcomePickCorrect
                ? finalLabels.outcomeCorrect
                : finalLabels.outcomeWrong}
            </p>
          </>
        ) : (
          <p className="live-final__note">{finalLabels.noPreMatch}</p>
        )}
      </div>

      <div className="live-final__block">
        <span className="analysis-label">{finalLabels.swings}</span>
        <ul className="live-final__swings">
          <li>
            <span>{finalLabels.swingHome.replace("{team}", homeName)}</span>
            <span className="u-dir-ltr">{swingText(report.swings.home)}</span>
          </li>
          <li>
            <span>{finalLabels.swingDraw}</span>
            <span className="u-dir-ltr">{swingText(report.swings.draw)}</span>
          </li>
          <li>
            <span>{finalLabels.swingAway.replace("{team}", awayName)}</span>
            <span className="u-dir-ltr">{swingText(report.swings.away)}</span>
          </li>
        </ul>
      </div>

      {report.keyEvents.length > 0 ? (
        <div className="live-final__block">
          <span className="analysis-label">{finalLabels.keyEvents}</span>
          <ul className="live-final__events">
            {report.keyEvents.slice(0, 8).map((event) => (
              <li key={event.index}>
                <span className="live-final__minute u-dir-ltr">{event.minute}</span>
                <span className="live-final__kind">{kinds[kindLabel(event.kind)]}</span>
                <span>{event.text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Probability trajectory: the pre-match row plus the last captures. */
function TimelineTable({ doc }: { doc: StoredLive }) {
  const { lang, d } = useI18n();
  const a = lang === "ar" ? liveDict.ar : liveDict.en;

  const rows: TimelineRow[] = [];
  if (doc.preMatchPrediction) {
    rows.push({
      key: "prematch",
      label: a.dashboard.changes.prematch,
      score: doc.preMatchPrediction.predictedScore,
      probabilities: doc.preMatchPrediction.winnerProbabilities,
    });
  }
  const snapshots = doc.snapshots.slice(-TRAJECTORY_WINDOW);
  snapshots.forEach((snapshot, index) => {
    const base =
      index > 0 ? snapshots[index - 1].analysis.probabilities : undefined;
    rows.push({
      key: snapshot.id,
      label: snapshot.minuteLabel,
      time: d.time(snapshot.capturedAt),
      score: snapshot.score,
      probabilities: snapshot.analysis.probabilities,
      delta: base
        ? {
            home: (snapshot.analysis.probabilities.home - base.home) * 100,
            draw: (snapshot.analysis.probabilities.draw - base.draw) * 100,
            away: (snapshot.analysis.probabilities.away - base.away) * 100,
          }
        : undefined,
    });
  });

  if (rows.length < 2) {
    return <p className="live-note">{a.dashboard.changes.none}</p>;
  }

  return (
    <div className="live-changes">
      <table className="live-changes__table">
        <thead>
          <tr>
            <th scope="col">{a.dashboard.changes.at.split("{time}")[0]}</th>
            <th scope="col">{a.dashboard.changes.score}</th>
            <th scope="col">{a.dashboard.changes.probs}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">
                <span className="live-changes__label">{row.label}</span>
                {row.time ? (
                  <span className="live-changes__time u-dir-ltr">{row.time}</span>
                ) : null}
              </th>
              <td className="u-dir-ltr">
                {row.score.home}–{row.score.away}
              </td>
              <td className="live-changes__probs u-dir-ltr">
                <span>{livePct(row.probabilities.home)}</span>
                <span>{livePct(row.probabilities.draw)}</span>
                <span>{livePct(row.probabilities.away)}</span>
                {row.delta ? (
                  <span className="live-changes__delta">
                    {deltaText(row.delta.home)}/{deltaText(row.delta.draw)}/
                    {deltaText(row.delta.away)}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LiveAnalyst({
  matchId,
  initial,
}: {
  matchId: string;
  /** Server-rendered match for the initial header (teams, logos, competition). */
  initial: Match | null;
}) {
  const { lang, f, d } = useI18n();
  const a = useMemo(() => (lang === "ar" ? liveDict.ar : liveDict.en), [lang]);

  const [status, setStatus] = useState<Status>("idle");
  const [doc, setDoc] = useState<StoredLive | null>(null);
  const [header, setHeader] = useState<LiveMatchHeader | null>(() =>
    initial ? headerFromMatch(initial) : null,
  );
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<{
    status: "captured" | "skipped" | "unchanged";
    trigger?: string;
  } | null>(null);
  const [note, setNote] = useState<"skipped" | "unchanged" | "finished" | null>(
    null,
  );
  const [pollSeconds, setPollSeconds] = useState(POLL_FALLBACK_SECONDS);
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Render mirror of `finishedRef`: the refresh button hides when done. */
  const [finished, setFinished] = useState(initial?.state === "finished");

  /** Refs mirror the values the poll loop reads between renders. */
  const mounted = useRef(true);
  const docRef = useRef<StoredLive | null>(null);
  const busyRef = useRef(false);
  const finishedRef = useRef(initial?.state === "finished");
  const dueRef = useRef(0);
  const timerRef = useRef<number | null>(null);
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

  /** The whistle blew: stop the poll loop and hide the refresh button. */
  const markFinished = useCallback(() => {
    finishedRef.current = true;
    setFinished(true);
  }, []);

  /** Adopt a stored document and its server-suggested poll cadence. */
  const adoptDoc = useCallback(
    (stored: StoredLive, pollAfter?: number) => {
      rememberDoc(stored);
      setStatus("ready");
      if (stored.finalReport) markFinished();
      if (pollAfter) {
        pollSecondsRef.current = pollAfter;
        setPollSeconds(pollAfter);
      }
    },
    [rememberDoc, markFinished],
  );

  /** GET the stored document; also how the desk picks up the final report. */
  const readDoc = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/match/${matchId}/live${langRef.current === "ar" ? "?lang=ar" : ""}`,
        { cache: "no-store" },
      );
      if (response.status === 404 || !mounted.current) return;
      const payload = (await response.json()) as
        | { data?: LiveReadResponse }
        | { error?: { code?: string } };
      if (!response.ok) {
        if (!docRef.current) {
          setErrorCode((payload as { error?: { code?: string } }).error?.code);
          setStatus("error");
        }
        return;
      }
      const data = (payload as { data?: LiveReadResponse }).data;
      if (data?.live?.version === 1 && data.live.kind === "live" && mounted.current) {
        adoptDoc(data.live, data.meta?.pollAfterSeconds);
      }
    } catch {
      // Offline or upstream hiccup: keep whatever is on screen.
    }
  }, [matchId, adoptDoc]);

  /** One POST capture. `refresh` forces a manual capture. */
  const capture = useCallback(
    async (refresh: boolean) => {
      if (busyRef.current || !mounted.current) return;
      busyRef.current = true;
      setBusy(true);
      const query = new URLSearchParams();
      if (refresh) query.set("refresh", "1");
      if (langRef.current === "ar") query.set("lang", "ar");
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
          | { error?: { code?: string } };
        if (!mounted.current) return;
        if (!response.ok) {
          const code = (payload as { error?: { code?: string } }).error?.code;
          setErrorCode(code);
          if (code === "match_not_live") {
            // The match is over: stop polling, then pick up the final report,
            // which the route computes on the next read.
            markFinished();
            setNote("finished");
            void readDoc();
          } else if (!docRef.current) {
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: LiveCaptureResponse }).data;
        if (!data) return;

        setHeader(data.match);
        if (data.live) {
          adoptDoc(data.live, data.meta?.pollAfterSeconds);
        } else if (!docRef.current) {
          setStatus("idle");
          setNote("skipped");
          return;
        }
        setErrorCode(undefined);
        setOutcome({ status: data.status, trigger: data.trigger });
        setNote(
          data.status === "captured"
            ? null
            : data.status === "unchanged"
              ? "unchanged"
              : "skipped",
        );
        if (data.match.state === "finished") {
          markFinished();
          void readDoc();
        }
      } catch {
        // Network hiccup: keep the stored reading; the loop retries.
        setErrorCode(undefined);
        if (!docRef.current) setStatus("error");
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
        // Every attempt arms the next poll; a failure must not stop the loop.
        if (mounted.current && docRef.current && !finishedRef.current) {
          dueRef.current = Date.now() + pollSecondsRef.current * 1000;
          scheduleRef.current(pollSecondsRef.current * 1000);
        }
      }
    },
    [matchId, readDoc, adoptDoc, markFinished],
  );

  const schedulePoll = useCallback(
    (delayMs: number) => {
      const schedule = (ms: number) => {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          // Hidden tabs never spend gateway calls; visibility resumes polling.
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

  // Stored document first: the desk opens without spending a gateway call.
  // lang=ar rides along so the Arabic mirror is generated once, server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(
          `/api/match/${matchId}/live${lang === "ar" ? "?lang=ar" : ""}`,
          { cache: "no-store" },
        );
        if (response.status === 404 || cancelled) return;
        const payload = (await response.json()) as
          | { data?: LiveReadResponse }
          | { error?: { code?: string } };
        if (!mounted.current || cancelled) return;
        if (!response.ok) {
          if (!docRef.current) {
            setErrorCode((payload as { error?: { code?: string } }).error?.code);
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: LiveReadResponse }).data;
        if (data?.live?.version === 1 && data.live.kind === "live") {
          adoptDoc(data.live, data.meta?.pollAfterSeconds);
        }
      } catch {
        // Keep the idle state so the viewer can ask for the first capture.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [matchId, lang, adoptDoc]);

  // Polling loop while a reading exists, the tab is visible and live.
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

  // Paused while hidden; a due capture runs when the tab reappears.
  useEffect(() => {
    const onVisibility = () => {
      if (!mounted.current) return;
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
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [status, capture]);

  const snapshot = doc?.snapshots[doc.snapshots.length - 1];
  const analysis = snapshot
    ? lang === "ar"
      ? (snapshot.translation?.analysis ?? snapshot.analysis)
      : snapshot.analysis
    : undefined;
  const needsTranslation = Boolean(lang === "ar" && snapshot && !snapshot.translation);

  const view =
    header ?? (doc && snapshot ? headerFromSnapshot(doc, snapshot) : null);
  const homeName =
    view?.home.shortName || view?.home.name || doc?.frozenContext.home.name || "";
  const awayName =
    view?.away.shortName || view?.away.name || doc?.frozenContext.away.name || "";
  const score = view?.score ?? snapshot?.score;
  const minuteLabel = view?.minuteLabel ?? snapshot?.minuteLabel ?? "";
  const state = view?.state ?? snapshot?.state ?? "";
  const statusLabel = view?.statusLabel ?? snapshot?.statusLabel ?? "";
  const competition = view?.competition;

  const pill = (() => {
    if (state === "live") return { label: a.inPlay, tone: "live" as const };
    if (state === "halftime") return { label: a.halfTime, tone: "half" as const };
    if (state === "finished") return { label: a.finished, tone: "done" as const };
    return { label: statusLabel, tone: "idle" as const };
  })();

  const showNote = !busy && note !== null;

  return (
    <div className="live-desk">
      <header className="live-head">
        <div className="live-head__top">
          <a className="live-head__back" href={`/match/${matchId}`}>
            <ArrowRight size={14} aria-hidden="true" data-flip="rtl" />
            {a.dashboard.back}
          </a>
          <div className="live-head__badges">
            <span className="analysis-badge">
              <BrainCircuit size={13} aria-hidden="true" />
              {a.badge}
            </span>
            {status === "ready" && !finished ? (
              <button
                type="button"
                className="analysis-refresh"
                onClick={() => void capture(true)}
                disabled={busy}
                title={a.refresh}
              >
                <RefreshCw
                  size={13}
                  aria-hidden="true"
                  className={busy ? "live-spin" : undefined}
                />
                <span className="analysis-refresh__label">
                  {busy ? a.refreshing : a.refresh}
                </span>
              </button>
            ) : null}
          </div>
        </div>
        <div className="live-head__heading">
          <div className="match-panel__kicker live-kicker">
            <Radio size={13} aria-hidden="true" />
            {a.kicker}
          </div>
          <h1 className="live-head__title">{a.dashboardTitle}</h1>
        </div>
        {view && score ? (
          <div className="live-head__board">
            {competition?.logo || competition?.name ? (
              <div className="live-head__comp">
                <LeagueLogo src={competition.logo} name={competition.name} size={22} />
                <span>{competition.name}</span>
              </div>
            ) : null}
            <div className="live-head__teams">
              <div className="live-head__team">
                <TeamLogo src={view.home.logo} name={homeName} size={40} />
                <span className="live-head__teamname">{homeName}</span>
              </div>
              <div className="live-head__center">
                <span className={`live-pill live-pill--${pill.tone}`}>{pill.label}</span>
                <span className="live-head__score u-dir-ltr">
                  {score.home}
                  <span className="live-head__sep" aria-hidden="true">
                    –
                  </span>
                  {score.away}
                </span>
                {minuteLabel ? (
                  <span className="live-head__minute u-dir-ltr">{minuteLabel}</span>
                ) : null}
              </div>
              <div className="live-head__team live-head__team--away">
                <TeamLogo src={view.away.logo} name={awayName} size={40} />
                <span className="live-head__teamname">{awayName}</span>
              </div>
            </div>
            <span className="live-head__kickoff u-dir-ltr">
              {d.dateTime(view.kickoff)}
            </span>
          </div>
        ) : null}
      </header>

      {status === "idle" && !doc ? (
        <section className="match-panel analysis-empty">
          <span className="analysis-empty__icon" aria-hidden="true">
            <Sparkles size={20} />
          </span>
          <h2 className="analysis-empty__title">{a.empty.title}</h2>
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
        </section>
      ) : null}

      {status === "loading" ? (
        <section className="match-panel analysis-loading">
          <span className="analysis-loading__icon" aria-hidden="true">
            <Activity size={20} />
          </span>
          <div>
            <h2 className="analysis-empty__title">{a.loading.title}</h2>
            <p className="analysis-empty__body">{a.loading.body}</p>
          </div>
          <div className="analysis-loading__bars" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      ) : null}

      {status === "error" && !doc ? (
        <section className="match-panel analysis-error">
          <span className="analysis-error__icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <div className="analysis-error__body">
            <h2 className="analysis-empty__title">{a.error.title}</h2>
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
        </section>
      ) : null}

      {doc && snapshot && analysis ? (
        <div className="live-desk__panels" aria-live="polite">
          {showNote || errorCode || needsTranslation ? (
            <div className="live-desk__notes">
              {showNote ? (
                <div
                  className={cn(
                    "live-note",
                    note === "finished" && "live-note--finished",
                  )}
                  role="status"
                >
                  <span>
                    {note === "finished"
                      ? a.error.notLive
                      : note === "unchanged"
                        ? a.aiDegraded
                        : a.captureSkipped}
                  </span>
                  {note === "finished" ? (
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
              {needsTranslation ? (
                <div className="live-note live-note--translate" role="status">
                  <span>{busy ? a.translating : a.translationUnavailable}</span>
                  {!busy ? (
                    <button
                      type="button"
                      className="live-note__retry"
                      onClick={() => void readDoc()}
                    >
                      {a.translateRetry}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* ---- Overview + reliability ---------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.dashboard.summary}</span>
              <span className="live-footer__time">
                {snapshot.capturedAt
                  ? f(a.lastUpdate, { time: d.time(snapshot.capturedAt) })
                  : a.auto}
              </span>
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
                {a.reliability.label} · {a.reliability.levels[analysis.reliability.level]}
              </span>
              <p className="analysis-summary">{analysis.overview}</p>
            </div>
            {analysis.reliability.reason ? (
              <p className="live-section__sub">{analysis.reliability.reason}</p>
            ) : null}
          </section>

          {/* ---- Published statistics ------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.overview}</span>
              <span className="live-tag">{a.probabilities.labelNote}</span>
            </div>
            {snapshot.statistics.rows.length > 0 ? (
              <ul className="live-stats">
                {snapshot.statistics.rows.map((row) => (
                  <StatBar key={`${row.name}-${row.label}`} row={row} />
                ))}
              </ul>
            ) : (
              <div className="live-note">
                <span className="live-tag">{a.dashboard.final.notAvailable}</span>
              </div>
            )}
          </section>

          {/* ---- Dominance ------------------------------------------------ */}
          <section className="match-panel live-panel">
            <span className="analysis-label">{a.dominance.label}</span>
            <div className="live-dom">
              <span className="live-dom__name">{homeName}</span>
              <div className="live-dom__track" aria-hidden="true">
                <span
                  className="live-dom__fill live-dom__fill--home"
                  style={{ width: `${Math.round(analysis.dominance.homePercent)}%` }}
                />
                <span
                  className="live-dom__fill live-dom__fill--away"
                  style={{ width: `${Math.round(analysis.dominance.awayPercent)}%` }}
                />
              </div>
              <span className="live-dom__name">{awayName}</span>
            </div>
            <div className="live-dom__values u-dir-ltr">
              <span>{liveDomPct(analysis.dominance.homePercent)}</span>
              <span className="live-dom__hint">{analysis.dominance.summary}</span>
              <span>{liveDomPct(analysis.dominance.awayPercent)}</span>
            </div>
            <p className="live-section__sub">{a.dominance.note}</p>
            <Why text={analysis.dominance.reasoning} label={a.why} />
          </section>

          {/* ---- Live probabilities --------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.probabilities.label}</span>
              <span className="live-tag">{a.probabilities.labelNote}</span>
            </div>
            <div className="analysis-prob-grid">
              {[
                {
                  key: "home" as const,
                  label: f(a.probabilities.home, { team: homeName }),
                  value: analysis.probabilities.home,
                },
                {
                  key: "draw" as const,
                  label: a.probabilities.draw,
                  value: analysis.probabilities.draw,
                },
                {
                  key: "away" as const,
                  label: f(a.probabilities.away, { team: awayName }),
                  value: analysis.probabilities.away,
                },
              ].map((bar) => (
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
                      style={{ width: `${Math.max(2, Math.round(bar.value * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {doc.preMatchPrediction ? (
              <div className="live-prematch">
                <span className="live-prematch__label">
                  {a.dashboard.changes.prematch}
                </span>
                <span className="live-prematch__probs u-dir-ltr">
                  {livePct(doc.preMatchPrediction.winnerProbabilities.home)} /{" "}
                  {livePct(doc.preMatchPrediction.winnerProbabilities.draw)} /{" "}
                  {livePct(doc.preMatchPrediction.winnerProbabilities.away)}
                </span>
              </div>
            ) : null}
            <Why
              text={
                analysis.probabilities.changeNote ??
                analysis.probabilities.explanation
              }
              label={
                analysis.probabilities.changeNote
                  ? a.dashboard.changes.title
                  : a.why
              }
            />
          </section>

          {/* ---- Next goal ------------------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">
                <Target size={13} aria-hidden="true" />
                {a.nextGoal.label}
              </span>
            </div>
            {analysis.nextGoal.available &&
            analysis.nextGoal.home !== undefined &&
            analysis.nextGoal.away !== undefined &&
            analysis.nextGoal.noMore !== undefined ? (
              <>
                <div className="analysis-prob-grid">
                  {[
                    {
                      key: "home" as const,
                      label: homeName,
                      value: analysis.nextGoal.home,
                    },
                    {
                      key: "away" as const,
                      label: awayName,
                      value: analysis.nextGoal.away,
                    },
                    {
                      key: "noMore" as const,
                      label: a.nextGoal.more,
                      value: analysis.nextGoal.noMore,
                    },
                  ].map((bar) => (
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
                            bar.key === "noMore"
                              ? "analysis-prob__fill--draw"
                              : `analysis-prob__fill--${bar.key}`,
                          )}
                          style={{
                            width: `${Math.max(2, Math.round(bar.value * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Why text={analysis.nextGoal.explanation} label={a.why} />
              </>
            ) : (
              <div className="live-note">
                <span>{a.nextGoal.unavailable}</span>
              </div>
            )}
          </section>

          {/* ---- Momentum --------------------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.dashboard.momentum.title}</span>
            </div>
            <MomentumChart
              snapshots={doc.snapshots}
              momentumNote={analysis.momentumNote}
              homeName={homeName}
              awayName={awayName}
              labels={{
                goal: a.dashboard.momentum.goal,
                redCard: a.dashboard.momentum.redCard,
                penalty: a.dashboard.momentum.penalty,
                empty: a.dashboard.momentum.empty,
                note: a.dashboard.momentum.note,
              }}
            />
          </section>

          {/* ---- Insights ---------------------------------------------------- */}
          {analysis.insights.length > 0 ? (
            <section className="match-panel live-panel">
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

          {/* ---- Tactical reading ------------------------------------------- */}
          <section className="match-panel live-panel live-tactics">
            <div className="live-panel__head">
              <span className="analysis-label">{a.dashboard.tactical.title}</span>
            </div>
            <div className="live-tactics__cols">
              <div>
                <span className="live-tactics__label">
                  {a.dashboard.tactical.confirmed}
                </span>
                <ul className="live-tactics__list">
                  {analysis.tactical.confirmed.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="live-tactics__label live-tactics__label--soft">
                  {a.dashboard.tactical.interpretation}
                </span>
                <ul className="live-tactics__list">
                  {analysis.tactical.interpretation.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ---- Event timeline ---------------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.dashboard.events.title}</span>
              <span className="live-tag u-dir-ltr">{snapshot.events.length}</span>
            </div>
            <EventList
              events={snapshot.events}
              timelineComplete={snapshot.timelineComplete}
              labels={{
                title: a.dashboard.events.title,
                empty: a.dashboard.events.empty,
                minute: a.dashboard.events.minute,
                timelineIncomplete: a.dashboard.events.timelineIncomplete,
              }}
              kinds={a.kinds}
            />
          </section>

          {/* ---- Risks -------------------------------------------------------- */}
          <section className="match-panel live-panel">
            <span className="analysis-label">{a.risks.label}</span>
            <ul className="live-risks">
              {analysis.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
            <p className="live-section__sub">{a.risks.note}</p>
          </section>

          {/* ---- Prediction trajectory ---------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.dashboard.changes.title}</span>
            </div>
            <TimelineTable doc={doc} />
          </section>

          {/* ---- Final report -------------------------------------------------- */}
          <section className="match-panel live-panel">
            <div className="live-panel__head">
              <span className="analysis-label">{a.dashboard.final.title}</span>
            </div>
            {doc.finalReport ? (
              <FinalReport
                report={doc.finalReport}
                homeName={homeName}
                awayName={awayName}
                finalLabels={a.dashboard.final}
                kinds={a.kinds}
              />
            ) : (
              <p className="live-note">{a.dashboard.final.awaiting}</p>
            )}
          </section>

          {/* ---- Provenance ------------------------------------------------------ */}
          <details className="match-panel live-panel live-about">
            <summary>{a.overview}</summary>
            <div className="analysis-about__body">
              <p>
                <span className="analysis-about__key">{a.badge}</span> {a.providerNote}
              </p>
              <p>{a.dashboard.momentum.note}</p>
              <p>{a.risks.note}</p>
              <p className="analysis-about__meta">
                <span className="u-dir-ltr">
                  {snapshot.model} · {d.dateTime(snapshot.capturedAt)}
                </span>
              </p>
            </div>
          </details>

          <footer className="live-desk__footer">
            <span className="live-footer__time">
              {snapshot.capturedAt
                ? f(a.lastUpdate, { time: d.time(snapshot.capturedAt) })
                : a.auto}
            </span>
            {outcome ? (
              <span className="live-footer__trigger">
                {a.statuses[outcome.status]}
                {outcome.trigger
                  ? ` · ${a.trigger[outcome.trigger as keyof typeof a.trigger]}`
                  : ""}
              </span>
            ) : (
              <span className="live-footer__trigger">{a.trigger[snapshot.trigger]}</span>
            )}
            {hidden ? <span className="live-footer__paused">{a.paused}</span> : null}
            <span className="live-footer__paused">{a.auto}</span>
          </footer>
        </div>
      ) : null}
    </div>
  );
}

/** Snapshot-only fallback header when the server match fetch failed. */
function headerFromSnapshot(
  doc: StoredLive,
  snapshot: StoredLiveSnapshot,
): LiveMatchHeader {
  const team = (value: { id: string; name: string }, side: "home" | "away") => ({
    id: value.id,
    name: value.name,
    shortName: value.name,
    abbreviation: value.id,
    score: side === "home" ? snapshot.score.home : snapshot.score.away,
  });
  return {
    id: doc.matchId,
    name: doc.matchId,
    kickoff: snapshot.capturedAt,
    state: snapshot.state,
    statusLabel: snapshot.statusLabel,
    competition: { name: "" },
    minuteLabel: snapshot.minuteLabel,
    score: snapshot.score,
    home: team(doc.frozenContext.home, "home"),
    away: team(doc.frozenContext.away, "away"),
  };
}
