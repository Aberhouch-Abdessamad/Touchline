import { findLeague, getStandings, meta, resolveSeason } from "@/lib/api";
import { apiError, apiNotFound, apiOk } from "@/lib/api-response";

/** GET /api/leagues/[slug]/standings?season=2026 */
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
    const result = await getStandings(league, season);
    return apiOk(
      {
        league,
        season,
        available: result.available,
        reason: result.reason,
        groups: result.data,
      },
      meta("espn", 120),
      120,
    );
  } catch (error) {
    return apiError(error, "The league table could not be loaded from ESPN.");
  }
}
