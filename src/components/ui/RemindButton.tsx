"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface RemindButtonProps {
  matchId: string;
  label: string;
  kickoff: string;
  disabled?: boolean;
}

export function RemindButton({
  matchId,
  label,
  kickoff,
  disabled = false,
}: RemindButtonProps) {
  const preferences = usePreferences();
  const { push } = useToast();
  const { t } = useI18n();
  const active = preferences.hasReminder(matchId);

  const onClick = async () => {
    if (active) {
      preferences.removeReminder(matchId);
      push(t.common.reminderRemoved, "info");
      return;
    }

    preferences.addReminder({ matchId, label, kickoff });

    if (!preferences.notifications) {
      const enabled = await preferences.enableNotifications();
      if (!enabled) {
        push(t.matches.remind.toastFallback, "info");
        return;
      }
    }

    push(t.matches.remind.toastSaved, "success");
  };

  return (
    <button
      type="button"
      className={cn("btn btn--ghost remind-button", active && "is-active")}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={
        disabled
          ? t.matches.remind.titleStarted
          : active
            ? t.matches.remind.titleRemove
            : t.matches.remind.titleAdd
      }
    >
      {disabled ? (
        <BellOff size={17} aria-hidden="true" />
      ) : active ? (
        <BellRing size={17} aria-hidden="true" />
      ) : (
        <Bell size={17} aria-hidden="true" />
      )}
      <span>{active ? t.common.reminderOn : t.common.remind}</span>
    </button>
  );
}
