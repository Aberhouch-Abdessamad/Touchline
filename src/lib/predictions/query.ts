/** Shared query-string parsing for the predictions pages and API routes. */
import {
  isIsoDate,
  isIsoMonth,
  isSlug,
} from "@/lib/validation";
import { CATEGORY_KEYS, type CategoryKey } from "./types";
import type { HistoryFilter, StatsFilter } from "./stats";

type Raw = string | string[] | null | undefined;
const one = (value: Raw) => (Array.isArray(value) ? value[0] : (value ?? undefined));

export function parseStatsFilter(get: (key: string) => Raw): StatsFilter {
  const competition = one(get("competition"));
  const season = Number(one(get("season")));
  const from = one(get("from"));
  const to = one(get("to"));
  const category = one(get("category"));
  return {
    competition: isSlug(competition) ? competition : undefined,
    season: Number.isInteger(season) && season > 1990 && season < 2100 ? season : undefined,
    from: isIsoDate(from) ? from : undefined,
    to: isIsoDate(to) ? to : undefined,
    category: CATEGORY_KEYS.includes(category as CategoryKey) ? (category as CategoryKey) : undefined,
  };
}

export function parseHistoryFilter(get: (key: string) => Raw): HistoryFilter {
  const status = one(get("status"));
  const page = Number(one(get("page")));
  return {
    ...parseStatsFilter(get),
    status:
      status === "correct" || status === "incorrect" || status === "pending"
        ? status
        : "all",
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: 20,
  };
}

export function parseMonthParam(value: Raw): string {
  const month = one(value);
  return isIsoMonth(month) ? month : new Date().toISOString().slice(0, 7);
}
