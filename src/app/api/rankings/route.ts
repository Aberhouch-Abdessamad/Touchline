import { getRankings, meta } from "@/lib/api";
import { apiBadRequest, apiError, apiOk } from "@/lib/api-response";
import { cleanQuery, parseLimit } from "@/lib/validation";

/**
 * GET /api/rankings
 *   ?gender=men|women        (default: men)
 *   ?confederation=UEFA      optional exact filter
 *   ?limit=1..211            optional
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genderParam = searchParams.get("gender") ?? "men";
  if (genderParam !== "men" && genderParam !== "women") {
    return apiBadRequest("`gender` must be either “men” or “women”.");
  }

  const confederation = cleanQuery(searchParams.get("confederation"));
  const limit = parseLimit(searchParams.get("limit"), 211, 211);

  try {
    const board = await getRankings(genderParam);
    const filtered = confederation
      ? board.entries.filter((entry) => entry.confederation === confederation)
      : board.entries;

    return apiOk(
      {
        ...board,
        entries: filtered.slice(0, limit),
        total: filtered.length,
      },
      meta("fifa", 21_600),
      21_600,
    );
  } catch (error) {
    return apiError(error, "FIFA rankings could not be loaded.");
  }
}
