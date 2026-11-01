import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
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

function statusText(match: Match): string {
  if (isLive(match)) return match.clock || match.statusLabel || "Live";
  if (match.state === "finished") return "FT";
  if (match.state === "postponed") return "PSTP";
  if (match.state === "canceled") return "CANC";
  if (match.state === "scheduled") return "Scheduled";
  return match.statusLabel || "Update";
}

/**
 * A fixture row inside a competition card. Kick-off or status sits on the
 * left, both teams share one column so names line up, and the score has its
 * own right-hand column so numbers align down the card. The favourite control
 * sits outside the link so starring a match never navigates away.
 */
export function MatchCentreRow({ match }: { match: Match }) {
  const live = isLive(match);
  const scored = hasScore(match);
  const status = statusText(match);
  // Kick-off time is the status for an upcoming fixture; skip the redundant
  // "Scheduled" caption.
  const showStatus = match.state !== "scheduled";

  const scoreLabel = scored
    ? `${match.home.name} ${match.home.score ?? 0}, ${match.away.name} ${
        match.away.score ?? 0
      }`
    : `${match.home.name} versus ${match.away.name}`;

  return (
    <article className={cn("mc-row", live && "is-live")}>
      <Link
        href={`/match/${match.id}`}
        className="mc-row__main"
        aria-label={`${scoreLabel}, ${status}`}
      >
        <span className="mc-row__when">
          <LocalTime
            date={match.date}
            mode="time"
            fallback="TBC"
            className="mc-row__time"
          />
          {showStatus ? (
            <span className={cn("mc-row__status", live && "is-live")}>
              {status}
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

        <ChevronRight className="mc-row__chevron" size={14} aria-hidden="true" />
      </Link>

      <FavoriteButton
        kind="match"
        item={{
          id: match.id,
          label: `${match.home.name} v ${match.away.name}`,
          date: match.date,
        }}
        className="mc-row__fav"
      />
    </article>
  );
}
