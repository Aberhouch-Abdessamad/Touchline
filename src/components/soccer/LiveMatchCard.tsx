import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/types";

function liveLabel(match: Match): string {
  if (match.state === "halftime") return "Half-time";
  return match.clock || match.statusLabel || "Live";
}

/**
 * One live or half-time fixture, presented as a scoreboard card inside the
 * match centre's live band.
 */
export function LiveMatchCard({ match }: { match: Match }) {
  const competition = match.league?.name ?? match.competition.name;
  const competitionLogo =
    match.league?.logo ?? match.competition.logo ?? undefined;
  const venue = match.venue ?? match.city ?? match.round;

  return (
    <article className="mc-card">
      <header className="mc-card__top">
        {competitionLogo ? (
          <LeagueLogo
            src={competitionLogo}
            name={competition}
            size={15}
            className="mc-card__logo"
          />
        ) : null}
        <span className="mc-card__comp" title={competition}>
          {competition}
        </span>
        <FavoriteButton
          kind="match"
          item={{
            id: match.id,
            label: `${match.home.name} v ${match.away.name}`,
            date: match.date,
          }}
          className="mc-card__fav"
        />
        <span className="mc-card__live">
          <i className="mc-card__dot" aria-hidden="true" />
          {liveLabel(match)}
        </span>
      </header>

      <Link
        href={`/match/${match.id}`}
        className="mc-card__link"
        aria-label={`${match.home.name} ${match.home.score ?? 0}, ${
          match.away.name
        } ${match.away.score ?? 0}, ${liveLabel(match)}`}
      >
        <div className="mc-card__body">
          <span
            className={cn(
              "mc-card__team",
              match.home.winner && "is-winner",
            )}
          >
            <TeamLogo src={match.home.logo} name={match.home.name} size={24} />
            <span className="mc-card__name">
              {match.home.shortName || match.home.name}
            </span>
            <span className="mc-card__score">{match.home.score ?? "–"}</span>
          </span>

          <span
            className={cn(
              "mc-card__team",
              match.away.winner && "is-winner",
            )}
          >
            <TeamLogo src={match.away.logo} name={match.away.name} size={24} />
            <span className="mc-card__name">
              {match.away.shortName || match.away.name}
            </span>
            <span className="mc-card__score">{match.away.score ?? "–"}</span>
          </span>
        </div>

        <footer className="mc-card__foot">
          <span className="mc-card__venue">{venue ?? "Live coverage"}</span>
          <span className="mc-card__cta">
            Match centre
            <ArrowRight size={12} aria-hidden="true" />
          </span>
        </footer>
      </Link>
    </article>
  );
}
