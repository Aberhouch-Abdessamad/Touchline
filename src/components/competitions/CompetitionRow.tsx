import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { LeagueLogo } from "@/components/ui/Logos";
import { cn } from "@/lib/utils";
import type { League } from "@/data/leagues";

/**
 * A compact directory row. The favourite control is a sibling of the link so
 * the markup never nests a button inside an anchor.
 */
export function CompetitionRow({ league }: { league: League }) {
  const secondary =
    league.country === league.region ? null : league.region;

  return (
    <div className="cx-row">
      <Link href={`/competitions/${league.slug}`} className="cx-row__link">
        <span className="cx-row__logo">
          <LeagueLogo src={league.logo} name={league.name} size={26} />
        </span>
        <span className="cx-row__body">
          <span className="cx-row__name">{league.name}</span>
          <span className="cx-row__meta">
            {league.country}
            {secondary ? (
              <>
                <span className="cx-row__dot" aria-hidden="true" />
                {secondary}
              </>
            ) : null}
          </span>
        </span>
        <span className="cx-row__tags">
          <span className="cx-row__tag">
            {league.type === "club" ? "Club" : "National"}
          </span>
          <span className="cx-row__tag">{league.format}</span>
          {league.gender === "women" ? (
            <span className={cn("cx-row__tag", "is-women")}>Women</span>
          ) : null}
        </span>
        <span className="cx-row__arrow" aria-hidden="true">
          <ArrowUpRight size={14} />
        </span>
      </Link>
      <FavoriteButton
        kind="league"
        item={{
          slug: league.slug,
          name: league.name,
          logo: league.logo ?? undefined,
        }}
        className="cx-row__star"
      />
    </div>
  );
}
