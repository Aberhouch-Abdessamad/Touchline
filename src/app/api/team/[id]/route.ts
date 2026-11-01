import { getTeamPage, meta } from "@/lib/api";
import { apiError, apiNotFound, apiOk } from "@/lib/api-response";
import { isTeamId } from "@/lib/validation";

/** GET /api/team/[id]?season=2026 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!isTeamId(id)) return apiNotFound("Team ids are numeric ESPN team ids.");

  const { searchParams } = new URL(request.url);

  try {
    const page = await getTeamPage(id, searchParams.get("season"));
    if (!page) return apiNotFound("ESPN has no team profile for that id.");
    return apiOk(page, meta("espn", 300), 300);
  } catch (error) {
    return apiError(error, "The team profile could not be loaded from ESPN.");
  }
}
