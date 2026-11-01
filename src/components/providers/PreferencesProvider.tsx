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
import { useToast } from "./ToastProvider";

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

const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
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

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [timeZone, setTimeZone] = useState("UTC");
  const { push } = useToast();

  useEffect(() => {
    let stored: Preferences | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stored = sanitize(JSON.parse(raw));
    } catch {
      stored = null;
    }
    if (stored) setPreferences(stored);
    setTimeZone(stored?.timezone ?? browserTimeZone());
    setHydrated(true);
  }, []);

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

  useEffect(() => {
    if (!hydrated) return;
    setTimeZone(preferences.timezone ?? browserTimeZone());
  }, [preferences.timezone, hydrated]);

  const setTheme = useCallback((theme: ThemeChoice) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);

  const setTimezone = useCallback((timezone: string | null) => {
    setPreferences((current) => ({ ...current, timezone }));
  }, []);

  const setNotifications = useCallback((enabled: boolean) => {
    setPreferences((current) => ({ ...current, notifications: enabled }));
  }, []);

  const enableNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      push("This browser does not support notifications.", "error");
      return false;
    }
    if (Notification.permission === "denied") {
      push(
        "Notifications are blocked for this site. Update the browser's site permissions to allow them.",
        "error",
      );
      return false;
    }
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setPreferences((current) => ({ ...current, notifications: granted }));
    if (granted) {
      push("Match reminders are enabled for this browser.", "success");
      new Notification("Touchline reminders are on", {
        body: "You will be alerted about saved kick-off times while this browser is open.",
      });
    } else {
      push("Notification permission was not granted.", "info");
    }
    return granted;
  }, [push]);

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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
    push("Local preferences cleared.", "info");
  }, [push]);

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
    push("Preferences exported as JSON.", "success");
  }, [preferences, push]);

  const importPreferences = useCallback(
    (json: string) => {
      try {
        const parsed = sanitize(JSON.parse(json));
        setPreferences(parsed);
        push("Preferences imported.", "success");
        return true;
      } catch {
        push("That file is not valid Touchline preferences JSON.", "error");
        return false;
      }
    },
    [push],
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
            new Notification(`Kick-off: ${reminder.label}`, {
              body: "The match is starting now. Open Touchline for live details.",
              tag: reminder.matchId,
            });
          }
          push(`Kick-off: ${reminder.label}`, "info");
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
    removeReminder,
  ]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ...preferences,
      hydrated,
      timeZone,
      setTheme,
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
