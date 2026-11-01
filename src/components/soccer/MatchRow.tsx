import Link from "next/link";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
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

export function MatchRow({
  match,
  compact = false,
  showCompetition = false,
}: {
  match: Match;
  compact?: boolean;
  showCompetition?: boolean;
}) {
  const live = isLive(match);
  const scored = hasScore(match);

  return (
    <Link
      href={`/match/${match.id}`}
      className={cn("match-row", compact && "match-row--featured")}
      aria-label={`${match.home.name} versus ${match.away.name}, ${match.statusLabel || statusText(match)}`}
    >
      <div className="match-row__meta">
        <span className="match-row__time">
          <LocalTime date={match.date} mode="time" fallback="TBC" />
        </span>
        <span className={cn("match-row__status", live && "is-live")}>
          {statusText(match)}
        </span>
      </div>

      <div className="match-row__teams">
        <span
          className={cn(
            "match-row__team",
            scored && match.home.winner && "is-winner",
            scored && !match.home.winner && match.away.winner && "is-loser",
          )}
        >
          <TeamLogo src={match.home.logo} name={match.home.name} size={22} />
          <span className="match-row__team-name">{match.home.name}</span>
        </span>
        <span
          className={cn(
            "match-row__team",
            scored && match.away.winner && "is-winner",
            scored && !match.away.winner && match.home.winner && "is-loser",
          )}
        >
          <TeamLogo src={match.away.logo} name={match.away.name} size={22} />
          <span className="match-row__team-name">{match.away.name}</span>
        </span>
        {showCompetition ? (
          <span className="small text-muted">{match.competition.name}</span>
        ) : null}
      </div>

      <div className="match-row__score">
        {scored ? (
          <>
            <span
              className={cn(
                match.home.winner && "is-winner",
                !match.home.winner && match.away.winner && "is-loser",
              )}
            >
              {match.home.score ?? "–"}
            </span>
            <span
              className={cn(
                match.away.winner && "is-winner",
                !match.away.winner && match.home.winner && "is-loser",
              )}
            >
              {match.away.score ?? "–"}
            </span>
          </>
        ) : (
          <span className="match-row__kickoff">
            <LocalTime date={match.date} mode="time" fallback="TBC" />
          </span>
        )}
      </div>
    </Link>
  );
}
