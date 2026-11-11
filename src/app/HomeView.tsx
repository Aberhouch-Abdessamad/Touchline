"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Globe2,
  MapPin,
  Minus,
  Newspaper,
  Trophy,
  Tv,
} from "lucide-react";
import { leagueDisplayName, useI18n, type I18nContextValue } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import type { League } from "@/data/leagues";
import type {
  Match,
  MatchCompetitor,
  NewsArticle,
  RankingBoard,
  RankingEntry,
  StandingEntry,
} from "@/lib/types";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { KickOffPulse } from "@/components/home/KickOffPulse";
import { HomeStage3D } from "@/components/home/HomeStage3D";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import {
  EmptyState,
  SectionHeader,
  Skeleton,
  StatusPill,
} from "@/components/ui/Primitives";

/**
 * Home page presentational views. Every async data fetch stays in the server
 * page (`app/page.tsx`); these components receive plain, serializable props
 * and translate the copy through `useI18n()`.
 */

function isLive(match: Match): boolean {
  return match.state === "live" || match.state === "halftime";
}

function hasScore(match: Match): boolean {
  return isLive(match) || match.state === "finished";
}

/** Rows rendered per competition group on the fixture board. */
const BOARD_ROWS = 4;

export interface CompetitionGroup {
  key: string;
  name: string;
  slug?: string;
  logo?: string;
  league?: League;
  matches: Match[];
}

/** Competition label for a live-rail chip: abbreviation in English, localised name in Arabic. */
function liveChipLabel(match: Match, lang: I18nContextValue["lang"]): string {
  return leagueDisplayName(
    {
      slug: match.league?.slug ?? match.competition.slug,
      name: match.league?.abbreviation ?? match.competition.name,
    },
    lang,
  );
}

/* ---------------------------------------------------------
    Page shell
    --------------------------------------------------------- */

export function HomeShell({
  masthead,
  lead,
  children,
}: {
  masthead: ReactNode;
  lead: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="hm">
      {masthead}
      <section className="hm-lead-grid" aria-label={t.home.masthead.leadAria}>
        {lead}
      </section>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------
    Masthead
    --------------------------------------------------------- */

export function HomeMasthead({ meta }: { meta: ReactNode }) {
  const { t } = useI18n();

  return (
    <header className="hm-mast">
      <div className="hm-mast__bar">
        <p className="hm-mast__flag">
          <span className="hm-mast__flag-dot" aria-hidden="true" />
          {t.home.masthead.flag}
        </p>
        {meta}
      </div>

      <div className="hm-mast__body">
        <div className="hm-mast__copy">
          <h1 className="hm-mast__title">
            {t.home.masthead.titleLead}
            <span className="hm-mast__title-accent">
              {t.home.masthead.titleAccent}
            </span>
          </h1>
          <p className="hm-mast__lede">{t.home.masthead.lede}</p>
        </div>
        <HomeStage3D />
      </div>

      <nav className="hm-mast__jump" aria-label={t.home.masthead.jumpAria}>
        <span className="hm-mast__jump-label">{t.home.masthead.jumpLabel}</span>
        <Link href="/matches">
          <CircleDot size={13} aria-hidden="true" />
          {t.home.masthead.matchCentre}
        </Link>
        <Link href="/competitions">
          <Trophy size={13} aria-hidden="true" />
          {t.layout.nav.competitions}
        </Link>
        <Link href="/rankings">{t.layout.footer.fifaRankings}</Link>
        <Link href="/calendar">
          <CalendarDays size={13} aria-hidden="true" />
          {t.layout.nav.calendar}
        </Link>
        <Link href="/news">
          <Newspaper size={13} aria-hidden="true" />
          {t.layout.nav.news}
        </Link>
      </nav>
    </header>
  );
}

export function MastheadFallback() {
  const { t } = useI18n();
  return <span className="hm-mast__meta">{t.home.masthead.loading}</span>;
}

export function HomeMastheadMeta({
  date,
  failed,
}: {
  date: string;
  failed: boolean;
}) {
  const { t } = useI18n();

  return (
    <p className="hm-mast__meta">
      <LocalTime date={`${date}T12:00:00Z`} mode="full" fallback={date} />
      {failed ? (
        <>
          <span className="hm-mast__sep" aria-hidden="true" />
          <span>{t.home.masthead.catchingUp}</span>
        </>
      ) : null}
    </p>
  );
}

/* ---------------------------------------------------------
    Lead match
    --------------------------------------------------------- */

export function LeadSkeleton() {
  return (
    <article className="hm-lead hm-lead--skeleton" aria-hidden="true">
      <div className="hm-lead__head">
        <Skeleton width={116} height={10} />
        <Skeleton width={86} height={10} />
      </div>
      <Skeleton width="50%" height={22} />
      <div className="hm-lead__board">
        <div className="hm-lead__side">
          <Skeleton width={72} height={72} />
          <Skeleton width={128} height={18} />
          <Skeleton width={92} height={9} />
        </div>
        <div className="hm-lead__center">
          <Skeleton width={118} height={62} />
          <Skeleton width={74} height={12} />
        </div>
        <div className="hm-lead__side">
          <Skeleton width={72} height={72} />
          <Skeleton width={128} height={18} />
          <Skeleton width={92} height={9} />
        </div>
      </div>
      <div className="hm-lead__foot">
        <Skeleton width={190} height={10} />
        <Skeleton width={150} height={36} />
      </div>
    </article>
  );
}

export function LeadNotice({ variant }: { variant: "failed" | "empty" }) {
  const { t } = useI18n();
  const copy = t.home.lead.notices[variant];

  return (
    <article className="hm-lead hm-lead--notice">
      <p className="hm-lead__tag">
        <span className="hm-lead__tag-dot" aria-hidden="true" />
        {t.home.lead.matchOfTheDay}
      </p>
      <h2 className="hm-lead__notice-title">{copy.title}</h2>
      <p className="hm-lead__notice-copy">{copy.copy}</p>
      <div className="hm-lead__notice-actions">
        {variant === "failed" ? (
          <>
            <Link className="btn btn--accent" href="/matches">
              {copy.primary}{" "}
              <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
            </Link>
            <Link className="btn btn--ghost" href="/calendar">
              <CalendarDays size={15} aria-hidden="true" />
              {copy.secondary}
            </Link>
          </>
        ) : (
          <>
            <Link className="btn btn--accent" href="/calendar">
              {copy.primary}{" "}
              <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
            </Link>
            <Link className="btn btn--ghost" href="/competitions">
              <Trophy size={15} aria-hidden="true" />
              {copy.secondary}
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

export function FormStrip({ form, name }: { form?: string; name: string }) {
  const { t, f } = useI18n();
  const results = (form ?? "")
    .replace(/[^WDL]/gi, "")
    .toUpperCase()
    .slice(-5)
    .split("");
  if (results.length === 0) return null;

  return (
    <span
      className="hm-form"
      aria-label={f(t.home.lead.formAria, {
        team: name,
        results: results.join(", "),
      })}
    >
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={cn("hm-form__chip", `is-${result.toLowerCase()}`)}
          aria-hidden="true"
        >
          {result}
        </span>
      ))}
    </span>
  );
}

export function LeadSide({
  team,
  align,
}: {
  team: MatchCompetitor;
  align: "home" | "away";
}) {
  const { t, f } = useI18n();

  return (
    <div className={cn("hm-lead__side", align === "away" && "is-away")}>
      <Link
        href={`/team/${team.id}`}
        className="hm-lead__crest"
        aria-label={f(t.home.lead.openTeam, { team: team.name })}
      >
        <TeamLogo src={team.logo} name={team.name} size={64} decorative={false} />
      </Link>
      <Link href={`/team/${team.id}`} className="hm-lead__name">
        {team.name}
      </Link>
      <span className="hm-lead__record">
        {team.record ? (
          <>
            {t.home.lead.record} <span className="u-dir-ltr">{team.record}</span>
          </>
        ) : align === "home" ? (
          t.home.lead.homeSide
        ) : (
          t.home.lead.awaySide
        )}
      </span>
      <FormStrip form={team.form} name={team.name} />
    </div>
  );
}

export function HomeLeadMatch({
  match,
  date,
}: {
  match: Match;
  date: string;
}) {
  const { t, f, lang } = useI18n();
  const live = isLive(match);
  const scored = hasScore(match);
  const competition = leagueDisplayName(
    {
      slug: match.league?.slug ?? match.competition.slug,
      name: match.league?.name ?? match.competition.name,
    },
    lang,
  );
  const venueLine = [match.venue, match.city].filter(Boolean).join(", ");
  const clock = match.clock ? (
    <span className="u-dir-ltr">{match.clock}</span>
  ) : null;

  return (
    <article className="hm-lead" aria-labelledby="hm-lead-title">
      <header className="hm-lead__head">
        <span className="hm-lead__tag">
          <span className="hm-lead__tag-dot" aria-hidden="true" />
          {t.home.lead.matchOfTheDay}
        </span>
        <span className={cn("hm-lead__state", live && "is-live")}>
          {live ? (
            <>
              <span className="live-dot" aria-hidden="true" />
              {match.state === "halftime"
                ? t.common.states.halftime
                : (clock ?? t.common.states.live)}
            </>
          ) : match.state === "finished" ? (
            t.common.states.finished
          ) : (
            t.home.lead.kickoffToday
          )}
        </span>
      </header>

      <div className="hm-lead__intro">
        <span className="hm-lead__mark">
          <LeagueLogo
            src={match.league?.logo}
            name={match.competition.name}
            size={20}
          />
        </span>
        <h2 className="hm-lead__title" id="hm-lead-title">
          {competition}
          {match.round ? (
            <span className="hm-lead__round"> · {match.round}</span>
          ) : null}
        </h2>
      </div>

      <div className="hm-lead__board">
        <LeadSide team={match.home} align="home" />

        <div className="hm-lead__center">
          {scored ? (
            <p
              className="hm-lead__score"
              aria-label={f(t.home.lead.scoreAria, {
                home: match.home.score ?? "0",
                away: match.away.score ?? "0",
              })}
            >
              <span className="u-dir-ltr">
                {match.home.score ?? "–"}
                <span aria-hidden="true">:</span>
                {match.away.score ?? "–"}
              </span>
            </p>
          ) : (
            <p className="hm-lead__time">
              <LocalTime date={match.date} mode="time" fallback={t.common.tbc} />
            </p>
          )}
          <StatusPill
            state={match.state}
            label={
              live ? (
                match.clock ? (
                  clock
                ) : match.state === "halftime" ? (
                  t.common.states.halftime
                ) : (
                  t.common.states.live
                )
              ) : match.state === "finished" ? (
                t.common.states.finished
              ) : (
                t.home.lead.kickoffLabel
              )
            }
          />
          <p className="hm-lead__when">
            <LocalTime date={match.date} mode="weekday" fallback={t.common.today} />
            <span aria-hidden="true">·</span>
            <LocalTime date={match.date} mode="day-month" fallback={date} />
            <span aria-hidden="true">·</span>
            {t.home.lead.yourTime}
          </p>
        </div>

        <LeadSide team={match.away} align="away" />
      </div>

      <footer className="hm-lead__foot">
        <div className="hm-lead__facts">
          {venueLine ? (
            <span>
              <MapPin size={13} aria-hidden="true" />
              {venueLine}
            </span>
          ) : null}
          {match.broadcasts.length > 0 ? (
            <span>
              <Tv size={13} aria-hidden="true" />
              {match.broadcasts.join(", ")}
            </span>
          ) : null}
          {!venueLine && match.broadcasts.length === 0 ? (
            <span>
              <Trophy size={13} aria-hidden="true" />
              {t.home.lead.espnNote}
            </span>
          ) : null}
        </div>
        <Link className="hm-lead__cta" href={`/match/${match.id}`}>
          {t.home.lead.openMatchCentre}{" "}
          <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
        </Link>
      </footer>
    </article>
  );
}

/* ---------------------------------------------------------
    The day in brief
    --------------------------------------------------------- */

export function GlanceSkeleton() {
  return (
    <aside className="hm-glance hm-glance--skeleton" aria-hidden="true">
      <div className="hm-glance__head">
        <div>
          <Skeleton width={58} height={9} />
          <div style={{ marginTop: 8 }}>
            <Skeleton width={148} height={18} />
          </div>
        </div>
        <Skeleton width={54} height={10} />
      </div>
      <div className="hm-glance__stats">
        {[0, 1, 2].map((item) => (
          <div className="hm-glance__stat" key={item}>
            <Skeleton width={34} height={26} />
            <div style={{ marginTop: 7 }}>
              <Skeleton width={48} height={8} />
            </div>
          </div>
        ))}
      </div>
      <div className="hm-glance__pulse">
        <Skeleton width={112} height={9} />
        <div style={{ marginTop: 16 }}>
          <Skeleton height={74} />
        </div>
        <div style={{ marginTop: 10 }}>
          <Skeleton width="72%" height={9} />
        </div>
      </div>
      <div className="hm-glance__foot">
        <Skeleton width={108} height={9} />
        <Skeleton width={68} height={9} />
      </div>
    </aside>
  );
}

export function HomeGlance({
  date,
  failed,
  counts,
  kicks,
}: {
  date: string;
  failed: boolean;
  counts: { fixtures: number; goals: number; competitions: number };
  kicks: string[];
}) {
  const { t } = useI18n();

  return (
    <aside className="hm-glance" aria-labelledby="hm-glance-title">
      <header className="hm-glance__head">
        <div>
          <p className="kicker">{t.home.glance.kicker}</p>
          <h2 className="hm-glance__title" id="hm-glance-title">
            {t.home.glance.title}
          </h2>
        </div>
        <span className="hm-glance__date">
          <LocalTime
            date={`${date}T12:00:00Z`}
            mode="day-month"
            fallback={date}
          />
        </span>
      </header>

      <dl className="hm-glance__stats">
        <div className="hm-glance__stat">
          <dt>{t.home.glance.stats.fixtures}</dt>
          <dd>{failed ? "—" : formatNumber(counts.fixtures)}</dd>
        </div>
        <div className="hm-glance__stat">
          <dt>{t.home.glance.stats.goals}</dt>
          <dd>{failed ? "—" : formatNumber(counts.goals)}</dd>
        </div>
        <div className="hm-glance__stat">
          <dt>{t.home.glance.stats.competitions}</dt>
          <dd>{failed ? "—" : formatNumber(counts.competitions)}</dd>
        </div>
      </dl>

      <div className="hm-glance__pulse">
        <p className="hm-glance__label">{t.home.glance.pulseLabel}</p>
        {failed ? (
          <p className="hm-glance__note">{t.home.glance.offline}</p>
        ) : counts.fixtures === 0 ? (
          <p className="hm-glance__note">{t.home.glance.empty}</p>
        ) : (
          <KickOffPulse kicks={kicks} />
        )}
      </div>

      <footer className="hm-glance__foot">
        <Link href="/matches">
          {t.home.glance.matchCentreLink}{" "}
          <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
        </Link>
        <span>
          <Globe2 size={12} aria-hidden="true" />
          {t.home.glance.timesZone}
        </span>
      </footer>
    </aside>
  );
}

/* ---------------------------------------------------------
    Live rail — the single home for matches in play
    --------------------------------------------------------- */

export function HomeLiveRail({ matches }: { matches: Match[] }) {
  const { t, f, lang } = useI18n();

  return (
    <section className="hm-live" aria-labelledby="hm-live-title">
      <div className="hm-live__head">
        <p className="hm-live__label" id="hm-live-title">
          <span className="live-dot" aria-hidden="true" />
          {t.home.live.label}
        </p>
        <span className="hm-live__count">
          {f(
            matches.length === 1 ? t.home.live.countOne : t.home.live.countMore,
            { n: formatNumber(matches.length) },
          )}
          {matches.length > 3 ? (
            <span className="hm-live__hint">
              {t.home.live.scroll}{" "}
              <ArrowRight size={10} aria-hidden="true" data-flip="rtl" />
            </span>
          ) : null}
        </span>
      </div>

      <ul className="hm-live__list">
        {matches.map((match) => (
          <li key={match.id}>
            <Link
              href={`/match/${match.id}`}
              className="hm-live__card"
              aria-label={f(t.home.live.cardAria, {
                home: match.home.name,
                away: match.away.name,
                clock: match.clock || t.common.states.live,
              })}
            >
              <span className="hm-live__comp">{liveChipLabel(match, lang)}</span>
              <span className="hm-live__side">
                <TeamLogo src={match.home.logo} name={match.home.name} size={16} />
                <span className="hm-live__team">{match.home.shortName}</span>
                <span className="hm-live__score">{match.home.score ?? "–"}</span>
              </span>
              <span className="hm-live__side">
                <TeamLogo src={match.away.logo} name={match.away.name} size={16} />
                <span className="hm-live__team">{match.away.shortName}</span>
                <span className="hm-live__score">{match.away.score ?? "–"}</span>
              </span>
              <span className="hm-live__clock">
                {match.state === "halftime" ? (
                  t.common.stateShort.halftime
                ) : match.clock ? (
                  <span className="u-dir-ltr">{match.clock}</span>
                ) : (
                  t.common.stateShort.live
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Link className="hm-live__more" href="/matches">
        {t.home.live.viewAll}{" "}
        <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
      </Link>
    </section>
  );
}

/* ---------------------------------------------------------
    Fixture board
    --------------------------------------------------------- */

export function FixtureRow({ match }: { match: Match }) {
  const { t } = useI18n();
  const live = isLive(match);
  const scored = hasScore(match);

  return (
    <Link
      href={`/match/${match.id}`}
      className={cn("hm-fixture", live && "is-live")}
    >
      <span className="hm-fixture__time">
        {live ? (
          <>
            <span className="hm-fixture__dot" aria-hidden="true" />
            {match.state === "halftime" ? (
              t.common.stateShort.halftime
            ) : match.clock ? (
              <span className="u-dir-ltr">{match.clock}</span>
            ) : (
              t.common.stateShort.live
            )}
          </>
        ) : match.state === "finished" ? (
          t.common.stateShort.finished
        ) : (
          <LocalTime date={match.date} mode="time" fallback={t.common.tbc} />
        )}
      </span>

      <span className="hm-fixture__teams">
        <span
          className={cn(
            "hm-fixture__team",
            scored && match.home.winner && "is-winner",
          )}
        >
          <TeamLogo src={match.home.logo} name={match.home.name} size={16} />
          <span className="hm-fixture__name">{match.home.shortName}</span>
          {scored ? (
            <span className="hm-fixture__score">{match.home.score ?? "–"}</span>
          ) : null}
        </span>
        <span
          className={cn(
            "hm-fixture__team",
            scored && match.away.winner && "is-winner",
          )}
        >
          <TeamLogo src={match.away.logo} name={match.away.name} size={16} />
          <span className="hm-fixture__name">{match.away.shortName}</span>
          {scored ? (
            <span className="hm-fixture__score">{match.away.score ?? "–"}</span>
          ) : null}
        </span>
      </span>
    </Link>
  );
}

export function BoardSkeleton() {
  return (
    <section className="section hm-board" aria-hidden="true">
      <div className="section-head">
        <div>
          <Skeleton width={110} height={10} />
          <div style={{ marginTop: 10 }}>
            <Skeleton width={280} height={26} />
          </div>
        </div>
        <Skeleton width={140} height={11} />
      </div>
      <div className="hm-board__grid">
        {[0, 1, 2, 3, 4, 5].map((group) => (
          <div className="hm-board__group" key={group}>
            <div className="hm-board__head">
              <Skeleton width={24} height={24} />
              <Skeleton width={130} height={12} />
            </div>
            <div className="hm-board__rows">
              {[0, 1, 2, 3].map((row) => (
                <div className="hm-fixture" key={row}>
                  <Skeleton width={34} height={9} />
                  <div style={{ display: "grid", gap: 6 }}>
                    <Skeleton width="72%" height={10} />
                    <Skeleton width="62%" height={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeFixtureBoard({
  failed,
  matchesCount,
  groups,
  remainingGroups,
  toCome,
  played,
}: {
  failed: boolean;
  matchesCount: number;
  groups: CompetitionGroup[];
  remainingGroups: number;
  toCome: number;
  played: number;
}) {
  const { t, f, lang } = useI18n();

  return (
    <section className="section hm-board" aria-labelledby="hm-board-title">
      <div className="hm-board__top">
        <div>
          <p className="kicker">{t.home.board.kicker}</p>
          <h2 className="hm-board__title" id="hm-board-title">
            {t.home.board.title}
          </h2>
          <p className="hm-board__desc">{t.home.board.description}</p>
        </div>
        <div className="hm-board__aside">
          {failed ? null : (
            <>
              <span className="hm-board__stat">
                <strong>{formatNumber(toCome)}</strong> {t.home.board.toCome}
              </span>
              <span className="hm-board__stat">
                <strong>{formatNumber(played)}</strong> {t.home.board.played}
              </span>
            </>
          )}
          <Link className="section-head__link" href="/matches">
            {t.home.board.allFixtures}{" "}
            <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      </div>

      {failed ? (
        <EmptyState
          icon={<CircleDot size={22} />}
          title={t.home.board.offlineTitle}
          description={t.home.board.offlineCopy}
          action={{ href: "/matches", label: t.home.board.offlineAction }}
        />
      ) : matchesCount === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title={t.home.board.noneTitle}
          description={t.home.board.noneCopy}
          action={{ href: "/calendar", label: t.home.board.noneAction }}
        />
      ) : groups.length === 0 ? (
        <p className="hm-board__none">
          {t.home.board.allShown}{" "}
          <Link href="/matches">
            {t.home.board.matchCentreLink}{" "}
            <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </p>
      ) : (
        <>
          <div className="hm-board__grid">
            {groups.map((group) => {
              const visible = group.matches.slice(0, BOARD_ROWS);
              const extra = group.matches.length - visible.length;
              const displayName = leagueDisplayName(
                { slug: group.slug, name: group.name },
                lang,
              );

              return (
                <article className="hm-board__group" key={group.key}>
                  <header className="hm-board__head">
                    <LeagueLogo src={group.logo} name={group.name} size={24} />
                    <h3 className="hm-board__name">
                      {group.slug ? (
                        <Link href={`/competitions/${group.slug}`}>
                          {displayName}
                        </Link>
                      ) : (
                        displayName
                      )}
                    </h3>
                    <span className="hm-board__count">
                      {group.matches.length}
                    </span>
                    {group.slug ? (
                      <FavoriteButton
                        kind="league"
                        item={{
                          slug: group.slug,
                          name: group.name,
                          logo: group.logo,
                        }}
                        className="hm-board__star"
                      />
                    ) : null}
                  </header>

                  <div className="hm-board__rows">
                    {visible.map((match) => (
                      <FixtureRow key={match.id} match={match} />
                    ))}
                  </div>

                  {extra > 0 ? (
                    <p className="hm-board__more">
                      {f(t.home.board.moreInGroup, { n: extra })}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>

          {remainingGroups > 0 ? (
            <p className="hm-board__rest">
              {f(
                remainingGroups === 1
                  ? t.home.board.remainingOne
                  : t.home.board.remaining,
                { n: formatNumber(remainingGroups) },
              )}{" "}
              <Link href="/matches">
                {t.home.board.matchCentreLink}{" "}
                <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ---------------------------------------------------------
    Context cards
    --------------------------------------------------------- */

export function RankMovement({ entry }: { entry: RankingEntry }) {
  const { t, f } = useI18n();
  if (!entry.movement) {
    return (
      <span className="hm-rank__move is-flat" title={t.home.rankings.move.noChange}>
        <Minus size={11} aria-hidden="true" />
      </span>
    );
  }
  const up = entry.movement > 0;
  return (
    <span
      className={cn("hm-rank__move", up ? "is-up" : "is-down")}
      title={f(up ? t.home.rankings.move.up : t.home.rankings.move.down, {
        n: Math.abs(entry.movement),
      })}
    >
      {up ? (
        <ArrowUp size={11} aria-hidden="true" />
      ) : (
        <ArrowDown size={11} aria-hidden="true" />
      )}
      {Math.abs(entry.movement)}
    </span>
  );
}

export function ContextSkeleton({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("hm-card", dark && "hm-card--dark")} aria-hidden="true">
      <div className="hm-card__head">
        <div style={{ flex: 1 }}>
          <Skeleton width={70} height={9} />
          <div style={{ marginTop: 9 }}>
            <Skeleton width="60%" height={20} />
          </div>
          <div style={{ marginTop: 7 }}>
            <Skeleton width="80%" height={9} />
          </div>
        </div>
        <Skeleton width={38} height={38} />
      </div>
      <div style={{ padding: "10px 0" }}>
        {[0, 1, 2, 3, 4].map((item) => (
          <div key={item} className="hm-card__skeleton-row">
            <Skeleton width={14} height={10} />
            <Skeleton width={20} height={20} />
            <Skeleton width="55%" height={11} />
            <div style={{ marginLeft: "auto" }}>
              <Skeleton width={36} height={11} />
            </div>
          </div>
        ))}
      </div>
      <div className="hm-card__foot">
        <Skeleton width={90} height={9} />
        <Skeleton width={50} height={9} />
      </div>
    </div>
  );
}

export function HomeTableWatch({
  league,
  season,
  groupName,
  count,
  entries,
  failed,
}: {
  league: League | null;
  season: string;
  groupName?: string;
  count: number;
  entries: StandingEntry[];
  failed: boolean;
}) {
  const { t, f } = useI18n();

  if (!league) {
    return (
      <article className="hm-card">
        <header className="hm-card__head">
          <div>
            <p className="kicker">{t.home.table.kicker}</p>
            <h3 className="hm-card__title">{t.home.table.fallbackTitle}</h3>
            <p className="hm-card__sub">{t.home.table.fallbackSub}</p>
          </div>
          <Trophy className="hm-card__glyph" size={26} aria-hidden="true" />
        </header>
        <div className="hm-card__empty">
          <p>{t.home.table.noGames}</p>
          <Link href="/competitions">
            {t.home.table.browse}{" "}
            <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="hm-card">
      <header className="hm-card__head">
        <div>
          <p className="kicker">{t.home.table.kicker}</p>
          <h3 className="hm-card__title">
            {f(t.home.table.title, { abbr: league.abbreviation })}
          </h3>
          <p className="hm-card__sub">
            {groupName ? `${groupName} · ` : ""}
            <span className="u-dir-ltr">{season}</span>
            {" · "}
            {f(
              count === 1 ? t.home.table.fixtureOne : t.home.table.fixtures,
              { n: formatNumber(count) },
            )}
          </p>
        </div>
        <LeagueLogo src={league.logo} name={league.name} size={38} />
      </header>

      {failed ? (
        <div className="hm-card__empty">
          <p>{f(t.home.table.offlineCopy, { abbr: league.abbreviation })}</p>
          <Link href={`/competitions/${league.slug}`}>
            {t.home.table.offlineAction}{" "}
            <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      ) : entries.length === 0 ? (
        <div className="hm-card__empty">
          <p>
            {f(t.home.table.emptyCopy, {
              abbr: league.abbreviation,
              season,
            })}
          </p>
          <Link href={`/competitions/${league.slug}`}>
            {t.home.table.emptyAction}{" "}
            <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      ) : (
        <table className="hm-table">
          <caption className="sr-only">
            {f(t.home.table.caption, { league: league.name, season })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t.home.table.headers.rank}</th>
              <th scope="col">{t.home.table.headers.team}</th>
              <th scope="col">{t.home.table.headers.played}</th>
              <th scope="col">{t.home.table.headers.points}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.team.id}-${entry.rank}`}>
                <td>{entry.rank}</td>
                <td>
                  <span className="hm-table__team">
                    <TeamLogo
                      src={entry.team.logo}
                      name={entry.team.name}
                      size={18}
                    />
                    <span>{entry.team.shortName || entry.team.name}</span>
                  </span>
                </td>
                <td>{entry.played}</td>
                <td>{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="hm-card__foot">
        <Link href={`/competitions/${league.slug}`}>
          {t.home.table.open}{" "}
          <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
        </Link>
        <span>{f(t.home.table.today, { n: formatNumber(count) })}</span>
      </footer>
    </article>
  );
}

export function HomeRankingWatch({
  board,
  failed,
}: {
  board: RankingBoard | null;
  failed: boolean;
}) {
  const { t, f } = useI18n();
  const top = board?.entries.slice(0, 5) ?? [];

  return (
    <article className="hm-card hm-card--dark">
      <header className="hm-card__head">
        <div>
          <p className="kicker">{t.home.rankings.kicker}</p>
          <h3 className="hm-card__title">{t.home.rankings.title}</h3>
          <p className="hm-card__sub">
            {t.home.rankings.official}
            {board?.updatedAt ? (
              <>
                {" · "}
                {t.home.rankings.published}
                {" "}
                <LocalTime
                  date={board.updatedAt}
                  mode="date"
                  fallback={board.updatedAt}
                />
              </>
            ) : null}
          </p>
        </div>
        <Trophy className="hm-card__glyph" size={26} aria-hidden="true" />
      </header>

      {failed ? (
        <div className="hm-card__empty">
          <p>{t.home.rankings.offlineCopy}</p>
          <Link href="/rankings">
            {t.home.rankings.offlineAction}{" "}
            <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      ) : top.length === 0 ? (
        <div className="hm-card__empty">
          <p>{t.home.rankings.emptyCopy}</p>
          <Link href="/rankings">
            {t.home.rankings.emptyAction}{" "}
            <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      ) : (
        <ol className="hm-rank">
          {top.map((entry) => (
            <li className="hm-rank__row" key={entry.teamId || entry.name}>
              <span className="hm-rank__pos">{entry.rank}</span>
              <span className="hm-rank__team">
                <TeamLogo name={entry.name} size={22} />
                <span>{entry.name}</span>
              </span>
              <RankMovement entry={entry} />
              <span className="hm-rank__points">
                {entry.points.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      )}

      <footer className="hm-card__foot">
        <Link href="/rankings">
          {t.home.rankings.full}{" "}
          <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
        </Link>
        <span>
          {board ? (
            f(t.home.rankings.teamCount, {
              n: formatNumber(board.entries.length),
            })
          ) : (
            "—"
          )}
        </span>
      </footer>
    </article>
  );
}

export function HomeContext({
  table,
  ranking,
}: {
  table: ReactNode;
  ranking: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <section className="section" aria-label={t.home.context.sectionAria}>
      <SectionHeader
        kicker={t.home.context.kicker}
        title={t.home.context.title}
        description={t.home.context.description}
      />
      <div className="hm-context">
        {table}
        {ranking}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------
    News front
    --------------------------------------------------------- */

export function LeadStory({ article }: { article: NewsArticle }) {
  const { t } = useI18n();
  const body = (
    <>
      <span className="hm-lead-story__media">
        {article.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image}
            alt={article.imageAlt ?? ""}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="hm-lead-story__fallback">
            <Newspaper size={26} aria-hidden="true" />
            {t.home.news.fallbackLabel}
          </span>
        )}
      </span>
      <span className="hm-lead-story__body">
        <span className="hm-lead-story__kicker">
          {article.section ?? t.home.news.topStory}
        </span>
        <span className="hm-lead-story__title">{article.headline}</span>
        {article.description ? (
          <span className="hm-lead-story__desc">{article.description}</span>
        ) : null}
        <span className="hm-lead-story__meta">
          <LocalTime
            date={article.published}
            mode="date"
            fallback={t.home.news.dateUnavailable}
          />
          {article.url ? (
            <span>
              {t.home.news.readAtPublisher}{" "}
              <ArrowUpRight size={12} aria-hidden="true" data-flip="rtl" />
            </span>
          ) : null}
        </span>
      </span>
    </>
  );

  if (!article.url) {
    return <article className="hm-lead-story">{body}</article>;
  }

  return (
    <a
      className="hm-lead-story"
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  );
}

export function SideStory({
  article,
  index,
}: {
  article: NewsArticle;
  index: number;
}) {
  const { t } = useI18n();
  const body = (
    <>
      <span className="hm-story__num">
        {String(index + 2).padStart(2, "0")}
      </span>
      <span className="hm-story__text">
        <span className="hm-story__section">
          {article.section ?? t.home.news.sectionFallback}
        </span>
        <span className="hm-story__title">{article.headline}</span>
        <span className="hm-story__meta">
          <LocalTime
            date={article.published}
            mode="date"
            fallback={t.common.notAvailable}
          />
        </span>
      </span>
      <ArrowUpRight
        className="hm-story__arrow"
        size={14}
        aria-hidden="true"
        data-flip="rtl"
      />
    </>
  );

  if (!article.url) {
    return <article className="hm-story">{body}</article>;
  }

  return (
    <a
      className="hm-story"
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  );
}

export function NewsSkeleton() {
  return (
    <section className="section" aria-hidden="true">
      <div className="section-head">
        <div>
          <Skeleton width={90} height={10} />
          <div style={{ marginTop: 9 }}>
            <Skeleton width={280} height={24} />
          </div>
        </div>
        <Skeleton width={90} height={12} />
      </div>
      <div className="hm-news">
        <div className="hm-lead-story">
          <Skeleton height={250} />
          <div className="hm-lead-story__body">
            <Skeleton width={70} height={9} />
            <Skeleton width="88%" height={22} />
            <Skeleton width="70%" height={22} />
          </div>
        </div>
        <div className="hm-news__list">
          {[0, 1, 2, 3].map((item) => (
            <div className="hm-story" key={item}>
              <Skeleton width={18} height={9} />
              <div style={{ flex: 1 }}>
                <Skeleton width="92%" height={12} />
                <div style={{ marginTop: 6 }}>
                  <Skeleton width="55%" height={8} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeNews({
  failed,
  lead,
  rest,
}: {
  failed: boolean;
  lead: NewsArticle | null;
  rest: NewsArticle[];
}) {
  const { t } = useI18n();

  return (
    <section className="section" aria-label={t.home.news.wireAria}>
      <SectionHeader
        kicker={t.home.news.kicker}
        title={t.home.news.title}
        description={t.home.news.description}
        action={{ href: "/news", label: t.home.news.allStories }}
      />

      {failed ? (
        <EmptyState
          icon={<Newspaper size={22} />}
          title={t.home.news.offlineTitle}
          description={t.home.news.offlineCopy}
        />
      ) : !lead ? (
        <EmptyState
          icon={<Newspaper size={22} />}
          title={t.home.news.noneTitle}
          description={t.home.news.noneCopy}
        />
      ) : (
        <div className="hm-news">
          <LeadStory article={lead} />
          <div className="hm-news__list">
            {rest.slice(0, 4).map((article, index) => (
              <SideStory key={article.id} article={article} index={index} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------
    Closing band
    --------------------------------------------------------- */

export function HomeClose({ leaguesCount }: { leaguesCount: number }) {
  const { t, f } = useI18n();

  return (
    <section className="hm-close" aria-labelledby="hm-close-title">
      <div className="hm-close__copy">
        <p className="kicker">{t.home.close.kicker}</p>
        <h2 className="hm-close__title" id="hm-close-title">
          {t.home.close.titleLead}
          <span className="hm-close__keep">{t.home.close.titleAccent}</span>
        </h2>
        <p className="hm-close__lede">{t.home.close.lede}</p>
      </div>
      <div className="hm-close__side">
        <div className="hm-close__actions">
          <Link className="btn" href="/settings">
            {t.home.close.setPreferences}{" "}
            <ArrowRight size={15} aria-hidden="true" data-flip="rtl" />
          </Link>
          <Link className="btn btn--ghost" href="/calendar">
            <CalendarDays size={15} aria-hidden="true" />
            {t.home.close.openCalendar}
          </Link>
        </div>
        <ul className="hm-close__meta">
          <li>{f(t.home.close.competitions, { n: formatNumber(leaguesCount) })}</li>
          <li>{t.home.close.fifa}</li>
          <li>{t.home.close.calendarExports}</li>
        </ul>
      </div>
    </section>
  );
}
