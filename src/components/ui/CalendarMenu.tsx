"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const google = googleCalendarUrl(match);
  const outlook = outlookCalendarUrl(match);

  const download = () => {
    downloadIcs(
      `${icsFilename(`${match.home.name}-${match.away.name}`)}.ics`,
      matchesToIcs([match], `${match.home.name} vs ${match.away.name}`),
    );
    push(t.matches.addCalendar.toast, "success");
  };

  return (
    <details className={cn("menu", className)}>
      <summary className={cn("btn btn--ghost", !withLabel && "icon-only")}>
        <CalendarPlus size={17} aria-hidden="true" />
        {withLabel ? <span>{t.matches.addCalendar.trigger}</span> : null}
      </summary>
      <div className="menu__panel">
        <button type="button" className="menu__item" onClick={download}>
          <Download size={16} aria-hidden="true" />
          {t.matches.addCalendar.download}
        </button>
        {google ? (
          <a
            className="menu__item"
            href={google}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t.matches.addCalendar.google}
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
            {t.matches.addCalendar.outlook}
          </a>
        ) : null}
        <p className="menu__note">{t.matches.addCalendar.note}</p>
      </div>
    </details>
  );
}
