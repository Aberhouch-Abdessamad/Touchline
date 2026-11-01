"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import {
  downloadIcs,
  googleCalendarUrl,
  icsFilename,
  matchesToIcs,
  outlookCalendarUrl,
} from "@/lib/calendar";
import type { Match } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarMenuProps {
  match: Match;
  className?: string;
  withLabel?: boolean;
}

export function CalendarMenu({
  match,
  className,
  withLabel = true,
}: CalendarMenuProps) {
  const { push } = useToast();
  const google = googleCalendarUrl(match);
  const outlook = outlookCalendarUrl(match);

  const download = () => {
    downloadIcs(
      `${icsFilename(`${match.home.name}-${match.away.name}`)}.ics`,
      matchesToIcs([match], `${match.home.name} vs ${match.away.name}`),
    );
    push("Calendar file downloaded.", "success");
  };

  return (
    <details className={cn("menu", className)}>
      <summary className={cn("btn btn--ghost", !withLabel && "icon-only")}>
        <CalendarPlus size={17} aria-hidden="true" />
        {withLabel ? <span>Add to calendar</span> : null}
      </summary>
      <div className="menu__panel">
        <button type="button" className="menu__item" onClick={download}>
          <Download size={16} aria-hidden="true" />
          Download .ics
        </button>
        {google ? (
          <a
            className="menu__item"
            href={google}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Google Calendar
          </a>
        ) : null}
        {outlook ? (
          <a
            className="menu__item"
            href={outlook}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={16} aria-hidden="true" />
            Outlook Calendar
          </a>
        ) : null}
        <p className="menu__note">
          Times are exported in UTC so the fixture starts at the same moment
          everywhere.
        </p>
      </div>
    </details>
  );
}
