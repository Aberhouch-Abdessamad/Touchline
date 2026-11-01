export const DEFAULT_TIME_ZONE = "UTC";

export function todayISO(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateParam(value: string | undefined | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date(`${todayISO()}T12:00:00Z`);
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + amount);
  return copy;
}

export function addDaysISO(value: string, amount: number): string {
  return toDateParam(addDays(parseDateParam(value), amount));
}

export function formatDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = {},
  timeZone = DEFAULT_TIME_ZONE,
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
    ...options,
  }).format(date);
}

export function formatTime(value: string | Date, timeZone = DEFAULT_TIME_ZONE): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function formatDateTime(value: string | Date, timeZone = DEFAULT_TIME_ZONE): string {
  return `${formatDate(value, { weekday: "short" }, timeZone)} · ${formatTime(value, timeZone)}`;
}

export function formatWeekday(value: string | Date, timeZone = DEFAULT_TIME_ZONE): string {
  return formatDate(value, { weekday: "short", day: undefined, month: undefined, year: undefined }, timeZone);
}

export function formatMonthTitle(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function daysBetween(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((end - start) / 86_400_000);
}

export function relativeDayLabel(value: string | Date, reference = todayISO()): string {
  const target = typeof value === "string" ? value.slice(0, 10) : toDateParam(value);
  const diff = daysBetween(parseDateParam(reference), parseDateParam(target));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  return formatDate(target, { weekday: "long", day: "numeric", month: "long" });
}

export function isToday(value: string | Date): boolean {
  const target = typeof value === "string" ? value.slice(0, 10) : toDateParam(value);
  return target === todayISO();
}

export function getDefaultSeason(league?: {
  region: string;
  format: string;
  country: string;
}): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const europeanSeason =
    league &&
    league.region === "Europe" &&
    (league.format === "league" || league.format === "cup" || league.format === "qualifier");
  return europeanSeason && month < 7 ? year - 1 : year;
}

export function seasonOptions(currentYear: number, count = 5): number[] {
  return Array.from({ length: count }, (_, index) => currentYear - index);
}

export function seasonLabel(season: number, league?: { region: string }): string {
  if (league?.region === "Europe") return `${season}/${String(season + 1).slice(-2)}`;
  return String(season);
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function buildMonthGrid(year: number, month: number): Array<{ date: string; inMonth: boolean }> {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // Monday-first grid
  const start = addDays(first, -firstWeekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index);
    return {
      date: toDateParam(date),
      inMonth: date.getUTCMonth() === month - 1,
    };
  });
}
