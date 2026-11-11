"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";
import { DICT } from "@/lib/i18n/dict";
import {
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  interpolate,
  isLocale,
  LANG_COOKIE,
  LOCALE_CONFIG,
  TIMEZONE_COOKIE,
  type Locale,
} from "@/lib/i18n/core";
import { createDateFormatters, type DateFormatters } from "@/lib/i18n/format";

export type ThemeChoice = "light" | "dark" | "system";

export interface FavoriteTeam {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  leagueSlug?: string;
}

export interface FavoriteLeague {
  slug: string;
  name: string;
  logo?: string;
}

export interface FavoriteMatch {
  id: string;
  label: string;
  date: string;
}

export interface MatchReminder {
  matchId: string;
  label: string;
  kickoff: string;
}

export interface Preferences {
  theme: ThemeChoice;
  lang: Locale;
  timezone: string | null;
  notifications: boolean;
  favorites: {
    teams: FavoriteTeam[];
    leagues: FavoriteLeague[];
    matches: FavoriteMatch[];
  };
  reminders: MatchReminder[];
}

interface PreferencesContextValue extends Preferences {
  hydrated: boolean;
  timeZone: string;
  setTheme: (theme: ThemeChoice) => void;
  setLang: (lang: Locale) => void;
  setTimezone: (timezone: string | null) => void;
  setNotifications: (enabled: boolean) => void;
  enableNotifications: () => Promise<boolean>;
  isTeamFavorite: (id: string) => boolean;
  isLeagueFavorite: (slug: string) => boolean;
  isMatchFavorite: (id: string) => boolean;
  toggleTeamFavorite: (team: FavoriteTeam) => void;
  toggleLeagueFavorite: (league: FavoriteLeague) => void;
  toggleMatchFavorite: (match: FavoriteMatch) => void;
  addReminder: (reminder: MatchReminder) => void;
  removeReminder: (matchId: string) => void;
  hasReminder: (matchId: string) => boolean;
  resetPreferences: () => void;
  exportPreferences: () => void;
  importPreferences: (json: string) => boolean;
}

const STORAGE_KEY = "touchline.preferences.v1";
const THEME_KEY = "touchline.theme";

/**
 * Language and time zone are mirrored into these cookies (same constants the
 * root layout reads through `serverPreferences`) so a full reload renders the
 * server in the language the browser is already showing.
 */
const COOKIE_ATTRIBUTES = ";path=/;max-age=31536000;samesite=Lax";

function setCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}${COOKIE_ATTRIBUTES}`;
  } catch {
    // Storage can be unavailable in private browsing; the UI still works.
  }
}

function clearCookie(name: string) {
  try {
    document.cookie = `${name}=;path=/;max-age=0`;
  } catch {
    // Ignore.
  }
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  lang: DEFAULT_LOCALE,
  timezone: null,
  notifications: false,
  favorites: { teams: [], leagues: [], matches: [] },
  reminders: [],
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function sanitize(raw: unknown): Preferences {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PREFERENCES;
  const value = raw as Partial<Preferences>;
  const favorites: Partial<Preferences["favorites"]> = value.favorites ?? {};
  const theme: ThemeChoice =
    value.theme === "light" || value.theme === "dark" || value.theme === "system"
      ? value.theme
      : "system";
  return {
    theme,
    lang: isLocale(value.lang) ? value.lang : "en",
    timezone: typeof value.timezone === "string" ? value.timezone : null,
    notifications: Boolean(value.notifications),
    favorites: {
      teams: Array.isArray(favorites.teams)
        ? favorites.teams.filter(
            (team): team is FavoriteTeam =>
              Boolean(team) && typeof team.id === "string" && typeof team.name === "string",
          )
        : [],
      leagues: Array.isArray(favorites.leagues)
        ? favorites.leagues.filter(
            (league): league is FavoriteLeague =>
              Boolean(league) &&
              typeof league.slug === "string" &&
              typeof league.name === "string",
          )
        : [],
      matches: Array.isArray(favorites.matches)
        ? favorites.matches.filter(
            (match): match is FavoriteMatch =>
              Boolean(match) && typeof match.id === "string",
          )
        : [],
    },
    reminders: Array.isArray(value.reminders)
      ? value.reminders.filter(
          (reminder): reminder is MatchReminder =>
            Boolean(reminder) &&
            typeof reminder.matchId === "string" &&
            typeof reminder.kickoff === "string",
        )
      : [],
  };
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function applyTheme(choice: ThemeChoice, root = document.documentElement) {
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const resolved = choice === "system" ? (systemDark ? "dark" : "light") : choice;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage can be unavailable in private browsing; the UI still works.
  }
}

export function PreferencesProvider({
  children,
  initialLang = DEFAULT_LOCALE,
  initialTimeZone,
}: {
  children: ReactNode;
  /**
   * Language the server rendered this request with — seeded from the request
   * cookie in the root layout. Starting the first render with it keeps SSR
   * and the client on one dictionary, including the Suspense sections that
   * stream in after the page has hydrated.
   */
  initialLang?: Locale;
  /** Time zone the server rendered with; null ⇒ the server fell back to UTC. */
  initialTimeZone?: string | null;
}) {
  const [preferences, setPreferences] = useState<Preferences>(() => ({
    ...DEFAULT_PREFERENCES,
    lang: initialLang,
  }));
  const [hydrated, setHydrated] = useState(false);
  const [timeZone, setTimeZone] = useState(initialTimeZone || DEFAULT_TIMEZONE);
  const { push } = useToast();
  const router = useRouter();
  // Internal copy (toasts, notifications) follows the active language.
  const copy = DICT[preferences.lang].common;

  useEffect(() => {
    let stored: Preferences | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = sanitize(JSON.parse(raw));
    } catch {
      stored = null;
    }
    const nextTimeZone = stored?.timezone ?? browserTimeZone();
    setTimeZone(nextTimeZone);
    if (stored && stored.lang !== initialLang) setPreferences(stored);
    setHydrated(true);

    // The server rendered with the cookie-backed locale, so it and the
    // client's first render already agree — including the Suspense sections
    // still streaming in. Only adopt-and-refresh when the two have drifted
    // (first load after a language switch, a cleared cookie, or no stored
    // time zone yet): the boot script re-synced the cookies before React
    // loaded, so the refreshed render matches this browser.
    const drifted =
      (stored !== null && stored.lang !== initialLang) ||
      nextTimeZone !== (initialTimeZone || DEFAULT_TIMEZONE);
    if (drifted) router.refresh();
  }, [initialLang, initialTimeZone, router]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore quota/privacy errors.
    }
  }, [preferences, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(preferences.theme);
    if (preferences.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preferences.theme, hydrated]);

  // Keep <html lang/dir> in sync with the stored language. The inline boot
  // script in the root layout does the same job before hydration; this effect
  // covers subsequent switches.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.lang = preferences.lang;
    root.dir = LOCALE_CONFIG[preferences.lang].dir;
  }, [preferences.lang, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    setTimeZone(preferences.timezone ?? browserTimeZone());
  }, [preferences.timezone, hydrated]);

  const setTheme = useCallback((theme: ThemeChoice) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);

  const setLang = useCallback((lang: Locale) => {
    setPreferences((current) => ({ ...current, lang }));
    setCookie(LANG_COOKIE, lang);
  }, []);

  const setTimezone = useCallback((timezone: string | null) => {
    setPreferences((current) => ({ ...current, timezone }));
    if (timezone) setCookie(TIMEZONE_COOKIE, timezone);
    else clearCookie(TIMEZONE_COOKIE);
  }, []);

  const setNotifications = useCallback((enabled: boolean) => {
    setPreferences((current) => ({ ...current, notifications: enabled }));
  }, []);

  const enableNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      push(copy.notifications.unsupported, "error");
      return false;
    }
    if (Notification.permission === "denied") {
      push(copy.notifications.blocked, "error");
      return false;
    }
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setPreferences((current) => ({ ...current, notifications: granted }));
    if (granted) {
      push(copy.notifications.enabled, "success");
      new Notification(copy.notifications.title, {
        body: copy.notifications.body,
      });
    } else {
      push(copy.notifications.notGranted, "info");
    }
    return granted;
  }, [push, copy]);

  const toggleTeamFavorite = useCallback((team: FavoriteTeam) => {
    setPreferences((current) => {
      const exists = current.favorites.teams.some((item) => item.id === team.id);
      return {
        ...current,
        favorites: {
          ...current.favorites,
          teams: exists
            ? current.favorites.teams.filter((item) => item.id !== team.id)
            : [...current.favorites.teams, team],
        },
      };
    });
  }, []);

  const toggleLeagueFavorite = useCallback((league: FavoriteLeague) => {
    setPreferences((current) => {
      const exists = current.favorites.leagues.some(
        (item) => item.slug === league.slug,
      );
      return {
        ...current,
        favorites: {
          ...current.favorites,
          leagues: exists
            ? current.favorites.leagues.filter((item) => item.slug !== league.slug)
            : [...current.favorites.leagues, league],
        },
      };
    });
  }, []);

  const toggleMatchFavorite = useCallback((match: FavoriteMatch) => {
    setPreferences((current) => {
      const exists = current.favorites.matches.some(
        (item) => item.id === match.id,
      );
      return {
        ...current,
        favorites: {
          ...current.favorites,
          matches: exists
            ? current.favorites.matches.filter((item) => item.id !== match.id)
            : [...current.favorites.matches, match],
        },
      };
    });
  }, []);

  const addReminder = useCallback((reminder: MatchReminder) => {
    setPreferences((current) => ({
      ...current,
      reminders: [
        ...current.reminders.filter((item) => item.matchId !== reminder.matchId),
        reminder,
      ],
    }));
  }, []);

  const removeReminder = useCallback((matchId: string) => {
    setPreferences((current) => ({
      ...current,
      reminders: current.reminders.filter((item) => item.matchId !== matchId),
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    clearCookie(LANG_COOKIE);
    clearCookie(TIMEZONE_COOKIE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
    push(copy.notifications.preferencesCleared, "info");
  }, [push, copy]);

  const exportPreferences = useCallback(() => {
    const blob = new Blob([JSON.stringify(preferences, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "touchline-preferences.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    push(copy.notifications.exported, "success");
  }, [preferences, push, copy]);

  const importPreferences = useCallback(
    (json: string) => {
      try {
        const parsed = sanitize(JSON.parse(json));
        setPreferences(parsed);
        setCookie(LANG_COOKIE, parsed.lang);
        if (parsed.timezone) setCookie(TIMEZONE_COOKIE, parsed.timezone);
        else clearCookie(TIMEZONE_COOKIE);
        push(copy.notifications.imported, "success");
        return true;
      } catch {
        push(copy.notifications.importInvalid, "error");
        return false;
      }
    },
    [push, copy],
  );

  const isTeamFavorite = useCallback(
    (id: string) => preferences.favorites.teams.some((team) => team.id === id),
    [preferences.favorites.teams],
  );
  const isLeagueFavorite = useCallback(
    (slug: string) =>
      preferences.favorites.leagues.some((league) => league.slug === slug),
    [preferences.favorites.leagues],
  );
  const isMatchFavorite = useCallback(
    (id: string) =>
      preferences.favorites.matches.some((match) => match.id === id),
    [preferences.favorites.matches],
  );
  const hasReminder = useCallback(
    (matchId: string) =>
      preferences.reminders.some((reminder) => reminder.matchId === matchId),
    [preferences.reminders],
  );

  // Reminders are best-effort: browsers throttle timers in background tabs, so
  // the calendar export is still the reliable option. We fire once when the
  // kick-off time has passed within the last ten minutes and remove the entry.
  useEffect(() => {
    if (!hydrated || !preferences.notifications) return;
    const check = () => {
      const now = Date.now();
      for (const reminder of preferences.reminders) {
        const kickoff = new Date(reminder.kickoff).getTime();
        if (!Number.isFinite(kickoff)) continue;
        if (kickoff <= now && now - kickoff < 10 * 60 * 1000) {
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification(interpolate(copy.notifications.kickoffTitle, { label: reminder.label }), {
              body: copy.notifications.kickoffBody,
              tag: reminder.matchId,
            });
          }
          push(interpolate(copy.notifications.kickoffTitle, { label: reminder.label }), "info");
          removeReminder(reminder.matchId);
        }
      }
    };
    check();
    const interval = window.setInterval(check, 30_000);
    return () => window.clearInterval(interval);
  }, [
    hydrated,
    preferences.notifications,
    preferences.reminders,
    push,
    copy,
    removeReminder,
  ]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ...preferences,
      hydrated,
      timeZone,
      setTheme,
      setLang,
      setTimezone,
      setNotifications,
      enableNotifications,
      isTeamFavorite,
      isLeagueFavorite,
      isMatchFavorite,
      toggleTeamFavorite,
      toggleLeagueFavorite,
      toggleMatchFavorite,
      addReminder,
      removeReminder,
      hasReminder,
      resetPreferences,
      exportPreferences,
      importPreferences,
    }),
    [
      preferences,
      hydrated,
      timeZone,
      setTheme,
      setLang,
      setTimezone,
      setNotifications,
      enableNotifications,
      isTeamFavorite,
      isLeagueFavorite,
      isMatchFavorite,
      toggleTeamFavorite,
      toggleLeagueFavorite,
      toggleMatchFavorite,
      addReminder,
      removeReminder,
      hasReminder,
      resetPreferences,
      exportPreferences,
      importPreferences,
    ],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used inside PreferencesProvider");
  }
  return context;
}

/**
 * The active dictionary without the strict provider requirement. Components
 * rendered outside the preferences tree (prerendered error boundaries and
 * friends) still resolve copy — in English, the baseline language.
 */
export function useDict(): (typeof DICT)["en"] {
  const context = useContext(PreferencesContext);
  return DICT[context?.lang ?? "en"];
}

export interface I18nContextValue {
  /** Active UI language. */
  lang: Locale;
  /** Switch the UI language; persists to local storage. */
  setLang: (lang: Locale) => void;
  /** Text direction for the active language (`dir` attribute value). */
  dir: "ltr" | "rtl";
  /** Full translated dictionary for the active language. */
  t: (typeof DICT)["en"];
  /** Placeholder interpolation: `f(t.x.inDays, { n: 3 })`. */
  f: typeof interpolate;
  /** Locale-aware date/time formatters bound to the user's timezone. */
  d: DateFormatters;
  /** True once stored preferences have been read in the browser. */
  hydrated: boolean;
  /** The user's preferred timezone (from preferences or the browser). */
  timeZone: string;
}

/**
 * Language + formatting helpers derived from the preferences store. Always
 * call both hooks together when a component needs timezone-aware dates.
 */
export function useI18n(): I18nContextValue {
  const prefs = usePreferences();
  return useMemo(
    () => ({
      lang: prefs.lang,
      setLang: prefs.setLang,
      dir: LOCALE_CONFIG[prefs.lang].dir,
      t: DICT[prefs.lang],
      f: interpolate,
      d: createDateFormatters(prefs.lang, prefs.timeZone),
      hydrated: prefs.hydrated,
      timeZone: prefs.timeZone,
    }),
    [prefs.lang, prefs.timeZone, prefs.hydrated, prefs.setLang],
  );
}
