import type { Match } from "./types";

/**
 * Calendar helpers shared by the server and the browser. Times are exported in
 * UTC so a fixture starts at the same instant in every timezone.
 */

function icsEscape(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function icsDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";
}

function matchTitle(match: Match): string {
  return `${match.home.name} vs ${match.away.name}`;
}

function matchDescription(match: Match): string {
  const parts = [
    `${match.competition.name}${match.round ? ` — ${match.round}` : ""}`,
    "Fixture data via ESPN's public API.",
    "Generated with Touchline.",
  ];
  return parts.join("\n");
}

function matchLocation(match: Match): string {
  const parts = [match.venue, match.city, match.country].filter(Boolean);
  return parts.join(", ");
}

export function matchToIcs(match: Match): string {
  const start = icsDate(match.date);
  if (!start) return "";
  const endDate = new Date(new Date(match.date).getTime() + 2 * 60 * 60 * 1000);
  const end = icsDate(endDate);
  return [
    "BEGIN:VEVENT",
    `UID:match-${match.id}@touchline`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsEscape(`${match.home.name} vs ${match.away.name}`)}`,
    `DESCRIPTION:${icsEscape(matchDescription(match))}`,
    matchLocation(match) ? `LOCATION:${icsEscape(matchLocation(match))}` : "",
    "END:VEVENT",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function matchesToIcs(matches: Match[], calendarName = "Touchline fixtures"): string {
  const events = matches.map(matchToIcs).filter(Boolean).join("\r\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Touchline//Football fixtures//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
    events,
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function googleDates(match: Match): string | null {
  const start = new Date(match.date);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const format = (date: Date) =>
    date.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";
  return `${format(start)}/${format(end)}`;
}

export function googleCalendarUrl(match: Match): string | null {
  const dates = googleDates(match);
  if (!dates) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: matchTitle(match),
    dates,
    details: matchDescription(match),
    location: matchLocation(match),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(match: Match): string | null {
  const start = new Date(match.date);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: matchTitle(match),
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: matchDescription(match),
    location: matchLocation(match),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadIcs(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function icsFilename(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
