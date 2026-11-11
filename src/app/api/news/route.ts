<<<<<<< HEAD
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
=======
import { getNews, meta } from "@/lib/api";
import { apiError, apiOk } from "@/lib/api-response";
import { parseLimit } from "@/lib/validation";
import { localizeNews } from "@/lib/news-translate";
import { isLocale } from "@/lib/i18n/core";

/** GET /api/news?limit=12&lang=ar (lang=ar returns Arabic headlines/summaries when available) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 12, 24);

  try {
    const langParam = searchParams.get("lang");
    const articles = await localizeNews(
      await getNews(limit),
      isLocale(langParam) ? langParam : "en",
    );
    return apiOk({ articles, total: articles.length }, meta("espn", 300), 300);
  } catch (error) {
    return apiError(error, "Football news could not be loaded from ESPN.");
  }
}
>>>>>>> bd33da1bc8aba80a975dcfa5da7ea3857aaecb97
