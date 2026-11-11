<<<<<<< HEAD
import { common } from "./domains/common";
import { layout } from "./domains/layout";
import { matches } from "./domains/matches";
import { matchDetails } from "./domains/matchDetails";
import { team } from "./domains/team";
import { competitions } from "./domains/competitions";
import { calendar } from "./domains/calendar";
import { rankings } from "./domains/rankings";
import { news } from "./domains/news";
import { settings } from "./domains/settings";
import { content } from "./domains/content";
import { home } from "./domains/home";
import type { Locale } from "./core";

/** The full dictionary shape, derived from the English domains. */
export type Dict = {
  common: typeof common.en;
  layout: typeof layout.en;
  matches: typeof matches.en;
  matchDetails: typeof matchDetails.en;
  team: typeof team.en;
  competitions: typeof competitions.en;
  calendar: typeof calendar.en;
  rankings: typeof rankings.en;
  news: typeof news.en;
  settings: typeof settings.en;
  content: typeof content.en;
  home: typeof home.en;
};

const en: Dict = {
  common: common.en,
  layout: layout.en,
  matches: matches.en,
  matchDetails: matchDetails.en,
  team: team.en,
  competitions: competitions.en,
  calendar: calendar.en,
  rankings: rankings.en,
  news: news.en,
  settings: settings.en,
  content: content.en,
  home: home.en,
};

const ar: Dict = {
  common: common.ar,
  layout: layout.ar,
  matches: matches.ar,
  matchDetails: matchDetails.ar,
  team: team.ar,
  competitions: competitions.ar,
  calendar: calendar.ar,
  rankings: rankings.ar,
  news: news.ar,
  settings: settings.ar,
  content: content.ar,
  home: home.ar,
};

export const DICT: Record<Locale, Dict> = { en, ar };

/** Dot-path lookup used by the server-renderable <T> component. */
export function resolveValue(dict: unknown, path: string): unknown {
  let current: unknown = dict;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
=======
import { common } from "./domains/common";
import { layout } from "./domains/layout";
import { matches } from "./domains/matches";
import { matchDetails } from "./domains/matchDetails";
import { team } from "./domains/team";
import { competitions } from "./domains/competitions";
import { calendar } from "./domains/calendar";
import { rankings } from "./domains/rankings";
import { news } from "./domains/news";
import { settings } from "./domains/settings";
import { content } from "./domains/content";
import { home } from "./domains/home";
import { predictions } from "./domains/predictions";
import type { Locale } from "./core";

/** The full dictionary shape, derived from the English domains. */
export type Dict = {
  common: typeof common.en;
  layout: typeof layout.en;
  matches: typeof matches.en;
  matchDetails: typeof matchDetails.en;
  team: typeof team.en;
  competitions: typeof competitions.en;
  calendar: typeof calendar.en;
  rankings: typeof rankings.en;
  news: typeof news.en;
  settings: typeof settings.en;
  content: typeof content.en;
  home: typeof home.en;
  predictions: typeof predictions.en;
};

const en: Dict = {
  common: common.en,
  layout: layout.en,
  matches: matches.en,
  matchDetails: matchDetails.en,
  team: team.en,
  competitions: competitions.en,
  calendar: calendar.en,
  rankings: rankings.en,
  news: news.en,
  settings: settings.en,
  content: content.en,
  home: home.en,
  predictions: predictions.en,
};

const ar: Dict = {
  common: common.ar,
  layout: layout.ar,
  matches: matches.ar,
  matchDetails: matchDetails.ar,
  team: team.ar,
  competitions: competitions.ar,
  calendar: calendar.ar,
  rankings: rankings.ar,
  news: news.ar,
  settings: settings.ar,
  content: content.ar,
  home: home.ar,
  predictions: predictions.ar,
};

export const DICT: Record<Locale, Dict> = { en, ar };

/** Dot-path lookup used by the server-renderable <T> component. */
export function resolveValue(dict: unknown, path: string): unknown {
  let current: unknown = dict;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
>>>>>>> bd33da1bc8aba80a975dcfa5da7ea3857aaecb97
