"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { analysis as analysisDict } from "@/lib/i18n/domains/analysis";
import { cn } from "@/lib/utils";
import type { StoredAnalysis } from "@/lib/analysis/store";

type Status = "idle" | "loading" | "ready" | "error";
type Language = "en" | "ar";

interface ApiErrorPayload {
  error?: { message?: string; code?: string };
}

export function errorMessageKey(code: string | undefined): keyof (typeof analysisDict)["en"]["error"] {
  switch (code) {
    case "ai_not_configured":
      return "notConfigured";
    case "ai_auth_failed":
      return "auth";
    case "ai_rate_limited":
    case "rate_limited":
    case "upstream_rate_limited":
      return "rateLimited";
    case "ai_timeout":
    case "upstream_timeout":
      return "timeout";
    case "ai_unavailable":
      return "unavailable";
    case "ai_invalid_response":
    case "ai_unsupported_model":
      return "invalidResponse";
    case "insufficient_match_data":
      return "insufficientData";
    case "match_not_finished":
      return "notFinished";
    case "not_found":
      return "notFound";
    case "upstream_error":
      return "upstream";
    default:
      return "unknown";
  }
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function ProbabilityBar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "home" | "draw" | "away";
}) {
  return (
    <div className="analysis-prob">
      <div className="analysis-prob__top">
        <span className="analysis-prob__label">{label}</span>
        <span className="analysis-prob__value u-dir-ltr">{pct(value)}</span>
      </div>
      <div className="analysis-prob__track" aria-hidden="true">
        <span
          className={cn("analysis-prob__fill", `analysis-prob__fill--${tone}`)}
          style={{ width: `${Math.max(2, Math.round(value * 100))}%` }}
        />
      </div>
    </div>
  );
}

/** Collapsed statistical explanation; the numbers stay visible above it. */
function Why({ text, label }: { text: string; label: string }) {
  if (!text) return null;
  return (
    <details className="analysis-why">
      <summary>{label}</summary>
      <p>{text}</p>
    </details>
  );
}

function Stat({
  label,
  why,
  whyLabel,
  children,
}: {
  label: string;
  why?: string;
  whyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="analysis-stat">
      <span className="analysis-label">{label}</span>
      <div className="analysis-stat__value">{children}</div>
      {why ? <Why text={why} label={whyLabel} /> : null}
    </div>
  );
}

function AnalysisBody({
  analysis,
  homeName,
  awayName,
}: {
  analysis: StoredAnalysis;
  homeName: string;
  awayName: string;
}) {
  const { lang, f, d } = useI18n();
  const a = useMemo(
    () => (lang === "ar" ? analysisDict.ar : analysisDict.en),
    [lang],
  );
  // The Arabic mirror carries translated text only; its numbers are validated
  // against the English prediction before the server persists it.
  const prediction =
    lang === "ar"
      ? (analysis.translation?.prediction ?? analysis.prediction)
      : analysis.prediction;
  const reliability = prediction.reliability;
  const line15 = prediction.goalsOverUnder.find(
    (line) => Math.abs(line.line - 1.5) < 1e-6,
  );
  const line25 = prediction.goalsOverUnder.find(
    (line) => Math.abs(line.line - 2.5) < 1e-6,
  );

  const firstHalfLabel =
    prediction.firstHalf.outcome === "home"
      ? a.firstHalfHomeWin
      : prediction.firstHalf.outcome === "away"
        ? a.firstHalfAwayWin
        : a.firstHalfDraw;

  // The strongest outcome, derived from the stored probabilities.
  const rankedOutcomes = [
    { key: "home", value: prediction.winnerProbabilities.home, label: f(a.homeWin, { team: homeName }) },
    { key: "draw", value: prediction.winnerProbabilities.draw, label: a.draw },
    { key: "away", value: prediction.winnerProbabilities.away, label: f(a.awayWin, { team: awayName }) },
  ].sort((x, y) => y.value - x.value);
  const bestPick = rankedOutcomes[0];

  return (
    <div className="analysis-body">
      {reliability.insufficientData ? (
        <div className="analysis-warning">
          <AlertTriangle size={15} aria-hidden="true" />
          <div>
            <strong>{a.reliability.insufficient}</strong>
            {analysis.dataQuality.insufficientReasons.length > 0 ? (
              <ul className="analysis-warning__list">
                {analysis.dataQuality.insufficientReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="analysis-lead">
        <span
          className={cn(
            "analysis-pill",
            `analysis-pill--${reliability.level}`,
          )}
        >
          {a.reliability.label} · {a.reliability.levels[reliability.level]}
        </span>
        <p className="analysis-summary">{prediction.summary}</p>
      </div>

      <section className="analysis-winner">
        <div className="analysis-winner__head">
          <span className="analysis-label">{a.winner}</span>
          <span className="analysis-bestpick u-dir-ltr">
            <span className="analysis-bestpick__label">{a.bestPick}: </span>
            {bestPick.label} · {pct(bestPick.value)}
          </span>
        </div>
        <div className="analysis-prob-grid">
          <ProbabilityBar
            label={f(a.homeWin, { team: homeName })}
            value={prediction.winnerProbabilities.home}
            tone="home"
          />
          <ProbabilityBar
            label={a.draw}
            value={prediction.winnerProbabilities.draw}
            tone="draw"
          />
          <ProbabilityBar
            label={f(a.awayWin, { team: awayName })}
            value={prediction.winnerProbabilities.away}
            tone="away"
          />
        </div>
        <Why text={prediction.winnerProbabilities.explanation} label={a.why} />
      </section>

      <div className="analysis-hero">
        <div className="analysis-hero__card">
          <span className="analysis-label">{a.predictedScore}</span>
          <span className="analysis-hero__score u-dir-ltr">
            {prediction.predictedScore.home}–{prediction.predictedScore.away}
          </span>
          <Why text={prediction.predictedScore.explanation} label={a.why} />
        </div>
        <div className="analysis-hero__card">
          <span className="analysis-label">{a.expectedGoals}</span>
          <span className="analysis-hero__score u-dir-ltr">
            {prediction.expectedGoals.home.toFixed(2)} –{" "}
            {prediction.expectedGoals.away.toFixed(2)}
          </span>
          <span className="analysis-hero__sub u-dir-ltr">
            {prediction.expectedGoals.total.toFixed(2)}
          </span>
          <Why text={prediction.expectedGoals.explanation} label={a.why} />
        </div>
      </div>

      <div className="analysis-stats">
        <Stat
          label={a.bothTeamsToScore}
          why={prediction.bothTeamsToScore.explanation}
          whyLabel={a.why}
        >
          <span className="analysis-stat__big u-dir-ltr">
            {pct(prediction.bothTeamsToScore.probability)}
          </span>
        </Stat>

        <Stat
          label={a.overUnder}
          why={line25?.explanation ?? line15?.explanation}
          whyLabel={a.why}
        >
          {line15 ? (
            <span className="analysis-stat__line u-dir-ltr">
              {f(a.line, { line: "1.5" })}: {a.over} {pct(line15.over)} ·{" "}
              {a.under} {pct(line15.under)}
            </span>
          ) : null}
          {line25 ? (
            <span className="analysis-stat__line u-dir-ltr">
              {f(a.line, { line: "2.5" })}: {a.over} {pct(line25.over)} ·{" "}
              {a.under} {pct(line25.under)}
            </span>
          ) : null}
        </Stat>

        <Stat
          label={a.expectedYellowCards}
          why={prediction.cards.explanation}
          whyLabel={a.why}
        >
          <span className="analysis-stat__num u-dir-ltr">
            {prediction.cards.yellow.home.toFixed(1)} –{" "}
            {prediction.cards.yellow.away.toFixed(1)}
          </span>
          <span className="analysis-stat__sub u-dir-ltr">
            {prediction.cards.yellow.total.toFixed(1)}
          </span>
        </Stat>

        <Stat label={a.expectedRedCards} whyLabel={a.why}>
          <span className="analysis-stat__num u-dir-ltr">
            {prediction.cards.red.home.toFixed(1)} –{" "}
            {prediction.cards.red.away.toFixed(1)}
          </span>
          <span className="analysis-stat__sub u-dir-ltr">
            {prediction.cards.red.total.toFixed(1)}
          </span>
        </Stat>

        <Stat
          label={a.firstTeamToScore}
          why={prediction.firstTeamToScore.explanation}
          whyLabel={a.why}
        >
          <span className="analysis-stat__num u-dir-ltr">
            {pct(prediction.firstTeamToScore.home)} /{" "}
            {pct(prediction.firstTeamToScore.away)} /{" "}
            {pct(prediction.firstTeamToScore.noGoals)}
          </span>
          <span className="analysis-stat__sub">
            {homeName} / {awayName} / {a.noGoals}
          </span>
        </Stat>

        <Stat
          label={a.firstHalf}
          why={prediction.firstHalf.explanation}
          whyLabel={a.why}
        >
          <span className="analysis-stat__text">{firstHalfLabel}</span>
        </Stat>
      </div>

      <div className="analysis-details">
        <details>
          <summary>{a.headToHead}</summary>
          <p>{prediction.headToHead}</p>
        </details>
        <details>
          <summary>{a.recentForm}</summary>
          <p>{prediction.recentForm}</p>
        </details>
        <details>
          <summary>{a.tactics}</summary>
          <div className="analysis-tactics">
            {(
              [
                { name: homeName, side: prediction.tactics.home },
                { name: awayName, side: prediction.tactics.away },
              ] as const
            ).map(({ name, side }) => (
              <div className="analysis-tactics__team" key={name}>
                <span className="analysis-tactics__name">{name}</span>
                <span className="analysis-tactics__label">{a.strengths}</span>
                <ul>
                  {side.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="analysis-tactics__label">{a.weaknesses}</span>
                <ul>
                  {side.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
        <details>
          <summary>{a.keyFactors}</summary>
          <ul className="analysis-list">
            {prediction.keyFactors.map((factor) => (
              <li key={factor}>{factor}</li>
            ))}
          </ul>
        </details>
      </div>

      <details className="analysis-about">
        <summary>{a.about}</summary>
        <div className="analysis-about__body">
          <p>
            <span className="analysis-about__key">{a.reliability.label}: </span>
            {a.reliability.levels[reliability.level]} — {reliability.reason}
          </p>
          <p>{a.providerNote}</p>
          <p className="analysis-about__meta u-dir-ltr">
            {f(a.generatedAt, { time: d.dateTime(analysis.generatedAt) })} ·{" "}
            {analysis.answeredBy}
          </p>
          <p className="analysis-about__disclaimer">{a.disclaimer}</p>
        </div>
      </details>
    </div>
  );
}

export function MatchAnalysis({
  matchId,
  homeName,
  awayName,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
}) {
  const { lang } = useI18n();
  const a = useMemo(
    () => (lang === "ar" ? analysisDict.ar : analysisDict.en),
    [lang],
  );
  const [status, setStatus] = useState<Status>("idle");
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [translating, setTranslating] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);
  const mounted = useRef(true);
  const translationAttempted = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // A previously stored analysis is shown without spending a gateway call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/match/${matchId}/analysis`, {
          cache: "no-store",
        });
        if (response.status === 404) return;
        const payload = (await response.json()) as
          | { data?: StoredAnalysis }
          | ApiErrorPayload;
        if (!response.ok) {
          if (!cancelled) {
            setErrorCode((payload as ApiErrorPayload).error?.code);
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: StoredAnalysis }).data;
        if (!cancelled && data?.version === 1) {
          setAnalysis(data);
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
      if (refresh) params.set("refresh", "1");
      if (language === "ar") params.set("lang", "ar");
      const query = params.toString();
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
          `/api/match/${matchId}/analysis${query ? `?${query}` : ""}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ refresh }),
          },
        );
        const payload = (await response.json()) as
          | { data?: StoredAnalysis }
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
            setAnalysis((current) => current); // keep any previous analysis
            setStatus("error");
          }
          return;
        }
        const data = (payload as { data?: StoredAnalysis }).data;
        if (!data) throw new Error("Missing analysis payload");
        if (mounted.current) {
          setAnalysis(data);
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

  // Arabic UI with an English-only stored analysis: ask once for the mirror.
  // The English report stays visible while the translation request runs.
  useEffect(() => {
    if (status !== "ready" || !analysis) return;
    if (lang !== "ar" || analysis.translation) return;
    const key = `${matchId}:${analysis.generatedAt}`;
    if (translationAttempted.current === key) return;
    translationAttempted.current = key;
    void analyze(false, "ar");
  }, [lang, status, analysis, matchId, analyze]);

  return (
    <section
      className="match-panel match-analysis"
      aria-live="polite"
      aria-busy={translating}
    >
      <header className="match-panel__head">
        <div className="match-panel__heading">
          <div className="match-panel__kicker">{a.kicker}</div>
          <h2 className="match-panel__title">{a.title}</h2>
        </div>
        <div className="match-panel__meta">
          <span className="analysis-badge">
            <BrainCircuit size={13} aria-hidden="true" />
            {a.badge}
          </span>
          {status === "ready" && analysis ? (
            <button
              type="button"
              className="analysis-refresh"
              onClick={() => void analyze(true, lang === "ar" ? "ar" : undefined)}
              title={a.regenerate}
              aria-label={a.regenerate}
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span className="analysis-refresh__label">{a.regenerate}</span>
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
          <span>{a.translating}</span>
        </div>
      ) : null}

      {status === "ready" &&
      analysis &&
      lang === "ar" &&
      !analysis.translation &&
      translationFailed ? (
        <div className="analysis-note analysis-note--action">
          <span>{a.translationUnavailable}</span>
          <button
            type="button"
            className="analysis-note__retry"
            onClick={() => {
              translationAttempted.current = null;
              void analyze(false, "ar");
            }}
          >
            {a.translateRetry}
          </button>
        </div>
      ) : null}

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
            onClick={() => void analyze(true, lang === "ar" ? "ar" : undefined)}
          >
            <Target size={16} aria-hidden="true" />
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

      {status === "error" ? (
        <div className="analysis-error">
          <span className="analysis-error__icon" aria-hidden="true">
            <AlertTriangle size={18} />
          </span>
          <div className="analysis-error__body">
            <h3 className="analysis-empty__title">{a.error.title}</h3>
            <p>{a.error[errorMessageKey(errorCode)]}</p>
            {analysis ? (
              <p className="analysis-error__note">{a.error.cachedFallback}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn--ghost analysis-cta"
            onClick={() => void analyze(Boolean(analysis), lang === "ar" ? "ar" : undefined)}
          >
            <RefreshCw size={15} aria-hidden="true" />
            {a.error.retry}
          </button>
        </div>
      ) : null}

      {status === "ready" && analysis ? (
        <AnalysisBody
          analysis={analysis}
          homeName={homeName}
          awayName={awayName}
        />
      ) : null}
    </section>
  );
}
