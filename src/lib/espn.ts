/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Low-level ESPN public API adapters.
 *
 * Everything here is read-only and unauthenticated. ESPN's endpoints are
 * undocumented and can change; normalisation and graceful empty states live
 * one layer above so the UI never depends on a specific payload shape.
 */
import { fetchJson } from "./http";

export type Json = any;

const SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const SEARCH = "https://site.api.espn.com/apis/common/v3/search";

export const ATTRIBUTION = "Data provided by ESPN's public sports APIs.";
export const FIFA_ATTRIBUTION =
  "Rankings data provided by the FIFA public API (api.fifa.com).";

function compactDate(date: string): string {
  return date.replaceAll("-", "");
}

export function scoreboardDateUrl(date: string): string {
  return `${SITE}/all/scoreboard?dates=${compactDate(date)}&limit=1000`;
}

/** Every match on a single calendar day, across all competitions. */
export function fetchScoreboardByDate(date: string) {
  return fetchJson<Json>(scoreboardDateUrl(date), {
    revalidate: 45,
    cacheKey: `scoreboard:date:${date}:1000`,
    timeoutMs: 20_000,
    nextCache: false,
  });
}

/** A month of matches in one request. ESPN caps the page at 1000 events. */
export function fetchScoreboardByMonth(month: string) {
  const compact = month.replaceAll("-", "");
  return fetchJson<Json>(`${SITE}/all/scoreboard?dates=${compact}&limit=1000`, {
    revalidate: 300,
    cacheKey: `scoreboard:month:${month}`,
    timeoutMs: 25_000,
    nextCache: false,
  });
}

/** Every match in a competition season (used for tables/fixtures). */
export function fetchLeagueScoreboard(slug: string, season: number) {
  return fetchJson<Json>(
    `${SITE}/${encodeURIComponent(slug)}/scoreboard?dates=${season}&limit=500`,
    {
      revalidate: 300,
      cacheKey: `scoreboard:league:${slug}:${season}`,
      timeoutMs: 25_000,
      nextCache: false,
    },
  );
}

export function fetchStandings(slug: string, season: number) {
  return fetchJson<Json>(
    `https://site.api.espn.com/apis/v2/sports/soccer/${encodeURIComponent(
      slug,
    )}/standings?season=${season}`,
    {
      revalidate: 180,
      cacheKey: `standings:${slug}:${season}`,
      timeoutMs: 20_000,
    },
  );
}

export function fetchStatistics(slug: string, season: number) {
  return fetchJson<Json>(
    `${SITE}/${encodeURIComponent(slug)}/statistics?season=${season}`,
    {
      revalidate: 180,
      cacheKey: `statistics:${slug}:${season}`,
      timeoutMs: 20_000,
    },
  );
}

export function fetchSummary(eventId: string) {
  return fetchJson<Json>(
    `${SITE}/all/summary?event=${encodeURIComponent(eventId)}`,
    {
      revalidate: 30,
      cacheKey: `summary:${eventId}`,
      timeoutMs: 25_000,
    },
  );
}

export function fetchNews(limit = 12) {
  const safeLimit = Math.min(Math.max(limit, 1), 24);
  return fetchJson<Json>(`${SITE}/all/news?limit=${safeLimit}`, {
    revalidate: 300,
    cacheKey: `news:${safeLimit}`,
    timeoutMs: 20_000,
  });
}

export function fetchTeam(teamId: string) {
  return fetchJson<Json>(
    `${SITE}/all/teams/${encodeURIComponent(teamId)}`,
    {
      revalidate: 3600,
      cacheKey: `team:${teamId}`,
      timeoutMs: 20_000,
    },
  );
}

export function fetchTeamSchedule(teamId: string, season: number) {
  return fetchJson<Json>(
    `${SITE}/all/teams/${encodeURIComponent(
      teamId,
    )}/schedule?season=${season}`,
    {
      revalidate: 300,
      cacheKey: `team:${teamId}:schedule:${season}`,
      timeoutMs: 25_000,
    },
  );
}

export function fetchEspnSearch(query: string, limit = 20) {
  return fetchJson<Json>(
    `${SEARCH}?query=${encodeURIComponent(query)}&limit=${limit}`,
    {
      revalidate: 300,
      cacheKey: `search:${query.toLowerCase()}:${limit}`,
      timeoutMs: 15_000,
      retries: 1,
    },
  );
}

export function fetchLeagueMeta(slug: string) {
  return fetchJson<Json>(
    `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${encodeURIComponent(
      slug,
    )}?lang=en&region=us`,
    {
      revalidate: 3600,
      cacheKey: `league-meta:${slug}`,
      timeoutMs: 15_000,
    },
  );
}
