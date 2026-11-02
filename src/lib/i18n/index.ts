/**
 * Public i18n entry point. Everything language-related imports from here:
 *
 *   import { useI18n, T, leagueDisplayName } from "@/lib/i18n";
 *
 * - useI18n()  → { lang, setLang, dir, t, f, d, hydrated, timeZone }
 * - T          → server-renderable translated string by dot-path key
 * - DICT       → both dictionaries, keyed by locale (for provider internals)
 */

export * from "./core";
export type { DictNode } from "./define";
export { DICT, resolveValue, type Dict } from "./dict";
export { createDateFormatters, type DateFormatters } from "./format";
export { leagueDisplayName } from "./leagues-ar";
export { useI18n, type I18nContextValue } from "@/components/providers/PreferencesProvider";
export { T } from "@/components/i18n/T";
