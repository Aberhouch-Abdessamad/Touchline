"use client";

import Link from "next/link";
import { TeamLogo } from "@/components/ui/Logos";
import { useI18n } from "@/lib/i18n";
import { seasonLabel } from "@/lib/date";
import type { ScorerBoard } from "@/lib/types";

type Metric = "goals" | "assists";

/**
 * One scorer leaderboard (top scorers or most assists). Team and player
 * names stay in data language; headings, captions and the appearance count
 * are translated.
 */
export function ScorerList({
  scorers,
  metric,
  season,
  region,
}: {
  scorers: ScorerBoard["goals"];
  metric: Metric;
  season: number;
  region: string;
}) {
  const { t, f } = useI18n();
  const scorersDict = t.competitions.scorers;

  return (
    <section className="scorer-card">
      <div className="scorer-card__head">
        <h2 className="scorer-card__title">
          {metric === "goals" ? scorersDict.topScorers : scorersDict.mostAssists}
        </h2>
        <span className="small text-muted">
          <span className="u-dir-ltr">{seasonLabel(season, { region })}</span>
          {" · "}
          {metric === "goals" ? scorersDict.goals : scorersDict.assists}
        </span>
      </div>
      {scorers.length === 0 ? (
        <div className="content-card__empty">{scorersDict.empty}</div>
      ) : (
        <ol>
          {scorers.map((scorer) => (
            <li key={`${metric}-${scorer.playerId}-${scorer.rank}`}>
              <div className="scorer-row">
                <span className="scorer-row__rank">{scorer.rank}</span>
                <div className="scorer-row__player">
                  <span className="scorer-row__name">{scorer.playerName}</span>
                  <span className="scorer-row__team">
                    <TeamLogo
                      src={scorer.team.logo}
                      name={scorer.team.name}
                      size={12}
                    />
                    <Link href={`/team/${scorer.team.id}`}>
                      {scorer.team.shortName || scorer.team.name}
                    </Link>
                  </span>
                </div>
                <span className="scorer-row__value">
                  {scorer[metric]}
                  <span className="scorer-row__meta">
                    {scorer.appearances
                      ? f(scorersDict.apps, { n: scorer.appearances })
                      : ""}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
