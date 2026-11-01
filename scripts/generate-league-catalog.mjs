/**
 * Regenerates the league catalogue from ESPN's public core API.
 * Run with: node scripts/generate-league-catalog.mjs
 *
 * The catalogue is metadata only: live results, tables and fixtures are
 * always requested from the upstream APIs at runtime.
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const entries = [
  // Domestic leagues
  ["eng.1", "England", "Europe", "club", "men", "league", 1, true, ["epl", "premier league", "english premier league"]],
  ["esp.1", "Spain", "Europe", "club", "men", "league", 2, true, ["laliga", "la liga", "spanish laliga"]],
  ["ita.1", "Italy", "Europe", "club", "men", "league", 3, true, ["serie a", "italian serie a"]],
  ["ger.1", "Germany", "Europe", "club", "men", "league", 4, true, ["bundesliga", "german bundesliga"]],
  ["fra.1", "France", "Europe", "club", "men", "league", 5, true, ["ligue 1", "french ligue 1"]],
  ["eng.2", "England", "Europe", "club", "men", "league", 21, false, ["championship", "english championship"]],
  ["esp.2", "Spain", "Europe", "club", "men", "league", 22, false, ["laliga 2", "segunda division"]],
  ["ger.2", "Germany", "Europe", "club", "men", "league", 23, false, ["2. bundesliga", "zweite bundesliga"]],
  ["ita.2", "Italy", "Europe", "club", "men", "league", 24, false, ["serie b", "italian serie b"]],
  ["fra.2", "France", "Europe", "club", "men", "league", 25, false, ["ligue 2", "french ligue 2"]],
  ["ned.1", "Netherlands", "Europe", "club", "men", "league", 26, false, ["eredivisie", "dutch eredivisie"]],
  ["por.1", "Portugal", "Europe", "club", "men", "league", 27, false, ["primeira liga", "liga portugal"]],
  ["sco.1", "Scotland", "Europe", "club", "men", "league", 28, false, ["scottish premiership", "spfl"]],
  ["tur.1", "Türkiye", "Europe", "club", "men", "league", 29, false, ["super lig", "turkish super lig"]],
  ["bel.1", "Belgium", "Europe", "club", "men", "league", 30, false, ["belgian pro league", "pro league"]],
  ["gre.1", "Greece", "Europe", "club", "men", "league", 31, false, ["greek super league"]],
  ["sui.1", "Switzerland", "Europe", "club", "men", "league", 32, false, ["swiss super league"]],
  ["aut.1", "Austria", "Europe", "club", "men", "league", 33, false, ["austrian bundesliga"]],
  ["den.1", "Denmark", "Europe", "club", "men", "league", 34, false, ["danish superliga"]],
  ["nor.1", "Norway", "Europe", "club", "men", "league", 35, false, ["eliteserien", "norwegian eliteserien"]],
  ["swe.1", "Sweden", "Europe", "club", "men", "league", 36, false, ["allsvenskan", "swedish allsvenskan"]],
  ["rus.1", "Russia", "Europe", "club", "men", "league", 37, false, ["russian premier league"]],
  ["bra.1", "Brazil", "South America", "club", "men", "league", 38, false, ["brasileirao", "brazilian serie a"]],
  ["arg.1", "Argentina", "South America", "club", "men", "league", 39, false, ["liga profesional", "argentine primera"]],
  ["usa.1", "United States", "North America", "club", "men", "league", 40, true, ["mls", "major league soccer"]],
  ["mex.1", "Mexico", "North America", "club", "men", "league", 41, true, ["liga mx", "liga bbva mx"]],
  ["ksa.1", "Saudi Arabia", "Asia", "club", "men", "league", 42, false, ["saudi pro league"]],
  ["aus.1", "Australia", "Oceania", "club", "men", "league", 43, false, ["a-league", "a league men"]],
  ["jpn.1", "Japan", "Asia", "club", "men", "league", 44, false, ["j league", "japanese j.league"]],

  // Club cups and continental competitions
  ["uefa.champions", "Europe", "Europe", "club", "men", "cup", 6, true, ["ucl", "champions league", "uefa champions league"]],
  ["uefa.europa", "Europe", "Europe", "club", "men", "cup", 7, true, ["uel", "europa league"]],
  ["uefa.europa.conf", "Europe", "Europe", "club", "men", "cup", 45, false, ["conference league", "uecl"]],
  ["uefa.champions_qual", "Europe", "Europe", "club", "men", "qualifier", 46, false, ["champions league qualifying", "ucl qualifying"]],
  ["conmebol.libertadores", "South America", "South America", "club", "men", "cup", 8, true, ["libertadores", "copa libertadores"]],
  ["concacaf.champions", "North America", "North America", "club", "men", "cup", 47, false, ["concacaf champions cup"]],
  ["afc.champions", "Asia", "Asia", "club", "men", "cup", 48, false, ["afc champions league", "afc champions league elite"]],
  ["uefa.super_cup", "Europe", "Europe", "club", "men", "cup", 49, false, ["uefa super cup"]],
  ["fifa.cwc", "World", "World", "club", "men", "cup", 9, true, ["club world cup", "fifa club world cup"]],
  ["eng.fa", "England", "Europe", "club", "men", "cup", 50, false, ["fa cup", "english fa cup"]],
  ["eng.league_cup", "England", "Europe", "club", "men", "cup", 51, false, ["carabao cup", "efl cup", "league cup"]],
  ["esp.copa_del_rey", "Spain", "Europe", "club", "men", "cup", 52, false, ["copa del rey"]],
  ["ita.coppa_italia", "Italy", "Europe", "club", "men", "cup", 53, false, ["coppa italia"]],
  ["ger.dfb_pokal", "Germany", "Europe", "club", "men", "cup", 54, false, ["dfb pokal", "german cup"]],
  ["fra.coupe_de_france", "France", "Europe", "club", "men", "cup", 55, false, ["coupe de france"]],
  ["eng.trophy", "England", "Europe", "club", "men", "cup", 56, false, ["efl trophy", "football league trophy"]],

  // Women's club competitions
  ["eng.w.1", "England", "Europe", "club", "women", "league", 10, true, ["wsl", "women's super league"]],
  ["esp.w.1", "Spain", "Europe", "club", "women", "league", 57, false, ["liga f", "spanish liga f"]],
  ["fra.w.1", "France", "Europe", "club", "women", "league", 58, false, ["premiere ligue", "french premiere ligue"]],
  ["usa.nwsl", "United States", "North America", "club", "women", "league", 59, false, ["nwsl"]],
  ["mex.w.1", "Mexico", "North America", "club", "women", "league", 60, false, ["liga mx femenil"]],
  ["usa.w.usl.1", "United States", "North America", "club", "women", "league", 61, false, ["usl super league"]],
  ["uefa.wchampions", "Europe", "Europe", "club", "women", "cup", 62, false, ["women's champions league", "uwcl"]],
  ["eng.w.fa", "England", "Europe", "club", "women", "cup", 63, false, ["women's fa cup"]],

  // National team competitions
  ["fifa.world", "World", "World", "national", "men", "cup", 11, true, ["world cup", "fifa world cup"]],
  ["fifa.wwc", "World", "World", "national", "women", "cup", 12, true, ["women's world cup", "fifa women's world cup"]],
  ["uefa.euro", "Europe", "Europe", "national", "men", "cup", 13, true, ["euro", "european championship", "uefa euro"]],
  ["uefa.weuro", "Europe", "Europe", "national", "women", "cup", 64, false, ["women's euro", "uefa women's euro"]],
  ["uefa.nations", "Europe", "Europe", "national", "men", "cup", 65, false, ["nations league", "uefa nations league"]],
  ["uefa.w.nations", "Europe", "Europe", "national", "women", "cup", 66, false, ["women's nations league"]],
  ["uefa.euroq", "Europe", "Europe", "national", "men", "qualifier", 67, false, ["euro qualifying", "european championship qualifying"]],
  ["conmebol.america", "South America", "South America", "national", "men", "cup", 68, false, ["copa america"]],
  ["conmebol.america.femenina", "South America", "South America", "national", "women", "cup", 69, false, ["copa america femenina"]],
  ["caf.nations", "Africa", "Africa", "national", "men", "cup", 14, true, ["afcon", "africa cup of nations"]],
  ["concacaf.gold", "North America", "North America", "national", "men", "cup", 70, false, ["gold cup", "concacaf gold cup"]],
  ["fifa.friendly", "World", "World", "national", "men", "friendly", 71, false, ["international friendly", "friendlies"]],
  ["fifa.friendly.w", "World", "World", "national", "women", "friendly", 72, false, ["women's international friendly", "women's friendlies"]],
  ["fifa.worldq.uefa", "Europe", "Europe", "national", "men", "qualifier", 73, false, ["world cup qualifying uefa", "wcq uefa"]],
  ["fifa.worldq.conmebol", "South America", "South America", "national", "men", "qualifier", 74, false, ["world cup qualifying conmebol", "wcq conmebol"]],
  ["fifa.worldq.concacaf", "North America", "North America", "national", "men", "qualifier", 75, false, ["world cup qualifying concacaf", "wcq concacaf"]],
  ["fifa.worldq.caf", "Africa", "Africa", "national", "men", "qualifier", 76, false, ["world cup qualifying caf", "wcq caf"]],
  ["fifa.worldq.afc", "Asia", "Asia", "national", "men", "qualifier", 77, false, ["world cup qualifying afc", "wcq afc"]],
  ["fifa.worldq.ofc", "Oceania", "Oceania", "national", "men", "qualifier", 78, false, ["world cup qualifying ofc", "wcq ofc"]],

  // Youth and Olympic tournaments
  ["uefa.euro_u21", "Europe", "Europe", "national", "men", "cup", 79, false, ["under-21", "u21 euro", "uefa euro u21"]],
  ["fifa.world.u20", "World", "World", "national", "men", "cup", 80, false, ["under-20", "u20 world cup", "fifa u20 world cup"]],
  ["fifa.olympics", "World", "World", "national", "men", "cup", 81, false, ["olympic football", "men's olympics"]],
  ["fifa.w.olympics", "World", "World", "national", "women", "cup", 82, false, ["women's olympic football", "women's olympics"]],
];

const endpoint = (slug) =>
  `https://sports.core.api.espn.com/v2/sports/soccer/leagues/${slug}?lang=en&region=us`;

async function fetchLeague(slug) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(endpoint(slug), {
        headers: { Accept: "application/json" },
      });
      if (res.ok) return await res.json();
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  throw new Error(`Unable to fetch league ${slug}`);
}

const results = [];
for (let i = 0; i < entries.length; i += 4) {
  const batch = entries.slice(i, i + 4);
  const settled = await Promise.allSettled(batch.map((entry) => fetchLeague(entry[0])));
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      console.warn(result.reason.message);
      return;
    }
    const [slug, country, region, type, gender, format, order, featured, aliases] = batch[index];
    const data = result.value;
    results.push({
      slug,
      espnId: String(data.id),
      name: data.name,
      abbreviation: data.abbreviation ?? data.name,
      country,
      region,
      type,
      gender,
      format,
      youth: /u21|u20|olympic/i.test(slug) || /under-21|under-20|u21|u20|olympic/i.test(data.name),
      featured: Boolean(featured),
      order,
      logo: data.logos?.[0]?.href ?? null,
      aliases,
    });
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
}

results.sort((a, b) => a.order - b.order);

const banner = `// Generated by scripts/generate-league-catalog.mjs.
// Metadata is cached from ESPN's public league API; live data is fetched at runtime.
`;
const source = `${banner}
export type LeagueType = "club" | "national";
export type LeagueGender = "men" | "women";
export type LeagueFormat = "league" | "cup" | "qualifier" | "friendly";

export interface League {
  slug: string;
  espnId: string;
  name: string;
  abbreviation: string;
  country: string;
  region: string;
  type: LeagueType;
  gender: LeagueGender;
  format: LeagueFormat;
  youth: boolean;
  featured: boolean;
  order: number;
  logo: string | null;
  aliases: string[];
}

export const LEAGUES: League[] = ${JSON.stringify(results, null, 2)};

export const FEATURED_LEAGUES = LEAGUES.filter((league) => league.featured);

const bySlug = new Map(LEAGUES.map((league) => [league.slug, league]));

export function getLeague(slug: string | undefined | null): League | undefined {
  if (!slug) return undefined;
  return bySlug.get(slug);
}

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function findLeagueByName(name: string | undefined | null): League | undefined {
  if (!name) return undefined;
  const needle = normalise(name);
  if (!needle) return undefined;

  for (const league of LEAGUES) {
    const candidates = [league.name, league.abbreviation, ...league.aliases];
    if (candidates.some((candidate) => normalise(candidate) === needle)) return league;
  }
  for (const league of LEAGUES) {
    const candidates = [league.name, league.abbreviation, ...league.aliases];
    if (candidates.some((candidate) => normalise(candidate).includes(needle) || needle.includes(normalise(candidate)))) {
      return league;
    }
  }
  return undefined;
}
`;

await writeFile(resolve(root, "src/data/leagues.ts"), source, "utf8");
console.log(`Wrote ${results.length} leagues to src/data/leagues.ts`);
