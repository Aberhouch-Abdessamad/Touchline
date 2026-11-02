"use client";

import { Badge } from "@/components/ui/Primitives";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { LeagueLogo } from "@/components/ui/Logos";
import { SeasonSelect } from "./LeagueFilters";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { seasonLabel } from "@/lib/date";
import { formatLabel, regionLabel } from "./labels";
import type { League } from "@/data/leagues";

/**
 * League detail hero: identity, type badges and the season switch. Requires
 * `lang`, so it renders client-side while its parent page keeps fetching
 * data server-side.
 */
export function LeagueHero({
  league,
  season,
  defaultSeason,
}: {
  league: League;
  season: number;
  defaultSeason: number;
}) {
  const { t, lang } = useI18n();

  return (
    <header className="league-hero">
      <LeagueLogo src={league.logo} name={league.name} size={62} />
      <div className="league-hero__text">
        <p className="kicker">
          {league.country} · {regionLabel(t, league.region)}
        </p>
        <h1 className="league-hero__title">
          {leagueDisplayName(league, lang)}
        </h1>
        <div className="league-hero__meta">
          <Badge tone="muted">
            {league.type === "club"
              ? t.competitions.detail.badges.club
              : t.competitions.detail.badges.national}
          </Badge>
          <Badge tone="muted">{formatLabel(t, league.format)}</Badge>
          <Badge tone="muted">
            {league.gender === "women"
              ? t.competitions.detail.badges.women
              : t.competitions.detail.badges.men}
          </Badge>
          {league.youth ? (
            <Badge tone="warning">{t.competitions.detail.badges.youth}</Badge>
          ) : null}
          <Badge tone="accent">
            <span className="u-dir-ltr">{seasonLabel(season, league)}</span>
          </Badge>
        </div>
      </div>
      <div className="league-hero__actions">
        <SeasonSelect
          season={season}
          defaultSeason={defaultSeason}
          region={league.region}
        />
        <FavoriteButton
          kind="league"
          item={{
            slug: league.slug,
            name: league.name,
            logo: league.logo ?? undefined,
          }}
          withLabel
        />
        <ShareButton title={leagueDisplayName(league, lang)} withLabel />
      </div>
    </header>
  );
}
