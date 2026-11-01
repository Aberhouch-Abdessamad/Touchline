/**
 * Editorial ordering for competition lists on the match centre.
 *
 * The big five European leagues lead, followed by the Saudi Pro League and the
 * Moroccan Botola Pro. Everything else keeps alphabetical order so untracked
 * competitions stay predictable.
 */
const PRIORITY_SLUGS = [
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "ksa.1",
  "mar.1",
] as const;

const PRIORITY_NAMES: Array<{ rank: number; pattern: RegExp }> = [
  { rank: 5, pattern: /saudi/i },
  { rank: 6, pattern: /botola|morocc|maroc/i },
];

const FALLBACK_RANK = PRIORITY_SLUGS.length;

/** Lower ranks render first; unknown competitions share the fallback rank. */
export function competitionRank(
  slug: string | null | undefined,
  name: string,
): number {
  const bySlug = slug
    ? PRIORITY_SLUGS.indexOf(slug as (typeof PRIORITY_SLUGS)[number])
    : -1;
  if (bySlug !== -1) return bySlug;

  // Untracked competitions arrive without a slug, so match on their label too.
  const byName = PRIORITY_NAMES.find((entry) => entry.pattern.test(name));
  return byName ? byName.rank : FALLBACK_RANK;
}

export interface RankableCompetition {
  slug?: string | null;
  name: string;
}

export function compareCompetitions(
  a: RankableCompetition,
  b: RankableCompetition,
): number {
  const byRank = competitionRank(a.slug, a.name) - competitionRank(b.slug, b.name);
  return byRank !== 0 ? byRank : a.name.localeCompare(b.name);
}
