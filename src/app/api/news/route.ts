import { getNews, meta } from "@/lib/api";
import { apiError, apiOk } from "@/lib/api-response";
import { parseLimit } from "@/lib/validation";

/** GET /api/news?limit=12 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 12, 24);

  try {
    const articles = await getNews(limit);
    return apiOk({ articles, total: articles.length }, meta("espn", 300), 300);
  } catch (error) {
    return apiError(error, "Football news could not be loaded from ESPN.");
  }
}
