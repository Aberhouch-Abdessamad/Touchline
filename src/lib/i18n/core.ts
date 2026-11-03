/**
 * Core i18n primitives: locale list, direction, Intl codes and placeholder
 * interpolation. Keep this file free of React so dictionaries stay importable
 * from both server and client code.
 */

export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export interface LocaleConfig {
  /** Human-readable label in the active language. */
  name: string;
  /** The language's own name, always shown in its own locale. */
  native: string;
  dir: "ltr" | "rtl";
  /** BCP-47 tag passed to Intl. Latin digits for Arabic keeps scores readable. */
  intl: string;
}

export const LOCALE_CONFIG: Record<Locale, LocaleConfig> = {
  en: { name: "English", native: "English", dir: "ltr", intl: "en-GB" },
  ar: { name: "Arabic (العربية)", native: "العربية", dir: "rtl", intl: "ar-u-nu-latn" },
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ar";
}

export function localeDir(locale: Locale): "ltr" | "rtl" {
  return LOCALE_CONFIG[locale].dir;
}

/**
 * Preferences that decide how the server renders are mirrored into these
 * cookies — written by the boot script in `app/layout.tsx` and by
 * `PreferencesProvider` on every change — so the server and the browser
 * share one source of truth for the first render (including the Suspense
 * sections that stream in later).
 */
export const LANG_COOKIE = "jdwel.lang";
export const TIMEZONE_COOKIE = "jdwel.tz";

/** Fallback when the time-zone cookie is absent or invalid. */
export const DEFAULT_TIMEZONE = "UTC";

export function isValidTimeZone(value: string): boolean {
  try {
    return (
      new Intl.DateTimeFormat("en", { timeZone: value }).resolvedOptions()
        .timeZone === value
    );
  } catch {
    return false;
  }
}

/**
 * Replace `{name}` placeholders in a dictionary string.
 * Escaped as `{{name}}` to output the literal `{name}`.
 */
export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(
    /\{(\w+)\}|\{\{(\w+)\}\}/g,
    (match, name, escaped) => {
      if (escaped) return `{${escaped}}`;
      return name in vars ? String(vars[name]) : match;
    },
  );
}
