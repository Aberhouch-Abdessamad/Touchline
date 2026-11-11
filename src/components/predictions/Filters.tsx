"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/predictions/types";

export interface FilterValues {
  competition?: string;
  season?: number;
  category?: CategoryKey;
  from?: string;
  to?: string;
}

/**
 * URL-driven filter bar: every change rewrites the query string, so filtered
 * views are shareable and render on the server.
 */
export function Filters({
  values,
  competitions,
  seasons,
  show = { category: true, dates: true },
  keep = [],
}: {
  values: FilterValues;
  competitions: Array<{ slug: string; name: string; count: number }>;
  seasons: number[];
  show?: { category?: boolean; dates?: boolean };
  /** Query parameters preserved when filters change (e.g. status). */
  keep?: string[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const update = (changes: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const current = new URLSearchParams(window.location.search);
    for (const key of keep) {
      const value = current.get(key);
      if (value) query.set(key, value);
    }
    const next: Record<string, string | undefined> = {
      competition: values.competition,
      season: values.season ? String(values.season) : undefined,
      category: values.category,
      from: values.from,
      to: values.to,
      ...changes,
    };
    for (const [key, value] of Object.entries(next)) {
      if (value) query.set(key, value);
    }
    startTransition(() => {
      const qs = query.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const active = Boolean(
    values.competition || values.season || values.category || values.from || values.to,
  );

  return (
    <div className="pl-filters" aria-busy={pending}>
      <label className="pl-field">
        <span>{t.predictions.filters.competition}</span>
        <select
          value={values.competition ?? ""}
          onChange={(event) => update({ competition: event.target.value || undefined })}
        >
          <option value="">{t.predictions.filters.allCompetitions}</option>
          {competitions.map((option) => (
            <option key={option.slug} value={option.slug}>
              {leagueDisplayName({ slug: option.slug, name: option.name }, lang)} ({option.count})
            </option>
          ))}
        </select>
      </label>
      <label className="pl-field">
        <span>{t.predictions.filters.season}</span>
        <select
          value={values.season ?? ""}
          onChange={(event) => update({ season: event.target.value || undefined })}
        >
          <option value="">{t.predictions.filters.allSeasons}</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
      </label>
      {show.category ? (
        <label className="pl-field">
          <span>{t.predictions.filters.category}</span>
          <select
            value={values.category ?? ""}
            onChange={(event) => update({ category: event.target.value || undefined })}
          >
            <option value="">{t.predictions.categories.outcome}</option>
            {CATEGORY_KEYS.filter((key) => key !== "outcome").map((key) => (
              <option key={key} value={key}>
                {t.predictions.categories[key]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {show.dates ? (
        <>
          <label className="pl-field">
            <span>{t.predictions.filters.from}</span>
            <input
              type="date"
              value={values.from ?? ""}
              max={values.to}
              onChange={(event) => update({ from: event.target.value || undefined })}
            />
          </label>
          <label className="pl-field">
            <span>{t.predictions.filters.to}</span>
            <input
              type="date"
              value={values.to ?? ""}
              min={values.from}
              onChange={(event) => update({ to: event.target.value || undefined })}
            />
          </label>
        </>
      ) : null}
      {active ? (
        <button
          type="button"
          className="pl-filters__reset"
          onClick={() =>
            update({
              competition: undefined,
              season: undefined,
              category: undefined,
              from: undefined,
              to: undefined,
            })
          }
        >
          <RotateCcw size={14} aria-hidden="true" />
          {t.predictions.filters.reset}
        </button>
      ) : null}
    </div>
  );
}
