"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, SearchX, Users } from "lucide-react";
import { EmptyState, SectionHeader } from "@/components/ui/Primitives";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import type { League } from "@/data/leagues";
import type { SearchTeamResult } from "@/lib/types";

function LeagueCard({ league, meta }: { league: League; meta: ReactNode }) {
  const { lang } = useI18n();
  return (
    <Link href={`/competitions/${league.slug}`} className="search-result">
      <LeagueLogo src={league.logo} name={league.name} size={30} />
      <span className="search-result__text">
        <span className="search-result__name">{leagueDisplayName(league, lang)}</span>
        <span className="search-result__meta">{meta}</span>
      </span>
      <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
    </Link>
  );
}

export function PopularCompetitionsView({ leagues }: { leagues: League[] }) {
  const { t } = useI18n();
  const popular = t.content.search.popular;

  return (
    <section className="search-section">
      <SectionHeader
        kicker={popular.kicker}
        title={popular.title}
        action={{ href: "/competitions", label: popular.action }}
      />
      <div className="search-results-grid">
        {leagues.map((league) => (
          <LeagueCard
            key={league.slug}
            league={league}
            meta={
              <>
                {league.country} · {league.country === league.region ? "" : league.region}
              </>
            }
          />
        ))}
      </div>
    </section>
  );
}

export function SearchResultsView({
  query,
  total,
  teamsAvailable,
  leagues,
  teams,
}: {
  query: string;
  total: number;
  teamsAvailable: boolean;
  leagues: League[];
  teams: SearchTeamResult[];
}) {
  const { t, f } = useI18n();
  const search = t.content.search;
  const results = search.results;

  return (
    <section className="search-section" aria-live="polite">
      <SectionHeader
        kicker={results.kicker}
        title={f(total === 1 ? results.titleSingle : results.titlePlural, {
          n: formatNumber(total),
          query,
        })}
        description={
          teamsAvailable ? results.descriptionOk : results.descriptionNoTeams
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title={results.empty.title}
          description={results.empty.description}
          action={{ href: "/competitions", label: results.empty.action }}
        >
          <Link href="/matches" className="btn btn--ghost">
            {results.empty.todaysMatches}
          </Link>
        </EmptyState>
      ) : null}

      {leagues.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <h2 className="group-title">{results.competitionsHeading}</h2>
          <div className="search-results-grid">
            {leagues.map((league) => (
              <LeagueCard
                key={league.slug}
                league={league}
                meta={
                  <>
                    {league.country} · {search.kinds.formats[league.format]} ·{" "}
                    {search.kinds.gender[league.gender]}
                  </>
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {teams.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <h2 className="group-title">
            <Users size={14} aria-hidden="true" /> {results.teamsHeading}
          </h2>
          <div className="search-results-grid">
            {teams.map((team) => (
              <Link key={team.id} href={`/team/${team.id}`} className="search-result">
                <TeamLogo src={team.logo} name={team.name} size={30} />
                <span className="search-result__text">
                  <span className="search-result__name">{team.name}</span>
                  <span className="search-result__meta">
                    {team.leagueName ?? search.teamFallback}
                  </span>
                </span>
                <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
