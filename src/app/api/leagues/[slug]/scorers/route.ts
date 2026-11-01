import { findLeague, getScorers, meta, resolveSeason } from "@/lib/api";
import { apiError, apiNotFound, apiOk } from "@/lib/api-response";

/** GET /api/leagues/[slug]/scorers?season=2026 */
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const league = findLeague(slug);
  if (!league) return apiNotFound(`No competition exists with the slug “${slug}”.`);

  const { searchParams } = new URL(request.url);
  const season = resolveSeason(league, searchParams.get("season"));

  try {
    const result = await getScorers(league, season);
    return apiOk(
      {
        league,
        season,
        available: result.available,
        reason: result.reason,
        goals: result.data.goals,
        assists: result.data.assists,
      },
      meta("espn", 120),
      120,
    );
  } catch (error) {
    return apiError(error, "Player leaderboards could not be loaded from ESPN.");
  }
}
