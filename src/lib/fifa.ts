/* eslint-disable @typescript-eslint/no-explicit-any */
import { fetchJson } from "./http";
import type { RankingBoard, RankingEntry } from "./types";

const FIFA_RANKINGS = "https://api.fifa.com/api/v3/rankings";

export type RankingGender = "men" | "women";

function genderId(gender: RankingGender): 1 | 2 {
  return gender === "women" ? 2 : 1;
}

function teamName(result: any): string {
  const names = result?.TeamName;
  if (Array.isArray(names) && names.length > 0) {
    const english = names.find((item: any) =>
      String(item?.Locale ?? "").toLowerCase().startsWith("en"),
    );
    return english?.Description ?? names[0]?.Description ?? "Unknown";
  }
  if (typeof names === "string") return names;
  return result?.Name ?? "Unknown";
}

export async function fetchRankings(
  gender: RankingGender,
): Promise<RankingBoard> {
  const raw = await fetchJson<any>(
    `${FIFA_RANKINGS}?gender=${genderId(gender)}&sportId=1&language=en`,
    {
      revalidate: 21_600,
      cacheKey: `fifa-rankings:${gender}`,
      timeoutMs: 25_000,
      retries: 1,
    },
  );

  const results: any[] = Array.isArray(raw?.Results) ? raw.Results : [];
  const entries: RankingEntry[] = results
    .filter((item) => item?.StatusRanked !== 0 && Number(item?.Rank) > 0)
    .map((item) => ({
      rank: Number(item.Rank),
      previousRank: Number.isFinite(Number(item.PrevRank))
        ? Number(item.PrevRank)
        : undefined,
      movement: Number.isFinite(Number(item.RankingMovement))
        ? Number(item.RankingMovement)
        : 0,
      teamId: String(item.IdTeam ?? item.IdCountry ?? item.Rank),
      countryCode: item.IdCountry ? String(item.IdCountry) : undefined,
      name: teamName(item),
      confederation: String(item.ConfederationName ?? "—"),
      points: Number(item.TotalPoints ?? 0),
      matches: Number.isFinite(Number(item.Matches))
        ? Number(item.Matches)
        : undefined,
    }))
    .sort((a, b) => a.rank - b.rank);

  const dates = results
    .map((item) => item?.PubDate)
    .filter((value): value is string => typeof value === "string")
    .sort();

  return {
    gender,
    updatedAt: dates.at(-1),
    entries,
  };
}
