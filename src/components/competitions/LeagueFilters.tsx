"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { seasonLabel, seasonOptions } from "@/lib/date";

function useQueryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const navigate = (updates: Record<string, string | undefined>) => {
    const query = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${query.toString()}`);
    });
  };

  return { navigate, pending };
}

export function SeasonSelect({
  season,
  defaultSeason,
  region,
}: {
  season: number;
  defaultSeason: number;
  region: string;
}) {
  const { navigate, pending } = useQueryNavigation();
  const options = Array.from(
    new Set([season, ...seasonOptions(Math.max(season, defaultSeason), 7)]),
  ).sort((a, b) => b - a);

  return (
    <div className="season-select">
      <label htmlFor="season-select">Season</label>
      <select
        id="season-select"
        value={season}
        disabled={pending}
        onChange={(event) => navigate({ season: event.target.value })}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {seasonLabel(option, { region })}
          </option>
        ))}
      </select>
    </div>
  );
}

export function MonthSelect({
  months,
  value,
}: {
  months: Array<{ key: string; label: string; count: number }>;
  value: string;
}) {
  const { navigate, pending } = useQueryNavigation();

  return (
    <label className="season-select">
      <span
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Month
      </span>
      <select
        value={value}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          navigate({ month: next === "all" ? undefined : next });
        }}
        aria-label="Filter fixtures by month"
      >
        <option value="all">All months</option>
        {months.map((month) => (
          <option key={month.key} value={month.key}>
            {month.label} ({month.count})
          </option>
        ))}
      </select>
    </label>
  );
}
