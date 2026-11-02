"use client";

import { CompetitionCard } from "@/components/soccer/CompetitionCard";
import { SectionHeader } from "@/components/ui/Primitives";
import { useI18n } from "@/lib/i18n";
import { regionLabel } from "./labels";
import type { League } from "@/data/leagues";

/**
 * Competitions from the same region as the league being viewed. The related
 * leagues are selected server-side; only labels are resolved here.
 */
export function RelatedCompetitions({
  region,
  related,
}: {
  region: string;
  related: League[];
}) {
  const { t, f } = useI18n();

  if (related.length === 0) return null;

  return (
    <section className="section">
      <SectionHeader
        kicker={f(t.competitions.detail.relatedKicker, {
          region: regionLabel(t, region),
        })}
        title={t.competitions.detail.relatedTitle}
        action={{
          href: "/competitions",
          label: t.competitions.detail.allCompetitions,
        }}
      />
      <div className="competition-grid">
        {related.map((league) => (
          <CompetitionCard key={league.slug} league={league} />
        ))}
      </div>
    </section>
  );
}
