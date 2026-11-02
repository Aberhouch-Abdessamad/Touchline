"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { LeagueLogo } from "@/components/ui/Logos";
import { cn } from "@/lib/utils";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { formatLabel, genderLabel } from "./labels";
import type { League } from "@/data/leagues";

/** Larger spotlight tile for the competitions readers open most. */
export function CompetitionFeature({
  league,
  lead = false,
}: {
  league: League;
  lead?: boolean;
}) {
  const { t, lang } = useI18n();

  return (
    <div className={cn("cx-feature", lead && "cx-feature--lead")}>
      <Link href={`/competitions/${league.slug}`} className="cx-feature__link">
        <span className="cx-feature__top">
          <span className="cx-feature__logo">
            <LeagueLogo src={league.logo} name={league.name} size={38} />
          </span>
          <span className="cx-feature__country">{league.country}</span>
        </span>
        <span className="cx-feature__name">
          {leagueDisplayName(league, lang)}
        </span>
        <span className="cx-feature__foot">
          <span className="cx-feature__format">
            {formatLabel(t, league.format)} · {genderLabel(t, league.gender)}
          </span>
          <span className="cx-feature__cta">
            {t.competitions.hub.open}
            <ArrowUpRight size={13} aria-hidden="true" data-flip="rtl" />
          </span>
        </span>
      </Link>
      <FavoriteButton
        kind="league"
        item={{
          slug: league.slug,
          name: league.name,
          logo: league.logo ?? undefined,
        }}
        className="cx-feature__star"
      />
    </div>
  );
}
