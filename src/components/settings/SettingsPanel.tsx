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
import { LOCALE_CONFIG, LOCALES, isLocale, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const THEMES: Array<{ value: ThemeChoice; icon: typeof Sun }> = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
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
  const { t, f, lang, setLang } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [zones, setZones] = useState<string[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [confirmReset, setConfirmReset] = useState(false);
  const [importing, setImporting] = useState(false);

  const themeText: Record<
    ThemeChoice,
    { label: string; description: string }
  > = {
    light: {
      label: t.common.theme.light,
      description: t.settings.panel.appearance.lightDesc,
    },
    dark: {
      label: t.common.theme.dark,
      description: t.settings.panel.appearance.darkDesc,
    },
    system: {
      label: t.common.theme.system,
      description: t.settings.panel.appearance.systemDesc,
    },
  };

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
      push(t.settings.panel.data.importReadFailed, "error");
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
        title={t.settings.panel.appearance.title}
        description={t.settings.panel.appearance.description}
        icon={<Sun size={15} aria-hidden="true" />}
      >
        <div
          className="theme-options"
          role="group"
          aria-label={t.settings.panel.appearance.themeGroup}
        >
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
                title={themeText[theme.value].description}
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
                    {themeText[theme.value].label}
                  </span>
                  {active ? <Check size={13} aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <p className="small text-muted" style={{ marginTop: 12 }}>
          {t.settings.panel.appearance.note}
        </p>
        <div className="settings-row" style={{ marginTop: 16 }}>
          <div className="settings-row__text">
            <p className="settings-row__title">
              {t.settings.panel.appearance.languageRowTitle}
            </p>
            <p className="settings-row__description">
              {t.settings.panel.appearance.languageDescription}
            </p>
          </div>
          <select
            value={lang}
            onChange={(event) => {
              if (isLocale(event.target.value)) setLang(event.target.value);
            }}
            aria-label={t.settings.panel.appearance.languageRowTitle}
          >
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_CONFIG[code].native}
              </option>
            ))}
          </select>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t.common.timezone}
        description={t.settings.panel.timezone.description}
        icon={<Clock3 size={15} aria-hidden="true" />}
      >
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">
              {t.settings.panel.timezone.displayZone}
            </p>
            <p className="settings-row__description">
              {f(t.settings.panel.timezone.detected, { zone: browserZone() })}
            </p>
          </div>
          <select
            value={activeZone}
            onChange={(event) =>
              preferences.setTimezone(
                event.target.value === browserZone() ? null : event.target.value,
              )
            }
            aria-label={t.settings.panel.timezone.displayZone}
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
            <p className="settings-row__title">{t.settings.panel.timezone.preview}</p>
            <p className="settings-row__description">
              {t.settings.panel.timezone.previewPre}{" "}
              <strong className="u-dir-ltr">{activeZone}</strong>
              {t.settings.panel.timezone.previewPost}
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
              {t.settings.panel.timezone.useBrowser}
            </button>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title={t.settings.panel.notifications.title}
        description={t.settings.panel.notifications.description}
        icon={<Bell size={15} aria-hidden="true" />}
      >
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">
              {t.settings.panel.notifications.alertsTitle}
            </p>
            <p className="settings-row__description">
              {t.settings.panel.notifications.permissionPre}{" "}
              <strong>
                {permission === "unsupported"
                  ? t.settings.panel.notifications.permissionUnsupported
                  : permission === "granted"
                    ? t.settings.panel.notifications.permissionGranted
                    : permission === "denied"
                      ? t.settings.panel.notifications.permissionDenied
                      : t.settings.panel.notifications.permissionDefault}
              </strong>
              {t.settings.panel.notifications.permissionPost}
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
                  push(t.settings.panel.notifications.toastTurnedOff, "info");
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
              {preferences.notifications
                ? t.settings.panel.notifications.toggleOn
                : t.settings.panel.notifications.toggleOff}
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
                ? t.settings.panel.notifications.blockedInSettings
                : t.settings.panel.notifications.askPermission}
            </button>
          </div>
        ) : null}
        <p className="small text-muted" style={{ marginTop: 14 }}>
          {t.settings.panel.notifications.note}
        </p>
      </SettingsSection>

      <SettingsSection
        title={t.common.favourites}
        description={t.settings.panel.favourites.description}
        icon={<Star size={15} aria-hidden="true" />}
      >
        {favouriteCount === 0 ? (
          <EmptyState
            icon={<Star size={22} />}
            title={t.settings.panel.favourites.emptyTitle}
            description={t.settings.panel.favourites.emptyDescription}
            action={{
              href: "/competitions",
              label: t.settings.panel.favourites.browseCompetitions,
            }}
          >
            <Link href="/matches" className="btn btn--ghost">
              {t.settings.panel.favourites.todaysMatches}
            </Link>
          </EmptyState>
        ) : (
          <>
            {preferences.favorites.teams.length > 0 ? (
              <div className="favorite-group">
                <p className="favorite-group__title">
                  {f(t.settings.panel.favourites.teamsCount, {
                    n: preferences.favorites.teams.length,
                  })}
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
                            .join(" · ") || t.settings.panel.favourites.teamFallback}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="favorite-item__remove"
                        aria-label={f(t.settings.panel.favourites.removeNamed, {
                          name: team.name,
                        })}
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
                  {f(t.settings.panel.favourites.leaguesCount, {
                    n: preferences.favorites.leagues.length,
                  })}
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
                        <p className="favorite-item__meta">
                          {t.settings.panel.favourites.competitionFallback}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="favorite-item__remove"
                        aria-label={f(t.settings.panel.favourites.removeNamed, {
                          name: league.name,
                        })}
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
                  {f(t.settings.panel.favourites.matchesCount, {
                    n: preferences.favorites.matches.length,
                  })}
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
                        aria-label={f(t.settings.panel.favourites.removeNamed, {
                          name: match.label,
                        })}
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
        title={t.settings.panel.reminders.title}
        description={t.settings.panel.reminders.description}
        icon={<BellRing size={15} aria-hidden="true" />}
      >
        {preferences.reminders.length === 0 ? (
          <div className="content-card__empty">
            {t.settings.panel.reminders.empty}
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
                  aria-label={f(t.settings.panel.reminders.removeAria, {
                    name: reminder.label,
                  })}
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
        title={t.settings.panel.data.title}
        description={t.settings.panel.data.description}
        icon={<Download size={15} aria-hidden="true" />}
      >
        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">
              {t.settings.panel.data.exportTitle}
            </p>
            <p className="settings-row__description">
              {t.settings.panel.data.exportDescription}
            </p>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={preferences.exportPreferences}
          >
            <Download size={14} aria-hidden="true" />
            {t.settings.panel.data.exportAction}
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">
              {t.settings.panel.data.importTitle}
            </p>
            <p className="settings-row__description">
              {t.settings.panel.data.importDescription}
            </p>
          </div>
          <label className="btn btn--ghost btn--sm import-label">
            <Upload size={14} aria-hidden="true" />
            {importing
              ? t.settings.panel.data.importReading
              : t.settings.panel.data.importAction}
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              aria-label={t.settings.panel.data.importAria}
              disabled={importing}
              onChange={(event) => void onImport(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="settings-row">
          <div className="settings-row__text">
            <p className="settings-row__title">
              {t.settings.panel.data.resetTitle}
            </p>
            <p className="settings-row__description">
              {t.settings.panel.data.resetDescription}
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
                  {t.settings.panel.data.resetConfirm}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmReset(false)}
                >
                  {t.common.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw size={14} aria-hidden="true" />
                {t.settings.panel.data.resetAction}
              </button>
            )}
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
