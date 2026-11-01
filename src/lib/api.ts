/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * High-level data access used by both server components and the public API
 * routes. No UI code talks to ESPN directly.
 */
import { FEATURED_LEAGUES, LEAGUES, getLeague } from "@/data/leagues";
import type { League } from "@/data/leagues";
import {
  ATTRIBUTION,
  FIFA_ATTRIBUTION,
  fetchEspnSearch,
  fetchLeagueScoreboard,
  fetchNews,
  fetchScoreboardByDate,
  fetchScoreboardByMonth,
  fetchStandings,
  fetchStatistics,
  fetchSummary,
  fetchTeam,
  fetchTeamSchedule,
} from "./espn";
import { fetchRankings, type RankingGender } from "./fifa";
import { UpstreamError } from "./http";
import {
  normalizeMatches,
  normalizeNews,
  normalizeScorers,
  normalizeSearchTeams,
  normalizeStandings,
  normalizeSummary,
  normalizeTeamFixtures,
  normalizeTeamProfile,
} from "./normalize";
import type {
  ApiMeta,
  Match,
  MatchDetails,
  NewsArticle,
  RankingBoard,
  ScorerBoard,
  SearchResults,
  StandingGroup,
  TeamPageData,
} from "./types";
import { getDefaultSeason, parseDateParam, seasonOptions, toDateParam } from "./date";

export interface Loaded<T> {
  data: T;
  available: boolean;
  reason?: string;
}

export interface PaginatedFixtures {
  matches: Match[];
  limited: boolean;
}

const ESPN_CACHE = 60;

export function meta(
  source: "espn" | "fifa",
  cacheSeconds: number,
  fetchedAt = new Date().toISOString(),
): ApiMeta {
  return {
    source: source === "fifa" ? "FIFA public API" : "ESPN public API",
    attribution: source === "fifa" ? FIFA_ATTRIBUTION : ATTRIBUTION,
    fetchedAt,
    cacheSeconds,
  };
}

export function getFeaturedLeagues(): League[] {
  return FEATURED_LEAGUES;
}

export function getAllLeagues(): League[] {
  return LEAGUES;
}

export function findLeague(slug: string | null | undefined): League | undefined {
  return getLeague(slug);
}

export function findLeagueByEspnId(id: string | undefined): League | undefined {
  if (!id) return undefined;
  return LEAGUES.find((league) => league.espnId === id);
}

export function resolveSeason(
  league: League | undefined,
  raw: string | null | undefined,
): number {
  const fallback = league
    ? getDefaultSeason(league)
    : new Date().getUTCFullYear();
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return fallback;
  const upper = new Date().getUTCFullYear() + 1;
  const lower = upper - 10;
  if (parsed < lower || parsed > upper) return fallback;
  return parsed;
}

export function seasonsFor(league: League | undefined): number[] {
  return seasonOptions(
    league ? getDefaultSeason(league) : new Date().getUTCFullYear(),
    6,
  );
}

export async function getMatchesByDate(date: string): Promise<Match[]> {
  const safeDate = parseDateParam(date);
  const raw = await fetchScoreboardByDate(toDateParam(safeDate));
  return normalizeMatches(raw);
}

export async function getMatchesByMonth(month: string): Promise<PaginatedFixtures> {
  const raw = await fetchScoreboardByMonth(month);
  const events = Array.isArray(raw?.events) ? raw.events : [];
  return {
    matches: normalizeMatches(raw),
    limited: events.length >= 1000,
  };
}

export async function getLeagueFixtures(
  league: League,
  season: number,
): Promise<Match[]> {
  const raw = await fetchLeagueScoreboard(league.slug, season);
  const all = normalizeMatches(raw, league);
  return all.filter((match) => !match.season || match.season === season);
}

export async function getStandings(
  league: League,
  season: number,
): Promise<Loaded<StandingGroup[]>> {
  try {
    const raw = await fetchStandings(league.slug, season);
    const groups = normalizeStandings(raw);
    return {
      data: groups,
      available: groups.length > 0,
      reason:
        groups.length > 0
          ? undefined
          : "ESPN has not published a table for this competition and season.",
    };
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) {
      return {
        data: [],
        available: false,
        reason: "Standings are not published for this competition and season.",
      };
    }
    throw error;
  }
}

export async function getScorers(
  league: League,
  season: number,
): Promise<Loaded<ScorerBoard>> {
  try {
    const raw = await fetchStatistics(league.slug, season);
    const board = normalizeScorers(raw);
    const available = board.goals.length > 0 || board.assists.length > 0;
    return {
      data: board,
      available,
      reason: available
        ? undefined
        : "Player leaderboards are not published for this competition and season.",
    };
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) {
      return {
        data: { goals: [], assists: [] },
        available: false,
        reason:
          "Player leaderboards are not published for this competition and season.",
      };
    }
    throw error;
  }
}

export async function getMatchDetails(
  eventId: string,
  fallback?: Match,
): Promise<MatchDetails | null> {
  try {
    const raw = await fetchSummary(eventId);
    return normalizeSummary(raw, eventId, fallback);
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) return null;
    throw error;
  }
}

export async function getNews(limit = 12): Promise<NewsArticle[]> {
  const raw = await fetchNews(limit);
  return normalizeNews(raw, limit);
}

export async function getRankings(
  gender: RankingGender,
): Promise<RankingBoard> {
  return filterRankings(await fetchRankings(gender), gender);
}

function filterRankings(board: RankingBoard, gender: RankingGender): RankingBoard {
  return { ...board, gender };
}

export async function searchAll(query: string): Promise<SearchResults & {
  teamsAvailable: boolean;
}> {
  const needle = query.trim().toLowerCase();
  const leagues = needle
    ? LEAGUES.filter((league) => {
        const haystack = [
          league.name,
          league.abbreviation,
          league.country,
          league.region,
          ...league.aliases,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      }).slice(0, 12)
    : [];

  if (!needle) {
    return { query: "", leagues: [], teams: [], teamsAvailable: true };
  }

  try {
    const raw = await fetchEspnSearch(query.trim());
    const teams = normalizeSearchTeams(raw);
    return { query: query.trim(), leagues, teams, teamsAvailable: true };
  } catch {
    return {
      query: query.trim(),
      leagues,
      teams: [],
      teamsAvailable: false,
    };
  }
}

export async function getTeamPage(
  teamId: string,
  requestedSeason?: string | null,
): Promise<TeamPageData | null> {
  let profileRaw: any;
  try {
    profileRaw = await fetchTeam(teamId);
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 404) return null;
    throw error;
  }

  const profile = normalizeTeamProfile(profileRaw);
  if (!profile) return null;

  const league =
    findLeagueByEspnId(profile.leagueEspnId) ??
    getLeague(profile.leagueSlug) ??
    undefined;
  const season = resolveSeason(league, requestedSeason);
  const seasonLabel = profile.seasonSummary;

  let fixtures: TeamPageData["fixtures"] = [];
  try {
    const scheduleRaw = await fetchTeamSchedule(teamId, season);
    fixtures = normalizeTeamFixtures(scheduleRaw, teamId);
  } catch (error) {
    if (!(error instanceof UpstreamError && error.status === 404)) throw error;
  }

  return {
    team: {
      ...profile,
      seasonSummary: seasonLabel ?? profile.seasonSummary,
    },
    fixtures,
    league,
    season,
  };
}

export function defaultSeasonFor(league: League): number {
  return getDefaultSeason(league);
}

export function seasonRange(league: League): number[] {
  return seasonsFor(league);
}
