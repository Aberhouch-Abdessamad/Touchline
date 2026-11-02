"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CountdownProps {
  target: string;
  className?: string;
  compact?: boolean;
}

function parts(diff: number) {
  const total = Math.max(0, Math.floor(diff / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}

export function Countdown({ target, className, compact = false }: CountdownProps) {
  const { t, f } = useI18n();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setRemaining(new Date(target).getTime() - Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  if (remaining === null) {
    return (
      <span className={cn("countdown is-pending", className)} aria-live="polite">
        {t.common.countdown.calculating}
      </span>
    );
  }

  if (remaining <= 0) {
    return (
      <span className={cn("countdown countdown--now", className)}>
        {t.common.countdown.kickOffReached}
      </span>
    );
  }

  // Digit/separator strings read correctly inside RTL if forced LTR.
  const value = parts(remaining);
  const units = t.common.countdown.units;
  const label = value.days > 0
    ? `${value.days}${units.d} ${value.hours}${units.h} ${value.minutes}${units.m}`
    : `${String(value.hours).padStart(2, "0")}:${String(value.minutes).padStart(2, "0")}:${String(value.seconds).padStart(2, "0")}`;

  if (compact) {
    return (
      <span className={cn("countdown", className)} aria-live="off">
        {value.days > 0 ? (
          f(t.common.countdown.inDaysShort, { n: value.days })
        ) : (
          <span className="u-dir-ltr">{label}</span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("countdown", className)} aria-live="off">
      <span className="countdown__label">{t.common.countdown.kickOffIn}</span>
      <span className="countdown__value">
        <span className="u-dir-ltr">{label}</span>
      </span>
    </span>
  );
}
