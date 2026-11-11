"use client";

import { useI18n } from "@/lib/i18n";
import { usePct } from "./bits";
import type { TimelinePoint } from "@/lib/predictions/stats";

/** Running accuracy line. Every point carries a native tooltip. */
export function AccuracyLine({ points }: { points: TimelinePoint[] }) {
  const { t, f, d } = useI18n();
  const pct = usePct();
  if (points.length === 0) {
    return <p className="pl-empty-note">{t.predictions.timeline.empty}</p>;
  }

  const W = 640;
  const H = 230;
  const pad = { l: 40, r: 16, t: 14, b: 28 };
  const times = points.map((p) => Date.parse(`${p.date}T12:00:00Z`));
  const min = times[0];
  const span = Math.max(times[times.length - 1] - min, 1);
  const x = (i: number) =>
    points.length === 1
      ? (W - pad.l - pad.r) / 2 + pad.l
      : pad.l + ((times[i] - min) / span) * (W - pad.l - pad.r);
  const y = (value: number) => pad.t + (1 - value / 100) * (H - pad.t - pad.b);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.cumulativeAccuracy).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${y(0)} L${x(0).toFixed(1)} ${y(0)} Z`;
  const last = points[points.length - 1];
  const ticks = [0, 25, 50, 75, 100];

  return (
    <svg
      className="pl-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={f(t.predictions.timeline.point, {
        date: last.date,
        accuracy: last.cumulativeAccuracy.toFixed(1),
        n: last.cumulativeEvaluated,
      })}
    >
      <defs>
        <linearGradient id="pl-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent-strong)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--accent-strong)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={pad.l} x2={W - pad.r} y1={y(tick)} y2={y(tick)} className="pl-chart__grid" />
          <text x={pad.l - 8} y={y(tick) + 4} textAnchor="end" className="pl-chart__tick">
            {tick}
          </text>
        </g>
      ))}
      {points.length > 1 ? <path d={area} fill="url(#pl-area)" /> : null}
      {points.length > 1 ? <path d={line} className="pl-chart__line" /> : null}
      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.cumulativeAccuracy)}
          r={i === points.length - 1 ? 5 : 3}
          className={i === points.length - 1 ? "pl-chart__dot pl-chart__dot--last" : "pl-chart__dot"}
        >
          <title>
            {f(t.predictions.timeline.point, {
              date: d.date(`${p.date}T12:00:00Z`),
              accuracy: p.cumulativeAccuracy.toFixed(1),
              n: p.cumulativeEvaluated,
            })}
          </title>
        </circle>
      ))}
      <text x={pad.l} y={H - 6} className="pl-chart__tick">
        {d.date(`${points[0].date}T12:00:00Z`)}
      </text>
      <text x={W - pad.r} y={H - 6} textAnchor="end" className="pl-chart__tick">
        {d.date(`${last.date}T12:00:00Z`)}
      </text>
      <text x={W - pad.r} y={pad.t + 2} textAnchor="end" className="pl-chart__value">
        {pct(last.cumulativeAccuracy)}
      </text>
    </svg>
  );
}

/** Correct vs incorrect donut with the accuracy in the middle. */
export function OutcomeDonut({
  correct,
  incorrect,
}: {
  correct: number;
  incorrect: number;
}) {
  const { t } = useI18n();
  const pct = usePct();
  const total = correct + incorrect;
  if (total === 0) return <p className="pl-empty-note">{t.predictions.split.empty}</p>;

  const R = 62;
  const C = 2 * Math.PI * R;
  const share = correct / total;
  return (
    <div className="pl-donut">
      <svg viewBox="0 0 160 160" role="img" aria-label={`${correct} / ${incorrect}`}>
        <circle cx="80" cy="80" r={R} className="pl-donut__track" />
        <circle
          cx="80"
          cy="80"
          r={R}
          className="pl-donut__arc"
          strokeDasharray={`${share * C} ${C}`}
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="78" textAnchor="middle" className="pl-donut__value">
          {pct((correct / total) * 100, 1)}
        </text>
        <text x="80" y="98" textAnchor="middle" className="pl-donut__label">
          {total}
        </text>
      </svg>
      <ul className="pl-donut__legend">
        <li>
          <i className="pl-dot pl-dot--good" /> {t.predictions.stats.correct}
          <b>{correct}</b>
        </li>
        <li>
          <i className="pl-dot pl-dot--bad" /> {t.predictions.stats.incorrect}
          <b>{incorrect}</b>
        </li>
      </ul>
    </div>
  );
}

/** Horizontal accuracy bar used in tables. */
export function AccuracyBar({
  value,
  muted,
}: {
  value: number | null;
  muted?: boolean;
}) {
  const pct = usePct();
  return (
    <span className={muted ? "pl-bar pl-bar--muted" : "pl-bar"}>
      <span className="pl-bar__track">
        <span className="pl-bar__fill" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      </span>
      <b>{pct(value)}</b>
    </span>
  );
}
