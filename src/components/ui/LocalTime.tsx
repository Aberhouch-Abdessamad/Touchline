"use client";

import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { LOCALE_CONFIG } from "@/lib/i18n/core";
import { cn } from "@/lib/utils";

type TimeMode =
  | "time"
  | "date"
  | "datetime"
  | "weekday"
  | "full"
  | "day-month"
  | "month"
  | "year";

const OPTIONS: Record<TimeMode, Intl.DateTimeFormatOptions> = {
  time: { hour: "2-digit", minute: "2-digit", hour12: false },
  date: { day: "numeric", month: "short", year: "numeric" },
  datetime: {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
  weekday: { weekday: "short" },
  full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  "day-month": { day: "numeric", month: "short" },
  month: { month: "long", year: "numeric" },
  year: { year: "numeric" },
};

interface LocalTimeProps {
  date: string | Date;
  mode?: TimeMode;
  className?: string;
  fallback?: string;
}

export function LocalTime({
  date,
  mode = "datetime",
  className,
  fallback = "—",
}: LocalTimeProps) {
  const { timeZone, lang } = usePreferences();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const label = useMemo(() => {
    const value = typeof date === "string" ? new Date(date) : date;
    if (Number.isNaN(value.getTime())) return fallback;
    return new Intl.DateTimeFormat(LOCALE_CONFIG[lang].intl, {
      ...OPTIONS[mode],
      timeZone,
    }).format(value);
  }, [date, mode, timeZone, fallback, lang]);

  const iso = typeof date === "string" ? date : date.toISOString();

  return (
    <time
      dateTime={iso}
      className={cn(className, !mounted && "is-pending")}
      suppressHydrationWarning
      title={timeZone}
    >
      {label}
    </time>
  );
}
