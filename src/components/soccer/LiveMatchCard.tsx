"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { useI18n, leagueDisplayName } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/types";

/**
 * One live or half-time fixture, presented as a scoreboard card inside the
 * match centre's live band.
 */
export function LiveMatchCard({ match }: { match: Match }) {
  const { t, f, lang } = useI18n();
  const competition = leagueDisplayName(
    {
      slug: match.league?.slug ?? match.competition.slug,
      name: match.league?.name ?? match.competition.name,
    },
    lang,
  );
  const competitionLogo =
    match.league?.logo ?? match.competition.logo ?? undefined;
  const venue = match.venue ?? match.city ?? match.round;
  const live =
    match.state === "halftime"
      ? t.common.states.halftime
      : match.clock || match.statusLabel || t.common.states.live;

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
            label: f(t.matches.aria.shortLabel, {
              home: match.home.name,
              away: match.away.name,
              vs: t.common.vs,
            }),
            date: match.date,
          }}
          className="mc-card__fav"
        />
        <span className="mc-card__live">
          <i className="mc-card__dot" aria-hidden="true" />
          <span className="u-dir-ltr">{live}</span>
        </span>
      </header>

      <Link
        href={`/match/${match.id}`}
        className="mc-card__link"
        aria-label={f(t.matches.aria.scored, {
          home: match.home.name,
          homeScore: match.home.score ?? 0,
          away: match.away.name,
          awayScore: match.away.score ?? 0,
          status: live,
        })}
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
          <span className="mc-card__venue">
            {venue ?? t.matches.card.liveCoverage}
          </span>
          <span className="mc-card__cta">
            {t.matches.hero.eyebrow}
            <ArrowRight size={12} aria-hidden="true" data-flip="rtl" />
          </span>
        </footer>
      </Link>
    </article>
  );
}
