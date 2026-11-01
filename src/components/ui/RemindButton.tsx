"use client";

import { Bell, BellOff, BellRing } from "lucide-react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useToast } from "@/components/providers/ToastProvider";
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
  const active = preferences.hasReminder(matchId);

  const onClick = async () => {
    if (active) {
      preferences.removeReminder(matchId);
      push("Match reminder removed.", "info");
      return;
    }

    preferences.addReminder({ matchId, label, kickoff });

    if (!preferences.notifications) {
      const enabled = await preferences.enableNotifications();
      if (!enabled) {
        push(
          "Reminder saved. Add a calendar event too — browser alerts need notification permission.",
          "info",
        );
        return;
      }
    }

    push("Reminder saved for this browser.", "success");
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
          ? "This match has already started"
          : active
            ? "Remove the kick-off reminder"
            : "Alert me at kick-off"
      }
    >
      {disabled ? (
        <BellOff size={17} aria-hidden="true" />
      ) : active ? (
        <BellRing size={17} aria-hidden="true" />
      ) : (
        <Bell size={17} aria-hidden="true" />
      )}
      <span>{active ? "Reminder set" : "Remind me"}</span>
    </button>
  );
}
