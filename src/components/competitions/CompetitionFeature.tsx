import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { LeagueLogo } from "@/components/ui/Logos";
import { cn } from "@/lib/utils";
import type { League } from "@/data/leagues";

function formatLabel(league: League): string {
  const format =
    league.format === "cup"
      ? "Cup"
      : league.format === "qualifier"
        ? "Qualifier"
        : league.format === "friendly"
          ? "Friendly"
          : "League";
  return `${format} · ${league.gender === "women" ? "Women" : "Men"}`;
}

/** Larger spotlight tile for the competitions readers open most. */
export function CompetitionFeature({
  league,
  lead = false,
}: {
  league: League;
  lead?: boolean;
}) {
  return (
    <div className={cn("cx-feature", lead && "cx-feature--lead")}>
      <Link href={`/competitions/${league.slug}`} className="cx-feature__link">
        <span className="cx-feature__top">
          <span className="cx-feature__logo">
            <LeagueLogo src={league.logo} name={league.name} size={38} />
          </span>
          <span className="cx-feature__country">{league.country}</span>
        </span>
        <span className="cx-feature__name">{league.name}</span>
        <span className="cx-feature__foot">
          <span className="cx-feature__format">{formatLabel(league)}</span>
          <span className="cx-feature__cta">
            Open
            <ArrowUpRight size={13} aria-hidden="true" />
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
