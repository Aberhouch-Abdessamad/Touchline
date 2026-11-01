import { findLeague, getLeagueFixtures, meta, resolveSeason } from "@/lib/api";
import { apiError, apiNotFound, apiOk } from "@/lib/api-response";

/** GET /api/leagues/[slug]/fixtures?season=2026 */
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
    const matches = await getLeagueFixtures(league, season);
    return apiOk(
      { league, season, matches },
      meta("espn", 120),
      120,
    );
  } catch (error) {
    return apiError(error, "Competition fixtures could not be loaded from ESPN.");
  }
}
