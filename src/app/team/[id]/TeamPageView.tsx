"use client";

import Link from "next/link";
import { CalendarDays, ShieldCheck, Trophy } from "lucide-react";
import { TeamLogo } from "@/components/ui/Logos";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { Badge, EmptyState, SectionHeader } from "@/components/ui/Primitives";
import { SeasonSelect } from "@/components/competitions/LeagueFilters";
import { MatchRow } from "@/components/soccer/MatchRow";
import { getLeague } from "@/data/leagues";
import { seasonLabel } from "@/lib/date";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import type { Match, TeamFixture, TeamPageData } from "@/lib/types";

function toMatch(
  fixture: TeamFixture,
  fallbackCompetition: string,
): Match {
  const homeScore = fixture.homeScore ? Number(fixture.homeScore) : undefined;
  const awayScore = fixture.awayScore ? Number(fixture.awayScore) : undefined;
  const finished =
    fixture.state === "finished" ||
    fixture.state === "live" ||
    fixture.state === "halftime";
  const homeWinner =
    finished &&
    homeScore !== undefined &&
    awayScore !== undefined &&
    homeScore > awayScore;
  const awayWinner =
    finished &&
    homeScore !== undefined &&
    awayScore !== undefined &&
    awayScore > homeScore;
  const league = fixture.leagueSlug ? getLeague(fixture.leagueSlug) : undefined;

  return {
    id: fixture.id,
    date: fixture.date,
    name: fixture.name,
    state: fixture.state,
    statusLabel: fixture.statusLabel,
    statusDetail: "",
    competition: {
      name: fixture.leagueName ?? fallbackCompetition,
      slug: fixture.leagueSlug,
    },
    league,
    home: {
      ...fixture.home,
      homeAway: "home",
      score: fixture.homeScore,
      winner: homeWinner,
    },
    away: {
      ...fixture.away,
      homeAway: "away",
      score: fixture.awayScore,
      winner: awayWinner,
    },
    venue: fixture.venue,
    broadcasts: [],
  };
}

function FixtureSection({
  title,
  fixtures,
  empty,
  fallbackCompetition,
}: {
  title: string;
  fixtures: TeamFixture[];
  empty: string;
  fallbackCompetition: string;
}) {
  return (
    <section className="match-group">
      <div className="match-group__head">
        <h2 className="match-group__name">{title}</h2>
        <span className="small text-muted">{fixtures.length}</span>
      </div>
      {fixtures.length === 0 ? (
        <div className="match-list">
          <div className="content-card__empty">{empty}</div>
        </div>
      ) : (
        <div className="match-list">
          {fixtures.map((fixture) => (
            <MatchRow
              key={fixture.id}
              match={toMatch(fixture, fallbackCompetition)}
              showCompetition
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function TeamPageView({ data }: { data: TeamPageData }) {
  const { t, f, lang } = useI18n();
  const m = t.team;
  const { team, fixtures, league, season } = data;
  const upcoming = fixtures.filter(
    (fixture) =>
      fixture.state === "scheduled" ||
      fixture.state === "postponed" ||
      fixture.state === "unknown",
  );
  const results = fixtures.filter(
    (fixture) =>
      fixture.state === "finished" ||
      fixture.state === "live" ||
      fixture.state === "halftime" ||
      fixture.state === "canceled",
  );
  const seasonText = league ? seasonLabel(season, league) : String(season);

  return (
    <>
      <header className="league-hero">
        <TeamLogo src={team.logo} name={team.name} size={66} decorative={false} />
        <div className="league-hero__text">
          <p className="kicker">
            {league ? (
              <Link href={`/competitions/${league.slug}`}>
                {leagueDisplayName(
                  { slug: league.slug, name: league.name },
                  lang,
                )}
              </Link>
            ) : (
              m.hero.kicker
            )}
          </p>
          <h1 className="league-hero__title">{team.name}</h1>
          <div className="league-hero__meta">
            {team.abbreviation ? <Badge tone="muted">{team.abbreviation}</Badge> : null}
            <Badge tone="accent">
              <span className="u-dir-ltr">{seasonText}</span>
            </Badge>
            {team.standingSummary ? (
              <Badge tone="muted">{team.standingSummary}</Badge>
            ) : null}
            {team.recordSummary ? (
              <Badge tone="muted">{team.recordSummary}</Badge>
            ) : null}
            {team.seasonSummary ? (
              <Badge tone="muted">{team.seasonSummary}</Badge>
            ) : null}
          </div>
        </div>
        <div className="league-hero__actions">
          <SeasonSelect
            season={season}
            defaultSeason={season}
            region={league?.region ?? ""}
          />
          <FavoriteButton
            kind="team"
            item={{
              id: team.id,
              name: team.shortName || team.name,
              abbreviation: team.abbreviation,
              logo: team.logo,
              leagueSlug: league?.slug ?? team.leagueSlug,
            }}
            withLabel
          />
          <ShareButton title={team.name} withLabel />
        </div>
      </header>

      <div className="stat-strip" style={{ marginBottom: 24 }}>
        <div className="stat-strip__item">
          <span className="stat-strip__value">{fixtures.length}</span>
          <span className="stat-strip__label">{m.summary.fixturesThisSeason}</span>
        </div>
        <div className="stat-strip__item">
          <span className="stat-strip__value">{results.length}</span>
          <span className="stat-strip__label">{m.summary.played}</span>
        </div>
        <div className="stat-strip__item">
          <span className="stat-strip__value">{upcoming.length}</span>
          <span className="stat-strip__label">{m.summary.stillToCome}</span>
        </div>
        <div className="stat-strip__item">
          <span className="stat-strip__value">
            <span className="u-dir-ltr">{seasonText}</span>
          </span>
          <span className="stat-strip__label">{m.summary.selectedSeason}</span>
        </div>
      </div>

      <div className="fixtures-toolbar">
        {league ? (
          <Link
            href={`/competitions/${league.slug}?season=${season}`}
            className="btn btn--ghost btn--sm"
          >
            <Trophy size={15} aria-hidden="true" />
            {f(m.toolbar.leagueTable, { abbr: league.abbreviation })}
          </Link>
        ) : null}
        <Link href="/matches" className="btn btn--ghost btn--sm">
          <CalendarDays size={15} aria-hidden="true" />
          {m.toolbar.matchCentre}
        </Link>
        <span className="fixtures-count">
          <ShieldCheck size={12} aria-hidden="true" /> {m.toolbar.source}
        </span>
      </div>

      {fixtures.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title={m.fixtures.noneTitle}
          description={m.fixtures.noneDescription}
          action={{
            href: "/competitions",
            label: m.fixtures.browseCompetitions,
          }}
        />
      ) : (
        <>
          <FixtureSection
            title={m.fixtures.upcoming}
            fixtures={upcoming}
            empty={m.fixtures.upcomingEmpty}
            fallbackCompetition={t.layout.nav.competitions}
          />
          <FixtureSection
            title={m.fixtures.results}
            fixtures={results}
            empty={m.fixtures.resultsEmpty}
            fallbackCompetition={t.layout.nav.competitions}
          />
        </>
      )}

      <section className="section">
        <SectionHeader
          kicker={m.explore.kicker}
          title={m.explore.title}
          description={m.explore.description}
          action={
            league
              ? { href: `/competitions/${league.slug}`, label: league.abbreviation }
              : { href: "/competitions", label: t.layout.nav.competitions }
          }
        />
        <div className="fixtures-toolbar">
          {league ? (
            <>
              <Link
                href={`/competitions/${league.slug}?tab=standings&season=${season}`}
                className="btn btn--soft"
              >
                {m.explore.leagueTable}
              </Link>
              <Link
                href={`/competitions/${league.slug}?tab=fixtures&season=${season}`}
                className="btn btn--soft"
              >
                {m.explore.fullSeason}
              </Link>
              <Link
                href={`/competitions/${league.slug}?tab=scorers&season=${season}`}
                className="btn btn--soft"
              >
                {m.explore.topScorers}
              </Link>
            </>
          ) : (
            <Link href="/competitions" className="btn btn--soft">
              {m.explore.allCompetitions}
            </Link>
          )}
        </div>
      </section>

      <p className="small text-muted" style={{ marginTop: 14 }}>
        {m.footnote}
      </p>
    </>
  );
}
