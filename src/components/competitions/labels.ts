import type { Dict } from "@/lib/i18n/dict";

type CompetitionsDict = Dict["competitions"];
type RegionKey = keyof CompetitionsDict["filters"]["regions"];
type TypeKey = keyof CompetitionsDict["filters"]["types"];
type FormatKey = keyof CompetitionsDict["filters"]["formats"];
type GenderKey = keyof CompetitionsDict["filters"]["genders"];

/**
 * Maps data values from the league catalog (ESPN regions, type/format/gender
 * codes) onto the typed dictionary labels. Anything outside the known set
 * falls back to the raw ESPN value, so a new region never regresses to a
 * missing label.
 */
const REGION_KEYS: Record<string, RegionKey> = {
  Europe: "europe",
  "South America": "southAmerica",
  "North America": "northAmerica",
  Asia: "asia",
  Africa: "africa",
  Oceania: "oceania",
  World: "world",
};

const TYPE_KEYS: Record<string, TypeKey> = {
  club: "club",
  national: "national",
};

const FORMAT_KEYS: Record<string, FormatKey> = {
  league: "league",
  cup: "cup",
  qualifier: "qualifier",
  friendly: "friendly",
};

const GENDER_KEYS: Record<string, GenderKey> = {
  men: "men",
  women: "women",
};

/**
 * Translated display label for a data-driven value. `t` is the active
 * dictionary from `useI18n()`.
 */
export function regionLabel(t: Dict, region: string): string {
  const key = REGION_KEYS[region];
  return key ? t.competitions.filters.regions[key] : region;
}

export function typeLabel(t: Dict, type: string): string {
  const key = TYPE_KEYS[type];
  return key ? t.competitions.filters.types[key] : type;
}

export function formatLabel(t: Dict, format: string): string {
  const key = FORMAT_KEYS[format];
  return key ? t.competitions.filters.formats[key] : format;
}

export function genderLabel(t: Dict, gender: string): string {
  const key = GENDER_KEYS[gender];
  return key ? t.competitions.filters.genders[key] : gender;
}
