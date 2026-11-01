import { getMatchesByDate, getMatchesByMonth, meta } from "@/lib/api";
import { apiBadRequest, apiError, apiOk } from "@/lib/api-response";
import { isIsoDate, isIsoMonth } from "@/lib/validation";

/**
 * GET /api/matches
 *   ?date=YYYY-MM-DD  (default: today)
 *   ?month=YYYY-MM    (returns the month fixture list instead)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month");

  if (date && !isIsoDate(date)) {
    return apiBadRequest("`date` must be a real calendar date formatted YYYY-MM-DD.");
  }
  if (!date && month && !isIsoMonth(month)) {
    return apiBadRequest("`month` must be formatted YYYY-MM.");
  }

  try {
    if (!date && month) {
      const result = await getMatchesByMonth(month);
      return apiOk(
        {
          month,
          matches: result.matches,
          limited: result.limited,
        },
        meta("espn", 120),
        120,
      );
    }

    const target = date ?? new Date().toISOString().slice(0, 10);
    const matches = await getMatchesByDate(target);
    return apiOk({ date: target, matches }, meta("espn", 30), 30);
  } catch (error) {
    return apiError(error, "Fixtures could not be loaded from ESPN.");
  }
}
