import { meta, searchAll } from "@/lib/api";
import { apiBadRequest, apiError, apiOk } from "@/lib/api-response";
import { cleanQuery } from "@/lib/validation";

/** GET /api/search?q=arsenal — competitions from the local catalogue and ESPN teams. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = cleanQuery(searchParams.get("q"));

  if (query.length < 2) {
    return apiBadRequest("Provide a search term of at least two characters (`q`).");
  }

  try {
    const results = await searchAll(query);
    return apiOk(results, meta("espn", 120), 120);
  } catch (error) {
    return apiError(error, "Search could not be completed.");
  }
}
