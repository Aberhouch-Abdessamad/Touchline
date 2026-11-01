import { getAllLeagues } from "@/lib/api";
import { apiOk } from "@/lib/api-response";
import { cleanQuery } from "@/lib/validation";

/**
 * GET /api/leagues
 *   ?q=            free-text search across name, country, aliases
 *   ?region=       Europe, South America, …
 *   ?type=         club | national
 *   ?gender=       men | women
 *   ?format=       league | cup | qualifier | friendly
 *   ?featured=     true | false
 *
 * The catalogue is cached metadata generated from ESPN's public core API, so
 * this handler never touches the network.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = cleanQuery(searchParams.get("q")).toLowerCase();
  const region = cleanQuery(searchParams.get("region"));
  const type = cleanQuery(searchParams.get("type"));
  const gender = cleanQuery(searchParams.get("gender"));
  const format = cleanQuery(searchParams.get("format"));
  const featured = searchParams.get("featured");

  const leagues = getAllLeagues().filter((league) => {
    if (region && league.region !== region) return false;
    if (type && league.type !== type) return false;
    if (gender && league.gender !== gender) return false;
    if (format && league.format !== format) return false;
    if (featured === "true" && !league.featured) return false;
    if (featured === "false" && league.featured) return false;
    if (!query) return true;
    const haystack = [
      league.name,
      league.abbreviation,
      league.country,
      league.region,
      ...league.aliases,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  return apiOk(
    {
      total: leagues.length,
      leagues,
    },
    {
      source: "ESPN public API",
      attribution: "League metadata cached from ESPN's public core API.",
      fetchedAt: new Date().toISOString(),
      cacheSeconds: 3600,
    },
    3600,
  );
}
