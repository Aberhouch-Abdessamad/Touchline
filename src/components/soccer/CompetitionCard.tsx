import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LeagueLogo } from "@/components/ui/Logos";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { Badge } from "@/components/ui/Primitives";
import type { League } from "@/data/leagues";

/**
 * A competition tile. The favourite control sits outside the card link so the
 * markup never nests a button inside an anchor.
 */
export function CompetitionCard({ league }: { league: League }) {
  return (
    <div style={{ position: "relative" }}>
      <Link href={`/competitions/${league.slug}`} className="competition-card">
        <span className="competition-card__top">
          <LeagueLogo src={league.logo} name={league.name} size={36} />
          <span className="competition-card__text">
            <span className="competition-card__name">{league.name}</span>
            <span className="competition-card__country">
              {league.country} · {league.region}
            </span>
          </span>
        </span>
        <span className="competition-card__meta">
          <Badge tone="muted">
            {league.type === "club" ? "Club" : "National"}
          </Badge>
          <Badge tone="muted">{league.format}</Badge>
          <Badge tone="muted">
            {league.gender === "women" ? "Women" : "Men"}
          </Badge>
          {league.youth ? <Badge tone="warning">Youth</Badge> : null}
        </span>
        <span className="competition-card__arrow" aria-hidden="true">
          <ArrowUpRight size={16} />
        </span>
      </Link>
      <FavoriteButton
        kind="league"
        item={{
          slug: league.slug,
          name: league.name,
          logo: league.logo ?? undefined,
        }}
        className="competition-card__star"
      />
    </div>
  );
}
