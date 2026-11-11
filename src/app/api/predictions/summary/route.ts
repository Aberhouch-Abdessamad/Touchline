import { apiError, apiOk } from "@/lib/api-response";
import { ensureFresh } from "@/lib/predictions/maintain";
import { parseStatsFilter } from "@/lib/predictions/query";
import { getSummary } from "@/lib/predictions/stats";
import type { ApiMeta } from "@/lib/types";

const meta = (): ApiMeta => ({
  source: "Touchline AI prediction ledger",
  attribution:
    "Predictions by Touchline AI; actual results and statistics from ESPN's public soccer API.",
  fetchedAt: new Date().toISOString(),
  cacheSeconds: 60,
});

/** GET /api/predictions/summary?competition=&season=&from=&to=&category= */
export async function GET(request: Request) {
  try {
    ensureFresh();
    const { searchParams } = new URL(request.url);
    const data = await getSummary(parseStatsFilter((key) => searchParams.get(key)));
    return apiOk(data, meta(), 60);
  } catch (error) {
    return apiError(error, "Prediction statistics could not be computed.");
  }
}
