import { Suspense } from "react";
import { connection } from "next/server";
import { getFeaturedLeagues, searchAll } from "@/lib/api";
import { Skeleton } from "@/components/ui/Primitives";
import { SearchShellView } from "./SearchShellView";
import { PopularCompetitionsView, SearchResultsView } from "./SearchResultsView";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export const metadata = {
  title: "Search",
  description:
    "Search football competitions and teams across 76 leagues, then jump straight to live tables, fixtures or a team's season.",
  robots: { index: false, follow: true },
};

async function SearchResults({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const query = (first(params.q) ?? "").trim().slice(0, 80);

  if (!query) {
    return <PopularCompetitionsView leagues={getFeaturedLeagues().slice(0, 8)} />;
  }

  const results = await searchAll(query);
  const total = results.leagues.length + results.teams.length;

  return (
    <SearchResultsView
      query={query}
      total={total}
      teamsAvailable={results.teamsAvailable}
      leagues={results.leagues}
      teams={results.teams}
    />
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
      <SearchShellView />
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
