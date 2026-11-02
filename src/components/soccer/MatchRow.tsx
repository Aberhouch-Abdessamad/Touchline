"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { useI18n, leagueDisplayName } from "@/lib/i18n";
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

export function MatchRow({
  match,
  compact = false,
  showCompetition = false,
}: {
  match: Match;
  compact?: boolean;
  showCompetition?: boolean;
}) {
  const { t, f, lang } = useI18n();
  const live = isLive(match);
  const scored = hasScore(match);
  const competition = leagueDisplayName(
    {
      slug: match.league?.slug ?? match.competition.slug,
      name: match.competition.name,
    },
    lang,
  );

  return (
    <Link
      href={`/match/${match.id}`}
      className={cn("match-row", compact && "match-row--featured")}
      aria-label={f(t.matches.aria.row, {
        home: match.home.name,
        away: match.away.name,
        vs: t.common.vs,
        status: match.statusLabel || statusText(match, t.common),
      })}
    >
      <div className="match-row__meta">
        <span className="match-row__time">
          <LocalTime date={match.date} mode="time" fallback={t.common.tbc} />
        </span>
        <span className={cn("match-row__status", live && "is-live")}>
          <span className="u-dir-ltr">{statusText(match, t.common)}</span>
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
          <span className="small text-muted">{competition}</span>
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
            <LocalTime date={match.date} mode="time" fallback={t.common.tbc} />
          </span>
        )}
      </div>
    </Link>
  );
}
