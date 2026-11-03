import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LANG_COOKIE,
  TIMEZONE_COOKIE,
  isLocale,
  isValidTimeZone,
  type Locale,
} from "./core";

/**
 * What the server renders this request as, read from the cookies the boot
 * script (root layout) and `PreferencesProvider` keep in sync with local
 * storage. The language preference itself only lives in local storage —
 * invisible to the server — so rendering without this mirror would leave the
 * server in the default English while the browser switches to the stored
 * language right after mount. Everything streaming in afterwards (the home
 * page's Suspense sections) would then hydrate against stale HTML and React
 * regenerates the tree with hydration mismatch errors.
 *
 * Server-only (uses `next/headers`): import directly from this module, never
 * through `@/lib/i18n`, so client bundles stay clean.
 */
export interface ServerPreferences {
  /** Locale validated against the known locales, defaulting to English. */
  lang: Locale;
  /** Validated IANA time zone, or null when absent/invalid → server renders UTC. */
  timeZone: string | null;
}

export async function serverPreferences(): Promise<ServerPreferences> {
  const store = await cookies();

  const rawLang = store.get(LANG_COOKIE)?.value;
  const rawTimeZone = store.get(TIMEZONE_COOKIE)?.value;

  return {
    lang: isLocale(rawLang) ? rawLang : DEFAULT_LOCALE,
    timeZone: rawTimeZone && isValidTimeZone(rawTimeZone) ? rawTimeZone : null,
  };
}