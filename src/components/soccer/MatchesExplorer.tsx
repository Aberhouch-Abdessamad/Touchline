"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarX2,
  ChevronDown,
  Search,
  Star,
  X,
} from "lucide-react";
import { MatchCentreRow } from "./MatchCentreRow";
import { LiveMatchCard } from "./LiveMatchCard";
import { EmptyState } from "@/components/ui/Primitives";
import { LeagueLogo } from "@/components/ui/Logos";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { compareCompetitions } from "@/lib/leaguePriority";
import { cn } from "@/lib/utils";
import type { Match } from "@/lib/types";

type StateFilter = "all" | "live" | "scheduled" | "finished";

const TABS: Array<{ id: StateFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "scheduled", label: "Upcoming" },
  { id: "finished", label: "Results" },
];

const LIVE_PREVIEW = 6;
const GROUP_PAGE = 10;
const ROW_PAGE = 4;

function isLive(match: Match): boolean {
  return match.state === "live" || match.state === "halftime";
}

function competitionKey(match: Match): string {
  return match.league?.slug ?? match.competition.slug ?? match.competition.name;
}

function competitionName(match: Match): string {
  return match.league?.name ?? match.competition.name;
}

function boardTitle(state: StateFilter): string {
  if (state === "finished") return "Results by competition";
  if (state === "scheduled") return "Upcoming by competition";
  return "Fixtures by competition";
}

interface Group {
  key: string;
  name: string;
  slug?: string;
  logo?: string | null;
  round?: string;
  matches: Match[];
}

export function MatchesExplorer({ matches }: { matches: Match[] }) {
  const preferences = usePreferences();
  const [competition, setCompetition] = useState("all");
  const [state, setState] = useState<StateFilter>("all");
  const [query, setQuery] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [groupLimit, setGroupLimit] = useState(GROUP_PAGE);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );

  const needle = query.trim().toLowerCase();

  const favouriteTeamIds = useMemo(
    () => new Set(preferences.favorites.teams.map((team) => team.id)),
    [preferences.favorites.teams],
  );
  const favouriteLeagueSlugs = useMemo(
    () => new Set(preferences.favorites.leagues.map((league) => league.slug)),
    [preferences.favorites.leagues],
  );
  const favouriteMatchIds = useMemo(
    () => new Set(preferences.favorites.matches.map((match) => match.id)),
    [preferences.favorites.matches],
  );

  const competitions = useMemo(() => {
    const map = new Map<string, string>();
    for (const match of matches) {
      const key = competitionKey(match);
      if (!map.has(key)) {
        map.set(key, match.league?.name ?? match.competition.name);
      }
    }
    return [...map.entries()].sort((a, b) =>
      compareCompetitions(
        { slug: a[0], name: a[1] },
        { slug: b[0], name: b[1] },
      ),
    );
  }, [matches]);

  /** Everything the current competition, search and favourites filters allow. */
  const scoped = useMemo(() => {
    return matches
      .filter((match) => {
        if (competition !== "all" && competitionKey(match) !== competition) {
          return false;
        }

        if (preferences.hydrated && favouritesOnly) {
          const slug = match.league?.slug ?? match.competition.slug;
          const favourite =
            favouriteMatchIds.has(match.id) ||
            (slug ? favouriteLeagueSlugs.has(slug) : false) ||
            favouriteTeamIds.has(match.home.id) ||
            favouriteTeamIds.has(match.away.id);
          if (!favourite) return false;
        }

        if (needle) {
          const haystack = [
            match.home.name,
            match.home.shortName,
            match.home.abbreviation,
            match.away.name,
            match.away.shortName,
            match.away.abbreviation,
            match.league?.name,
            match.competition.name,
            match.venue,
            match.city,
            match.round,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }

        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [
    matches,
    competition,
    needle,
    favouritesOnly,
    preferences.hydrated,
    favouriteMatchIds,
    favouriteLeagueSlugs,
    favouriteTeamIds,
  ]);

  const stateCounts = useMemo(
    () => ({
      all: scoped.length,
      live: scoped.filter(isLive).length,
      scheduled: scoped.filter((match) => match.state === "scheduled").length,
      finished: scoped.filter((match) => match.state === "finished").length,
    }),
    [scoped],
  );

  const liveMatches = useMemo(
    () =>
      scoped
        .filter(isLive)
        .sort(
          (a, b) =>
            compareCompetitions(
              { slug: competitionKey(a), name: competitionName(a) },
              { slug: competitionKey(b), name: competitionName(b) },
            ) || a.date.localeCompare(b.date),
        ),
    [scoped],
  );

  const resultMatches = useMemo(() => {
    if (state === "all") return scoped;
    if (state === "live") return liveMatches;
    return scoped.filter((match) => match.state === state);
  }, [scoped, state, liveMatches]);

  /**
   * In the "all" view live games are promoted to the band above, so the
   * competition cards only carry scheduled and finished fixtures.
   */
  const groups = useMemo(() => {
    if (state === "live") return [];
    const source =
      state === "all"
        ? resultMatches.filter((match) => !isLive(match))
        : resultMatches;
    const map = new Map<string, Group>();
    for (const match of source) {
      const key = competitionKey(match);
      const group = map.get(key);
      if (group) {
        group.matches.push(match);
      } else {
        map.set(key, {
          key,
          name: competitionName(match),
          slug: match.league?.slug,
          logo: match.league?.logo ?? match.competition.logo ?? null,
          matches: [match],
        });
      }
    }

    for (const group of map.values()) {
      const rounds = new Set(
        group.matches
          .map((match) => match.round)
          .filter((round): round is string => Boolean(round)),
      );
      if (rounds.size === 1) group.round = [...rounds][0];
    }

    return [...map.values()].sort(compareCompetitions);
  }, [resultMatches, state]);

  const visibleGroups = groups.slice(0, groupLimit);
  const hiddenGroups = groups.length - visibleGroups.length;
  const livePreview =
    state === "all" ? liveMatches.slice(0, LIVE_PREVIEW) : liveMatches;
  const hiddenLive = liveMatches.length - livePreview.length;

  /** Any filter change starts the lists from the first page again. */
  const resetPaging = () => {
    setGroupLimit(GROUP_PAGE);
    setExpandedGroups(new Set());
    setCollapsedGroups(new Set());
  };

  const changeState = (next: StateFilter) => {
    if (next === state) return;
    setState(next);
    resetPaging();
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    resetPaging();
  };

  const changeCompetition = (next: string) => {
    setCompetition(next);
    resetPaging();
  };

  const toggleFavouritesOnly = () => {
    setFavouritesOnly((value) => !value);
    resetPaging();
  };

  const hasFilters =
    competition !== "all" || state !== "all" || needle !== "" || favouritesOnly;

  const resetFilters = () => {
    setCompetition("all");
    setState("all");
    setQuery("");
    setFavouritesOnly(false);
    resetPaging();
  };

  const toggleExpanded = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCollapsed = (key: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const rowLimit = competition === "all" && !needle ? ROW_PAGE : 24;
  const showLiveBand = state === "all" || state === "live";

  return (
    <div className="mc-results">
      <div className="mc-toolbar">
        <div className="mc-tabs" role="group" aria-label="Filter by match state">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn("mc-tab", state === tab.id && "is-active")}
              aria-pressed={state === tab.id}
              onClick={() => changeState(tab.id)}
            >
              {tab.label}
              <span className="mc-tab__count">{stateCounts[tab.id]}</span>
            </button>
          ))}
        </div>

        <div className="mc-filters">
          <div className="mc-search">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Search fixtures"
              aria-label="Search fixtures"
            />
            {query ? (
              <button
                type="button"
                className="mc-search__clear"
                onClick={() => changeQuery("")}
                aria-label="Clear search"
              >
                <X size={12} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="mc-select">
            <select
              value={competition}
              onChange={(event) => changeCompetition(event.target.value)}
              aria-label="Filter by competition"
            >
              <option value="all">All competitions</option>
              {competitions.map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} aria-hidden="true" />
          </div>

          <button
            type="button"
            className={cn("mc-toggle", favouritesOnly && "is-active")}
            aria-pressed={favouritesOnly}
            onClick={toggleFavouritesOnly}
          >
            <Star size={13} aria-hidden="true" />
            Favourites
          </button>

          {hasFilters ? (
            <button type="button" className="mc-reset" onClick={resetFilters}>
              <X size={12} aria-hidden="true" />
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <p className="mc-statusline" aria-live="polite">
        <span>
          <strong>{resultMatches.length}</strong>{" "}
          {resultMatches.length === 1 ? "match" : "matches"}
        </span>
        {state === "all" && liveMatches.length > 0 ? (
          <span className="mc-statusline__live">
            <i className="mc-dot" aria-hidden="true" />
            {liveMatches.length} live
          </span>
        ) : null}
        {needle ? <span>· “{query.trim()}”</span> : null}
        <span className="mc-statusline__hint">
          Kick-offs in your timezone
        </span>
      </p>

      {resultMatches.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 size={22} />}
          title={
            favouritesOnly && preferences.hydrated
              ? "No favourite fixtures in this view"
              : needle
                ? "No fixtures match that search"
                : "No matches in this view"
          }
          description={
            favouritesOnly && preferences.hydrated
              ? "Star a competition, team or match to build a personal fixture list, then switch this filter on."
              : "Try another competition or match state, move to a neighbouring day, or clear the filters."
          }
        >
          {hasFilters ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={resetFilters}
            >
              Clear filters
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {showLiveBand && liveMatches.length > 0 ? (
            <section className="mc-live" aria-labelledby="mc-live-title">
              <div className="mc-live__head">
                <span className="mc-live__pill">
                  <i className="mc-card__dot" aria-hidden="true" />
                  Live now
                </span>
                <h2 className="mc-live__title" id="mc-live-title">
                  {liveMatches.length} in play
                </h2>
                <span className="mc-live__note">
                  Scores update on their own
                </span>
                {hiddenLive > 0 ? (
                  <button
                    type="button"
                    className="mc-live__all"
                    onClick={() => changeState("live")}
                  >
                    All live matches
                    <ArrowRight size={13} aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="mc-live__grid">
                {livePreview.map((match) => (
                  <LiveMatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          ) : null}

          {state !== "live" && groups.length > 0 ? (
            <section className="mc-board" aria-labelledby="mc-board-title">
              <div className="mc-board__head">
                <h2 className="mc-board__title" id="mc-board-title">
                  {boardTitle(state)}
                </h2>
                <span className="mc-board__count">
                  {groups.length}{" "}
                  {groups.length === 1 ? "competition" : "competitions"}
                  {state === "all" && liveMatches.length > 0
                    ? " · live games above"
                    : ""}
                </span>
              </div>

              <div className="mc-groups">
                {visibleGroups.map((group) => {
                  const collapsed = collapsedGroups.has(group.key);
                  const expanded = expandedGroups.has(group.key);
                  const rows =
                    expanded || collapsed || group.matches.length <= rowLimit
                      ? group.matches
                      : group.matches.slice(0, rowLimit);
                  const hiddenRows = group.matches.length - rows.length;
                  const subtitle = `${
                    group.matches.length
                  } ${group.matches.length === 1 ? "fixture" : "fixtures"}${
                    group.round ? ` · ${group.round}` : ""
                  }`;

                  return (
                    <section
                      className={cn("mc-group", collapsed && "is-collapsed")}
                      key={group.key}
                      aria-labelledby={`mc-group-${group.key}`}
                    >
                      <header className="mc-group__head">
                        {group.logo ? (
                          <LeagueLogo
                            src={group.logo}
                            name={group.name}
                            size={20}
                            className="mc-group__logo"
                          />
                        ) : (
                          <span
                            className="mc-group__mark"
                            aria-hidden="true"
                          />
                        )}
                        <div className="mc-group__id">
                          <h3
                            className="mc-group__name"
                            id={`mc-group-${group.key}`}
                          >
                            {group.slug ? (
                              <Link href={`/competitions/${group.slug}`}>
                                {group.name}
                              </Link>
                            ) : (
                              group.name
                            )}
                          </h3>
                          <span className="mc-group__sub">{subtitle}</span>
                        </div>
                        <span className="mc-group__spacer" />
                        {group.slug ? (
                          <Link
                            href={`/competitions/${group.slug}`}
                            className="mc-group__link"
                          >
                            Table &amp; fixtures
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="mc-group__toggle"
                          aria-expanded={!collapsed}
                          onClick={() => toggleCollapsed(group.key)}
                          aria-label={
                            collapsed
                              ? `Show ${group.name} fixtures`
                              : `Hide ${group.name} fixtures`
                          }
                        >
                          <ChevronDown size={16} aria-hidden="true" />
                        </button>
                      </header>

                      {collapsed ? null : (
                        <div className="mc-group__rows">
                          {rows.map((match) => (
                            <MatchCentreRow key={match.id} match={match} />
                          ))}
                          {hiddenRows > 0 ? (
                            <button
                              type="button"
                              className="mc-group__more"
                              onClick={() => toggleExpanded(group.key)}
                            >
                              Show all {group.matches.length} fixtures
                              <ChevronDown size={14} aria-hidden="true" />
                            </button>
                          ) : null}
                          {expanded && group.matches.length > rowLimit ? (
                            <button
                              type="button"
                              className="mc-group__more is-collapse"
                              onClick={() => toggleExpanded(group.key)}
                            >
                              Show fewer
                              <ChevronDown size={14} aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {hiddenGroups > 0 ? (
                <div className="mc-loadmore">
                  <button
                    type="button"
                    className="mc-loadmore__button"
                    onClick={() => setGroupLimit((value) => value + GROUP_PAGE)}
                  >
                    Show more competitions
                    <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <span className="mc-loadmore__meta">
                    {visibleGroups.length} of {groups.length} shown
                  </span>
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}

      <p className="mc-note">
        Favourites live in this browser only — nothing is sent to a server.
      </p>
    </div>
  );
}
