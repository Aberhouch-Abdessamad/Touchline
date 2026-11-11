import { apiError, apiOk } from "@/lib/api-response";
import { ensureFresh } from "@/lib/predictions/maintain";
import { parseHistoryFilter } from "@/lib/predictions/query";
import { getHistory } from "@/lib/predictions/stats";
import type { ApiMeta } from "@/lib/types";

const meta = (): ApiMeta => ({
  source: "Touchline AI prediction ledger",
  attribution:
    "Predictions by Touchline AI; actual results and statistics from ESPN's public soccer API.",
  fetchedAt: new Date().toISOString(),
  cacheSeconds: 30,
});

/** GET /api/predictions/history?status=all|correct|incorrect|pending&competition=&from=&to=&page= */
export async function GET(request: Request) {
  try {
    ensureFresh();
    const { searchParams } = new URL(request.url);
    const data = await getHistory(parseHistoryFilter((key) => searchParams.get(key)));
    return apiOk(data, meta(), 30);
  } catch (error) {
    return apiError(error, "Prediction history could not be loaded.");
  }
}
