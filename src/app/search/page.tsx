import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, Search, SearchX, Users } from "lucide-react";
import { TeamLogo, LeagueLogo } from "@/components/ui/Logos";
import { EmptyState, SectionHeader, Skeleton } from "@/components/ui/Primitives";
import { searchAll } from "@/lib/api";
import { getFeaturedLeagues } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SUGGESTIONS = [
  { label: "Arsenal", href: "/search?q=Arsenal" },
  { label: "Real Madrid", href: "/search?q=Real%20Madrid" },
  { label: "Premier League", href: "/search?q=Premier%20League" },
  { label: "Champions League", href: "/search?q=Champions%20League" },
  { label: "Nigeria", href: "/search?q=Nigeria" },
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = {
  title: "Search",
  description:
    "Search football competitions and teams across 76 leagues, then jump straight to live tables, fixtures or a team's season.",
  robots: { index: false, follow: true },
};

function SearchShell() {
  return (
    <section className="search-hero">
      <p className="kicker kicker--accent" style={{ textAlign: "center" }}>
        Find anything
      </p>
      <h1 className="search-hero__title">Search the football world</h1>
      <p className="search-hero__sub">
        Competitions from Touchline&apos;s verified catalogue and teams from
        ESPN&apos;s public search. Press enter to run a search.
      </p>
      <form className="search-hero__form" action="/search" method="get" role="search">
        <Search size={18} aria-hidden="true" />
        <label className="sr-only" htmlFor="site-search">
          Search competitions and teams
        </label>
        <input
          id="site-search"
          className="search-hero__input"
          type="search"
          name="q"
          placeholder="Team, competition or country"
          autoComplete="off"
          maxLength={80}
        />
        <button type="submit" className="btn btn--accent search-hero__submit">
          Search
        </button>
      </form>
      <div className="search-hint">
        <span>Try</span>
        {SUGGESTIONS.map((suggestion) => (
          <Link key={suggestion.href} href={suggestion.href}>
            {suggestion.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function PopularCompetitions() {
  const leagues = getFeaturedLeagues().slice(0, 8);
  return (
    <section className="search-section">
      <SectionHeader
        kicker="Start somewhere"
        title="Popular competitions"
        action={{ href: "/competitions", label: "All competitions" }}
      />
      <div className="search-results-grid">
        {leagues.map((league) => (
          <Link
            key={league.slug}
            href={`/competitions/${league.slug}`}
            className="search-result"
          >
            <LeagueLogo src={league.logo} name={league.name} size={30} />
            <span className="search-result__text">
              <span className="search-result__name">{league.name}</span>
              <span className="search-result__meta">
                {league.country} · {league.country === league.region ? "" : league.region}
              </span>
            </span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 80);

  if (!query) {
    return <PopularCompetitions />;
  }

  const results = await searchAll(query);
  const total = results.leagues.length + results.teams.length;

  return (
    <section className="search-section" aria-live="polite">
      <SectionHeader
        kicker="Results"
        title={`${formatNumber(total)} ${total === 1 ? "result" : "results"} for “${query}”`}
        description={
          results.teamsAvailable
            ? "Competitions come from Touchline's verified catalogue; teams come from ESPN's public search."
            : "ESPN's team search did not respond, so only competition matches are shown."
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="Nothing matched that search"
          description="Check the spelling, try a shorter name, or browse the competition directory."
          action={{ href: "/competitions", label: "Browse competitions" }}
        >
          <Link href="/matches" className="btn btn--ghost">
            Today&apos;s matches
          </Link>
        </EmptyState>
      ) : null}

      {results.leagues.length > 0 ? (
        <div style={{ marginTop: 18 }}>
          <h2 className="group-title">Competitions</h2>
          <div className="search-results-grid">
            {results.leagues.map((league) => (
              <Link
                key={league.slug}
                href={`/competitions/${league.slug}`}
                className="search-result"
              >
                <LeagueLogo src={league.logo} name={league.name} size={30} />
                <span className="search-result__text">
                  <span className="search-result__name">{league.name}</span>
                  <span className="search-result__meta">
                    {league.country} · {league.format} ·{" "}
                    {league.gender === "women" ? "Women" : "Men"}
                  </span>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {results.teams.length > 0 ? (
        <div style={{ marginTop: 22 }}>
          <h2 className="group-title">
            <Users size={14} aria-hidden="true" /> Teams
          </h2>
          <div className="search-results-grid">
            {results.teams.map((team) => (
              <Link
                key={team.id}
                href={`/team/${team.id}`}
                className="search-result"
              >
                <TeamLogo src={team.logo} name={team.name} size={30} />
                <span className="search-result__text">
                  <span className="search-result__name">{team.name}</span>
                  <span className="search-result__meta">
                    {team.leagueName ?? "Club or national team"}
                  </span>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SearchSkeleton() {
  return (
    <div className="search-section" aria-hidden="true">
      <Skeleton width={260} height={20} />
      <div className="search-results-grid" style={{ marginTop: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <div className="search-result" key={item}>
            <Skeleton width={30} height={30} />
            <div style={{ flex: 1, display: "grid", gap: 6 }}>
              <Skeleton width="60%" height={13} />
              <Skeleton width="40%" height={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <SearchShell />
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
