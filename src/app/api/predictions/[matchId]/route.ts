import { NextResponse } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { getDetail } from "@/lib/predictions/stats";
import { verifyMatch } from "@/lib/predictions/verify";
import { isTeamId } from "@/lib/validation";
import type { ApiMeta } from "@/lib/types";

const meta = (): ApiMeta => ({
  source: "Touchline AI prediction ledger",
  attribution:
    "Predictions by Touchline AI; actual results and statistics from ESPN's public soccer API.",
  fetchedAt: new Date().toISOString(),
  cacheSeconds: 30,
});

/** GET /api/predictions/:matchId — original prediction, actual result, evaluation. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await context.params;
  if (!isTeamId(matchId)) {
    return NextResponse.json(
      { error: { message: "Invalid match id.", status: 400, code: "invalid_id" } },
      { status: 400 },
    );
  }
  try {
    // Make sure a finished match is verified before it is shown as pending.
    await verifyMatch(matchId).catch(() => null);
    const detail = await getDetail(matchId);
    if (!detail) {
      return NextResponse.json(
        {
          error: {
            message: "No stored prediction exists for that match.",
            status: 404,
            code: "not_found",
          },
        },
        { status: 404 },
      );
    }
    return apiOk(detail, meta(), 30);
  } catch (error) {
    return apiError(error, "The prediction could not be loaded.");
  }
}
