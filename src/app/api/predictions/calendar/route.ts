import { apiError, apiOk } from "@/lib/api-response";
import { parseMonthParam, parseStatsFilter } from "@/lib/predictions/query";
import { getCalendar } from "@/lib/predictions/stats";
import type { ApiMeta } from "@/lib/types";

const meta = (): ApiMeta => ({
  source: "Touchline AI prediction ledger",
  attribution:
    "Predictions by Touchline AI; actual results and statistics from ESPN's public soccer API.",
  fetchedAt: new Date().toISOString(),
  cacheSeconds: 60,
});

/** GET /api/predictions/calendar?month=YYYY-MM[&competition=] */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseMonthParam(searchParams.get("month"));
    const days = await getCalendar(month, parseStatsFilter((key) => searchParams.get(key)));
    return apiOk({ month, days }, meta(), 60);
  } catch (error) {
    return apiError(error, "The prediction calendar could not be loaded.");
  }
}
