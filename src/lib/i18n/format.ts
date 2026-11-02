import {
  formatDate,
  formatDateTime,
  formatMonthTitle,
  formatTime,
  formatWeekday,
} from "@/lib/date";
import { LOCALE_CONFIG, type Locale } from "./core";

/**
 * Date/time formatters bound to the active UI locale and the user's stored
 * timezone. Client components obtain one via `useI18n().d`; base helpers in
 * `@/lib/date` stay locale-neutral for server rendering.
 */
export interface DateFormatters {
  /** BCP-47 tag actually passed to Intl (e.g. `ar-u-nu-latn`). */
  locale: string;
  timeZone: string;
  /** "12 Mar 2026" by default; pass Intl options to override. */
  date(value: string | Date, options?: Intl.DateTimeFormatOptions): string;
  /** "19:45" (24-hour). */
  time(value: string | Date): string;
  /** "Sat · 19:45". */
  dateTime(value: string | Date): string;
  /** Short weekday, e.g. "Sat" / "السبت". */
  weekday(value: string | Date): string;
  /** Full month + year page title, e.g. "March 2026". */
  monthTitle(year: number, month: number): string;
}

export function createDateFormatters(
  locale: Locale,
  timeZone: string,
): DateFormatters {
  const intl = LOCALE_CONFIG[locale].intl;
  return {
    locale: intl,
    timeZone,
    date: (value, options = {}) =>
      formatDate(value, options, timeZone, intl),
    time: (value) => formatTime(value, timeZone, intl),
    dateTime: (value) => formatDateTime(value, timeZone, intl),
    weekday: (value) => formatWeekday(value, timeZone, intl),
    monthTitle: (year, month) => formatMonthTitle(year, month, intl),
  };
}
