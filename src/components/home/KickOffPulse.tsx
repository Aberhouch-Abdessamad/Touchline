"use client";

import { useMemo } from "react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { cn } from "@/lib/utils";

const BUCKET_HOURS = 2;
const BUCKET_COUNT = 24 / BUCKET_HOURS;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function hourLabel(hour: number): string {
  return `${pad(hour)}:00`;
}

/**
 * Aggregate-only artwork: how the matchday's kick-offs are distributed across
 * the reader's clock. It deliberately carries no fixtures — those live in the
 * live rail and the fixture board — and it reads as a cycle, so a card that
 * runs past midnight is plotted in the order it is played.
 */
export function KickOffPulse({ kicks }: { kicks: string[] }) {
  const { timeZone } = usePreferences();

  const model = useMemo(() => {
    const dates = kicks
      .map((iso) => new Date(iso))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (dates.length === 0) return null;

    const hourFormatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone,
    });
    const timeFormatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    });
    const dayFormatter = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });

    const counts = new Array<number>(24).fill(0);
    let earliest = dates[0];
    let latest = dates[0];

    for (const date of dates) {
      counts[Number(hourFormatter.format(date)) % 24] += 1;
      if (date.getTime() < earliest.getTime()) earliest = date;
      if (date.getTime() > latest.getTime()) latest = date;
    }

    const firstHour = Number(hourFormatter.format(earliest)) % 24;
    const start = Math.floor(firstHour / BUCKET_HOURS) * BUCKET_HOURS;

    const bars = Array.from({ length: BUCKET_COUNT }, (_, index) => {
      const from = (start + index * BUCKET_HOURS) % 24;
      let count = 0;
      for (let step = 0; step < BUCKET_HOURS; step += 1) {
        count += counts[(from + step) % 24];
      }
      return { from, to: (from + BUCKET_HOURS) % 24, count };
    });

    const peak = Math.max(...bars.map((bar) => bar.count));
    const busiest = bars.find((bar) => bar.count === peak) ?? bars[0];

    return {
      bars,
      peak,
      busiest,
      start,
      end: bars[bars.length - 1].from,
      firstKick: timeFormatter.format(earliest),
      lastKick: timeFormatter.format(latest),
      nextDay: dayFormatter.format(latest) !== dayFormatter.format(earliest),
      total: dates.length,
    };
  }, [kicks, timeZone]);

  if (!model) {
    return <p className="hm-pulse__empty">No kick-off times to chart yet.</p>;
  }

  return (
    <div className="hm-pulse">
      <div
        className="hm-pulse__bars"
        role="img"
        aria-label={`${model.total} kick-offs today, busiest between ${hourLabel(
          model.busiest.from,
        )} and ${hourLabel(model.busiest.to)}`}
      >
        {model.bars.map((bar) => (
          <span
            key={bar.from}
            className={cn(
              "hm-pulse__bar",
              bar.count === 0 && "is-empty",
              bar.count === model.peak && "is-peak",
            )}
            style={{
              height: `${Math.max(
                bar.count === 0 ? 4 : 14,
                Math.round((bar.count / model.peak) * 100),
              )}%`,
            }}
            title={`${hourLabel(bar.from)}–${hourLabel(bar.to)} — ${
              bar.count
            } ${bar.count === 1 ? "kick-off" : "kick-offs"}`}
          />
        ))}
      </div>

      <div className="hm-pulse__scale" aria-hidden="true">
        <span>{hourLabel(model.start)}</span>
        <span>{hourLabel(model.end)}</span>
      </div>

      <p className="hm-pulse__note">
        <span>
          Peak{" "}
          <strong>
            {hourLabel(model.busiest.from)}–{hourLabel(model.busiest.to)}
          </strong>
        </span>
        <span>
          First <strong>{model.firstKick}</strong>
        </span>
        <span>
          Last <strong>{model.lastKick}</strong>
          {model.nextDay ? (
            <span className="hm-pulse__plus" title="After midnight">
              +1
            </span>
          ) : null}
        </span>
      </p>
    </div>
  );
}
