"use client";

import { useMemo, useState } from "react";
import {
  CalendarX2,
  ChevronDown,
  Search,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { CompetitionFeature } from "./CompetitionFeature";
import { CompetitionRow } from "./CompetitionRow";
import { EmptyState } from "@/components/ui/Primitives";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { cn } from "@/lib/utils";
import type { League } from "@/data/leagues";

const ALL = "all";

type Collection = "all" | "club" | "national" | "cup" | "women";

const COLLECTIONS: Array<{ id: Collection; label: string }> = [
  { id: "all", label: "All" },
  { id: "club", label: "Clubs" },
  { id: "national", label: "National" },
  { id: "cup", label: "Cups" },
  { id: "women", label: "Women" },
];

/** Editorial order for the region sections. */
const REGION_ORDER = [
  "Europe",
  "South America",
  "North America",
  "Asia",
  "Africa",
  "Oceania",
  "World",
];

/** Big-five leagues plus the Champions League lead the page. */
const SHOWCASE_SLUGS = [
  "eng.1",
  "esp.1",
  "ita.1",
  "ger.1",
  "fra.1",
  "uefa.champions",
];

/** Long regions open with a scannable first block, then reveal the rest. */
const REGION_CAP = 8;

function RegionSection({
  region,
  leagues,
  cap,
}: {
  region: string;
  leagues: League[];
  cap: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const headingId = `cx-region-${region.toLowerCase().replaceAll(" ", "-")}`;
  const listId = `${headingId}-list`;
  const collapsible = cap !== null && leagues.length > cap;
  const visible = collapsible && !expanded ? leagues.slice(0, cap) : leagues;

  return (
    <section className="cx-section" aria-labelledby={headingId}>
      <header className="cx-section__head">
        <h2 className="cx-section__title" id={headingId}>
          {region}
        </h2>
        <span className="cx-section__count">{leagues.length}</span>
        <span className="cx-section__rule" aria-hidden="true" />
      </header>

      <div className="cx-list" id={listId}>
        {visible.map((league) => (
          <CompetitionRow key={league.slug} league={league} />
        ))}
      </div>

      {collapsible ? (
        <button
          type="button"
          className="cx-more"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `Show all ${leagues.length}`}
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}

function matchesCollection(league: League, collection: Collection): boolean {
  switch (collection) {
    case "club":
      return league.type === "club";
    case "national":
      return league.type === "national";
    case "cup":
      return league.format === "cup";
    case "women":
      return league.gender === "women";
    default:
      return true;
  }
}

export function CompetitionsExplorer({ leagues }: { leagues: League[] }) {
  const preferences = usePreferences();
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState<Collection>("all");
  const [region, setRegion] = useState(ALL);
  const [favouritesOnly, setFavouritesOnly] = useState(false);

  const regions = useMemo(() => {
    const found = new Set(leagues.map((league) => league.region));
    const ordered = REGION_ORDER.filter((name) => found.has(name));
    const extra = [...found]
      .filter((name) => !REGION_ORDER.includes(name))
      .sort();
    return [...ordered, ...extra];
  }, [leagues]);

  const favouriteSlugs = useMemo(
    () => new Set(preferences.favorites.leagues.map((league) => league.slug)),
    [preferences.favorites.leagues],
  );

  const counts = useMemo(() => {
    const result: Record<Collection, number> = {
      all: leagues.length,
      club: 0,
      national: 0,
      cup: 0,
      women: 0,
    };
    for (const league of leagues) {
      if (league.type === "club") result.club += 1;
      else result.national += 1;
      if (league.format === "cup") result.cup += 1;
      if (league.gender === "women") result.women += 1;
    }
    return result;
  }, [leagues]);

  const needle = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return leagues
      .filter((league) => {
        if (!matchesCollection(league, collection)) return false;
        if (region !== ALL && league.region !== region) return false;
        if (
          favouritesOnly &&
          preferences.hydrated &&
          !favouriteSlugs.has(league.slug)
        ) {
          return false;
        }
        if (!needle) return true;
        const haystack = [
          league.name,
          league.abbreviation,
          league.country,
          league.region,
          ...league.aliases,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => a.order - b.order);
  }, [
    leagues,
    collection,
    region,
    favouritesOnly,
    preferences.hydrated,
    favouriteSlugs,
    needle,
  ]);

  const hasFilters =
    collection !== "all" || region !== ALL || needle !== "" || favouritesOnly;

  const spotlight = useMemo(() => {
    const bySlug = new Map(leagues.map((league) => [league.slug, league]));
    return SHOWCASE_SLUGS.map((slug) => bySlug.get(slug)).filter(
      (league): league is League => Boolean(league),
    );
  }, [leagues]);

  /** Spotlights only stand in for the unfiltered index; filters show a flat run. */
  const showSpotlight = !hasFilters && spotlight.length > 0;

  const groups = useMemo(() => {
    const promoted = showSpotlight ? new Set(SHOWCASE_SLUGS) : null;
    return regions
      .map((name) => ({
        region: name,
        leagues: filtered.filter(
          (league) =>
            league.region === name && !(promoted?.has(league.slug) ?? false),
        ),
      }))
      .filter((group) => group.leagues.length > 0);
  }, [regions, filtered, showSpotlight]);

  const reset = () => {
    setQuery("");
    setCollection("all");
    setRegion(ALL);
    setFavouritesOnly(false);
  };

  const changeCollection = (next: Collection) => setCollection(next);
  const changeRegion = (next: string) => setRegion(next);

  return (
    <div className="cx">
      <div className="cx-toolbar">
        <div
          className="cx-tabs"
          role="group"
          aria-label="Filter competitions by category"
        >
          {COLLECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cn(
                "cx-tab",
                collection === item.id && "is-active",
              )}
              aria-pressed={collection === item.id}
              onClick={() => changeCollection(item.id)}
            >
              {item.label}
              <span className="cx-tab__count">{counts[item.id]}</span>
            </button>
          ))}
        </div>

        <div className="cx-filters">
          <div className="cx-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search competitions"
              aria-label="Search competitions"
            />
            {query ? (
              <button
                type="button"
                className="cx-search__clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                <X size={12} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="cx-select">
            <select
              value={region}
              onChange={(event) => changeRegion(event.target.value)}
              aria-label="Filter by region"
            >
              <option value={ALL}>All regions</option>
              {regions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>

          <button
            type="button"
            className={cn("cx-toggle", favouritesOnly && "is-active")}
            aria-pressed={favouritesOnly}
            onClick={() => setFavouritesOnly((value) => !value)}
          >
            <Star size={13} aria-hidden="true" />
            Favourites
          </button>

          {hasFilters ? (
            <button type="button" className="cx-reset" onClick={reset}>
              <X size={12} aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <p className="cx-statusline" aria-live="polite">
        <span>
          <strong>{filtered.length}</strong>{" "}
          {filtered.length === 1 ? "competition" : "competitions"}
        </span>
        {region !== ALL ? <span>· {region}</span> : null}
        {needle ? <span>· “{query.trim()}”</span> : null}
        <span className="cx-statusline__hint">
          {favouritesOnly && preferences.hydrated
            ? "Starred in this browser"
            : `${groups.length} ${groups.length === 1 ? "region" : "regions"} · tables, fixtures & scorer boards`}
        </span>
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={22} />}
          title={
            favouritesOnly && preferences.hydrated
              ? "No favourite competitions yet"
              : "No competitions match these filters"
          }
          description={
            favouritesOnly && preferences.hydrated
              ? "Star any competition to pin it here. Favourites stay in this browser."
              : "Try a shorter search, another region, or a different category."
          }
        >
          {hasFilters ? (
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Clear filters
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {showSpotlight ? (
            <section
              className="cx-spotlight"
              aria-labelledby="cx-spotlight-title"
            >
              <div className="cx-spotlight__head">
                <span className="cx-spotlight__pill">
                  <Sparkles size={12} aria-hidden="true" />
                  Start here
                </span>
                <h2 className="cx-spotlight__title" id="cx-spotlight-title">
                  The competitions that matter most
                </h2>
                <span className="cx-spotlight__note">
                  Top leagues and the Champions League, one click from every
                  table and fixture.
                </span>
              </div>

              <div className="cx-feature-grid">
                {spotlight.map((league, index) => (
                  <CompetitionFeature
                    key={league.slug}
                    league={league}
                    lead={index === 0}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {groups.map((group) => (
            <RegionSection
              key={group.region}
              region={group.region}
              leagues={group.leagues}
              cap={hasFilters ? null : REGION_CAP}
            />
          ))}
        </>
      )}

      <p className="cx-note">
        Competition metadata is cached from ESPN&apos;s public league API. Tables,
        fixtures and scorer boards load when you open a competition.
      </p>
    </div>
  );
}
