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
import { useI18n } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/dict";
import { cn } from "@/lib/utils";
import { regionLabel } from "./labels";
import type { League } from "@/data/leagues";

const ALL = "all";

type Collection = "all" | "club" | "national" | "cup" | "women";
type CollectionKey = keyof Dict["competitions"]["hub"]["collections"];

const COLLECTIONS: Array<{ id: Collection; labelKey?: CollectionKey }> = [
  { id: "all" },
  { id: "club", labelKey: "club" },
  { id: "national", labelKey: "national" },
  { id: "cup", labelKey: "cup" },
  { id: "women", labelKey: "women" },
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
  const { t, f } = useI18n();
  const headingId = `cx-region-${region.toLowerCase().replaceAll(" ", "-")}`;
  const listId = `${headingId}-list`;
  const collapsible = cap !== null && leagues.length > cap;
  const visible = collapsible && !expanded ? leagues.slice(0, cap) : leagues;

  return (
    <section className="cx-section" aria-labelledby={headingId}>
      <header className="cx-section__head">
        <h2 className="cx-section__title" id={headingId}>
          {regionLabel(t, region)}
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
          {expanded
            ? t.common.showLess
            : f(t.competitions.hub.showAll, { n: leagues.length })}
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
  const { t, f } = useI18n();
  const hub = t.competitions.hub;
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
          aria-label={hub.collectionsAria}
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
              {item.labelKey
                ? hub.collections[item.labelKey]
                : t.common.all}
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
              placeholder={hub.searchPlaceholder}
              aria-label={hub.searchPlaceholder}
            />
            {query ? (
              <button
                type="button"
                className="cx-search__clear"
                onClick={() => setQuery("")}
                aria-label={hub.searchClearAria}
              >
                <X size={12} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="cx-select">
            <select
              value={region}
              onChange={(event) => changeRegion(event.target.value)}
              aria-label={hub.regionAria}
            >
              <option value={ALL}>{t.competitions.filters.allRegions}</option>
              {regions.map((name) => (
                <option key={name} value={name}>
                  {regionLabel(t, name)}
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
            {t.common.favourites}
          </button>

          {hasFilters ? (
            <button type="button" className="cx-reset" onClick={reset}>
              <X size={12} aria-hidden="true" />
              {hub.reset}
            </button>
          ) : null}
        </div>
      </div>

      <p className="cx-statusline" aria-live="polite">
        <span>
          <strong>{filtered.length}</strong>{" "}
          {filtered.length === 1 ? hub.resultsOne : hub.resultsMany}
        </span>
        {region !== ALL ? <span>· {regionLabel(t, region)}</span> : null}
        {needle ? <span>{f(hub.searchTerm, { q: query.trim() })}</span> : null}
        <span className="cx-statusline__hint">
          {favouritesOnly && preferences.hydrated
            ? hub.starredHint
            : `${groups.length} ${groups.length === 1 ? hub.groupsOne : hub.groupsMany}`}
        </span>
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={22} />}
          title={
            favouritesOnly && preferences.hydrated
              ? hub.emptyFavouritesTitle
              : hub.emptyFiltersTitle
          }
          description={
            favouritesOnly && preferences.hydrated
              ? hub.emptyFavouritesBody
              : hub.emptyFiltersBody
          }
        >
          {hasFilters ? (
            <button type="button" className="btn btn--ghost" onClick={reset}>
              {hub.clearFilters}
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
                  {hub.spotlight.pill}
                </span>
                <h2 className="cx-spotlight__title" id="cx-spotlight-title">
                  {hub.spotlight.title}
                </h2>
                <span className="cx-spotlight__note">
                  {hub.spotlight.note}
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

      <p className="cx-note">{hub.note}</p>
    </div>
  );
}
