import { getMatchDetails, meta } from "@/lib/api";
import { apiError, apiNotFound, apiOk } from "@/lib/api-response";
import { isTeamId } from "@/lib/validation";

/** GET /api/match/[id] — full scoreboard summary for one ESPN event. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isTeamId(id)) {
    return apiNotFound("Match ids are numeric ESPN event ids.");
  }

  try {
    const details = await getMatchDetails(id);
    if (!details) {
      return apiNotFound("ESPN has no summary for that match id.");
    }
    return apiOk(details, meta("espn", 30), 30);
  } catch (error) {
    return apiError(error, "Match details could not be loaded from ESPN.");
  }
}
