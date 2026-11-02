"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/types";

function isLive(match: Match): boolean {
  return match.state === "live" || match.state === "halftime";
}

function hasScore(match: Match): boolean {
  return (
    match.state === "finished" ||
    match.state === "live" ||
    match.state === "halftime"
  );
}

function statusText(match: Match, common: Dict["common"]): string {
  if (isLive(match)) {
    return match.clock || match.statusLabel || common.states.live;
  }
  if (match.state === "finished") return common.stateShort.finished;
  if (match.state === "postponed") return common.stateShort.postponed;
  if (match.state === "canceled") return common.stateShort.canceled;
  if (match.state === "scheduled") return common.stateShort.scheduled;
  return match.statusLabel || common.stateShort.unknown;
}

/**
 * A fixture row inside a competition card. Kick-off or status sits on the
 * left, both teams share one column so names line up, and the score has its
 * own right-hand column so numbers align down the card. The favourite control
 * sits outside the link so starring a match never navigates away.
 */
export function MatchCentreRow({ match }: { match: Match }) {
  const { t, f } = useI18n();
  const live = isLive(match);
  const scored = hasScore(match);
  const status = statusText(match, t.common);
  // Kick-off time is the status for an upcoming fixture; skip the redundant
  // "Scheduled" caption.
  const showStatus = match.state !== "scheduled";

  const ariaLabel = scored
    ? f(t.matches.aria.scored, {
        home: match.home.name,
        homeScore: match.home.score ?? 0,
        away: match.away.name,
        awayScore: match.away.score ?? 0,
        status,
      })
    : f(t.matches.aria.row, {
        home: match.home.name,
        away: match.away.name,
        vs: t.common.vs,
        status,
      });

  return (
    <article className={cn("mc-row", live && "is-live")}>
      <Link
        href={`/match/${match.id}`}
        className="mc-row__main"
        aria-label={ariaLabel}
      >
        <span className="mc-row__when">
          <LocalTime
            date={match.date}
            mode="time"
            fallback={t.common.tbc}
            className="mc-row__time"
          />
          {showStatus ? (
            <span className={cn("mc-row__status", live && "is-live")}>
              <span className="u-dir-ltr">{status}</span>
            </span>
          ) : null}
        </span>

        <span className="mc-row__teams">
          <span
            className={cn(
              "mc-row__team",
              scored && match.home.winner && "is-winner",
              scored &&
                !match.home.winner &&
                match.away.winner &&
                "is-loser",
            )}
          >
            <TeamLogo src={match.home.logo} name={match.home.name} size={20} />
            <span className="mc-row__name">{match.home.name}</span>
          </span>

          <span
            className={cn(
              "mc-row__team",
              scored && match.away.winner && "is-winner",
              scored &&
                !match.away.winner &&
                match.home.winner &&
                "is-loser",
            )}
          >
            <TeamLogo src={match.away.logo} name={match.away.name} size={20} />
            <span className="mc-row__name">{match.away.name}</span>
          </span>
        </span>

        {scored ? (
          <span className="mc-row__scores">
            <span
              className={cn(
                "mc-row__score",
                match.home.winner && "is-winner",
                match.away.winner && !match.home.winner && "is-loser",
              )}
            >
              {match.home.score ?? "–"}
            </span>
            <span
              className={cn(
                "mc-row__score",
                match.away.winner && "is-winner",
                match.home.winner && !match.away.winner && "is-loser",
              )}
            >
              {match.away.score ?? "–"}
            </span>
          </span>
        ) : (
          <span className="mc-row__scores" aria-hidden="true" />
        )}

        <ChevronRight
          className="mc-row__chevron"
          size={14}
          aria-hidden="true"
          data-flip="rtl"
        />
      </Link>

      <FavoriteButton
        kind="match"
        item={{
          id: match.id,
          label: f(t.matches.aria.shortLabel, {
            home: match.home.name,
            away: match.away.name,
            vs: t.common.vs,
          }),
          date: match.date,
        }}
        className="mc-row__fav"
      />
    </article>
  );
}
