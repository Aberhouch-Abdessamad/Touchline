"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellRing,
  Check,
  Clock3,
  Download,
  Monitor,
  Moon,
  RotateCcw,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  usePreferences,
  type ThemeChoice,
} from "@/components/providers/PreferencesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { EmptyState } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

const THEMES: Array<{
  value: ThemeChoice;
  label: string;
  icon: typeof Sun;
  description: string;
}> = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Warm paper background, dark ink.",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    description: "Deep green background for night matches.",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "Follow the operating system setting.",
  },
];

const FALLBACK_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Zurich",
  "Europe/Athens",
  "Europe/Istanbul",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Asia/Jerusalem",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Toronto",
];

function supportedTimeZones(): string[] {
  const intl = Intl as unknown as {
    supportedValuesOf?: (key: string) => string[];
  };
  try {
    const zones = intl.supportedValuesOf?.("timeZone");
    if (zones && zones.length > 0) return zones;
  } catch {
    // Older browsers do not implement supportedValuesOf.
  }
  return FALLBACK_TIMEZONES;
}

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <div className="settings-section__head">
        <h2 className="settings-section__title">
          {icon}
          {title}
        </h2>
        <p className="settings-section__description">{description}</p>
      </div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="settings-grid" aria-hidden="true">
      {[0, 1, 2].map((section) => (
        <div className="settings-section" key={section}>
          <div className="settings-section__head">
            <span
              style={{
                display: "block",
                width: 180,
                height: 16,
                borderRadius: 6,
                background: "var(--surface-soft)",
              }}
            />
            <span
              style={{
                display: "block",
                width: "55%",
                height: 11,
                marginTop: 8,
                borderRadius: 6,
                background: "var(--surface-soft)",
              }}
            />
          </div>
          <div className="settings-section__body">
            <span
              style={{
                display: "block",
                height: 42,
                borderRadius: 10,
                background: "var(--surface-soft)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsPanel() {
  const preferences = usePreferences();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setZones(supportedTimeZones());
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const zoneOptions = useMemo(() => {
    const list = zones.length > 0 ? zones : FALLBACK_TIMEZONES;
    const selected = preferences.timezone ?? preferences.timeZone;
    return Array.from(new Set([selected, ...list])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [zones, preferences.timezone, preferences.timeZone]);

  if (!preferences.hydrated) {
    return <SettingsSkeleton />;
  }

  const activeZone = preferences.timezone ?? preferences.timeZone;
  const favouriteCount =
    preferences.favorites.teams.length +
    preferences.favorites.leagues.length +
    preferences.favorites.matches.length;

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      preferences.importPreferences(text);
    } catch {
      push("That file could not be read. Try exporting a fresh copy.", "error");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onEnableNotifications = async () => {
    const enabled = await preferences.enableNotifications();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    if (enabled) setPermission("granted");
  };

  return (
    <div className="settings-grid">
      <SettingsSection
        title="Appearance"
        description="Touchline ships with a light editorial theme and a low-glare dark theme. Your choice is stored in this browser only."
        icon={<Sun size={15} aria-hidden="true" />}
      >
        <div className="theme-options" role="group" aria-label="Theme">
          {THEMES.map((theme) => {
            const Icon = theme.icon;
            const active = preferences.theme === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                className={cn("theme-option", active && "is-active")}
                onClick={() => preferences.setTheme(theme.value)}
                aria-pressed={active}
                title={theme.description}
              >
                <span
                  className={cn(
                    "theme-option__preview",
                    `theme-option__preview--${theme.value}`,
                  )}
                  aria-hidden="true"
                >
                  <span className="theme-option__bar" />
                  <span className="theme-option__bar theme-option__bar--muted" />
                  <span className="theme-option__bar theme-option__bar--muted" />
                </span>
                <span className="theme-option__label">
                  <span className="inline">
                    <Icon size={12} aria-hidden="true" />
                    {theme.label}
                  </span>
                  {active ? <Check size={13} aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="small text-muted" style={{ marginTop: 12 }}>
          The theme is applied immediately and remembered across visits.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Time zone"
        description="Every kick-off time, date label and calendar export follows this zone."
        icon={<Clock3 size={15} aria-hidden="true" />}
      >
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">Display time zone</p>
            <p className="settings-row__description">
              Detected from your browser as {browserZone()}. Choose any IANA zone
              to override it.
            </p>
          </div>
          <select
            value={activeZone}
            onChange={(event) =>
              preferences.setTimezone(
                event.target.value === browserZone() ? null : event.target.value,
              )
            }
            aria-label="Display time zone"
          >
            {zoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </div>
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">Preview</p>
            <p className="settings-row__description">
              A typical Saturday 15:00 kick-off, rendered in{" "}
              <strong>{activeZone}</strong>.
            </p>
          </div>
          <span className="small text-muted">
            <LocalTime date="2026-11-07T15:00:00Z" mode="datetime" fallback="—" />
          </span>
        </div>
        {preferences.timezone ? (
          <div className="data-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => preferences.setTimezone(null)}
            >
              Use browser time zone
            </button>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Match reminders rely on the browser Notification API. They only fire while a Touchline tab is open — the calendar export is the reliable backup."
        icon={<Bell size={15} aria-hidden="true" />}
      >
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">Kick-off alerts</p>
            <p className="settings-row__description">
              Permission:{" "}
              <strong>
                {permission === "unsupported"
                  ? "not supported in this browser"
                  : permission === "granted"
                    ? "granted"
                    : permission === "denied"
                      ? "blocked for this site"
                      : "not requested yet"}
              </strong>
              . Reminders are stored locally and removed once they fire.
            </p>
          </div>
          <label className="toggle" htmlFor="settings-notifications">
            <input
              id="settings-notifications"
              type="checkbox"
              checked={preferences.notifications}
              disabled={permission === "unsupported" || permission === "denied"}
              onChange={(event) => {
                if (event.target.checked) {
                  void onEnableNotifications();
                } else {
                  preferences.setNotifications(false);
                  push("Kick-off alerts turned off.", "info");
                }
              }}
            />
            <span className="toggle__track" aria-hidden="true" />
            <span className="toggle__label">
              {preferences.notifications ? (
                <BellRing size={12} aria-hidden="true" />
              ) : (
                <Bell size={12} aria-hidden="true" />
              )}
              {preferences.notifications ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>
        {permission !== "granted" && permission !== "unsupported" ? (
          <div className="data-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn--accent btn--sm"
              onClick={onEnableNotifications}
              disabled={permission === "denied"}
            >
              <BellRing size={14} aria-hidden="true" />
              {permission === "denied"
                ? "Blocked in browser settings"
                : "Ask this browser for permission"}
            </button>
          </div>
        ) : null}
        <p className="small text-muted" style={{ marginTop: 14 }}>
          Notification permission can only be requested from a user gesture, so
          this button is the place to grant it. You can revoke it at any time in
          your browser&apos;s site settings.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Favourites"
        description="Starred teams, competitions and matches are stored in this browser. They power the favourites filter on the match centre and the pinned cards on the competitions page."
        icon={<Star size={15} aria-hidden="true" />}
      >
        {favouriteCount === 0 ? (
          <EmptyState
            icon={<Star size={22} />}
            title="Nothing starred yet"
            description="Use the star buttons on a match, team or competition page, then return here to manage the list."
            action={{ href: "/competitions", label: "Browse competitions" }}
          >
            <Link href="/matches" className="btn btn--ghost">
              Today&apos;s matches
            </Link>
          </EmptyState>
        ) : (
          <>
            {preferences.favorites.teams.length > 0 ? (
              <div className="favorite-group">
                <p className="favorite-group__title">
                  Teams · {preferences.favorites.teams.length}
                </p>
                <div className="favorite-list">
                  {preferences.favorites.teams.map((team) => (
                    <div className="favorite-item" key={team.id}>
                      <TeamLogo src={team.logo} name={team.name} size={26} />
                      <div className="favorite-item__text">
                        <Link
                          href={`/team/${team.id}`}
                          className="favorite-item__name"
                        >
                          {team.name}
                        </Link>
                        <p className="favorite-item__meta">
                          {[team.abbreviation, team.leagueSlug]
                            .filter(Boolean)
                            .join(" · ") || "Team"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="favorite-item__remove"
                        aria-label={`Remove ${team.name} from favourites`}
                        onClick={() => preferences.toggleTeamFavorite(team)}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {preferences.favorites.leagues.length > 0 ? (
              <div className="favorite-group">
                <p className="favorite-group__title">
                  Competitions · {preferences.favorites.leagues.length}
                </p>
                <div className="favorite-list">
                  {preferences.favorites.leagues.map((league) => (
                    <div className="favorite-item" key={league.slug}>
                      <LeagueLogo
                        src={league.logo}
                        name={league.name}
                        size={26}
                      />
                      <div className="favorite-item__text">
                        <Link
                          href={`/competitions/${league.slug}`}
                          className="favorite-item__name"
                        >
                          {league.name}
                        </Link>
                        <p className="favorite-item__meta">Competition</p>
                      </div>
                      <button
                        type="button"
                        className="favorite-item__remove"
                        aria-label={`Remove ${league.name} from favourites`}
                        onClick={() => preferences.toggleLeagueFavorite(league)}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {preferences.favorites.matches.length > 0 ? (
              <div className="favorite-group">
                <p className="favorite-group__title">
                  Matches · {preferences.favorites.matches.length}
                </p>
                <div className="favorite-list">
                  {preferences.favorites.matches.map((match) => (
                    <div className="favorite-item" key={match.id}>
                      <Star size={20} aria-hidden="true" />
                      <div className="favorite-item__text">
                        <Link
                          href={`/match/${match.id}`}
                          className="favorite-item__name"
                        >
                          {match.label}
                        </Link>
                        <p className="favorite-item__meta">
                          <LocalTime
                            date={match.date}
                            mode="datetime"
                            fallback={match.date}
                          />
                        </p>
                      </div>
                      <button
                        type="button"
                        className="favorite-item__remove"
                        aria-label={`Remove ${match.label} from favourites`}
                        onClick={() => preferences.toggleMatchFavorite(match)}
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </SettingsSection>

      <SettingsSection
        title="Reminders"
        description="Matches you asked to be reminded about. Each entry disappears after its alert fires, or when you remove it."
        icon={<BellRing size={15} aria-hidden="true" />}
      >
        {preferences.reminders.length === 0 ? (
          <div className="content-card__empty">
            No match reminders are saved. Open any fixture and choose the bell
            button to add one.
          </div>
        ) : (
          <div className="favorite-list">
            {preferences.reminders.map((reminder) => (
              <div className="favorite-item" key={reminder.matchId}>
                <BellRing size={18} aria-hidden="true" />
                <div className="favorite-item__text">
                  <Link
                    href={`/match/${reminder.matchId}`}
                    className="favorite-item__name"
                  >
                    {reminder.label}
                  </Link>
                  <p className="favorite-item__meta">
                    <LocalTime
                      date={reminder.kickoff}
                      mode="datetime"
                      fallback={reminder.kickoff}
                    />
                  </p>
                </div>
                <button
                  type="button"
                  className="favorite-item__remove"
                  aria-label={`Remove reminder for ${reminder.label}`}
                  onClick={() => preferences.removeReminder(reminder.matchId)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Your data"
        description="Touchline has no accounts and no server-side profile. Everything on this page lives in localStorage under touchline.preferences.v1, so it belongs to this browser."
        icon={<Download size={15} aria-hidden="true" />}
      >
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">Export a copy</p>
            <p className="settings-row__description">
              Download a JSON file with your theme, time zone, notification
              choice, favourites and reminders.
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={preferences.exportPreferences}
          >
            <Download size={14} aria-hidden="true" />
            Export JSON
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">Restore from a file</p>
            <p className="settings-row__description">
              Import a previously exported file. Unknown or malformed fields are
              discarded rather than trusted.
            </p>
          </div>
          <label className="btn btn--ghost btn--sm import-label">
            <Upload size={14} aria-hidden="true" />
            {importing ? "Reading…" : "Import JSON"}
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              aria-label="Import a Touchline preferences JSON file"
              disabled={importing}
              onChange={(event) => void onImport(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">Reset this browser</p>
            <p className="settings-row__description">
              Clears the theme, time zone, favourites and reminders stored here.
              This cannot be undone.
            </p>
          </div>
          <div className="data-actions">
            {confirmReset ? (
              <>
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{
                    background: "var(--loss)",
                    color: "#fff",
                    borderColor: "transparent",
                  }}
                  onClick={() => {
                    preferences.resetPreferences();
                    setConfirmReset(false);
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Yes, clear everything
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmReset(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Reset preferences
              </button>
            )}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
