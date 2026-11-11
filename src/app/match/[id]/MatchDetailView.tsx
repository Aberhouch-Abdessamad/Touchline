"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  Circle,
  CircleDot,
  MapPin,
  Megaphone,
  Newspaper,
  RefreshCw,
  Square,
  Ticket,
  Trophy,
  Tv,
  Users,
} from "lucide-react";
import { LinkTabs } from "@/components/ui/LinkTabs";
import { LeagueLogo, TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { ShareButton } from "@/components/ui/ShareButton";
import { CalendarMenu } from "@/components/ui/CalendarMenu";
import { RemindButton } from "@/components/ui/RemindButton";
import { NewsList } from "@/components/soccer/NewsCard";
import { MatchAnalysis } from "@/components/soccer/MatchAnalysis";
import { MatchHistory } from "@/components/soccer/MatchHistory";
import { MatchLiveEntry } from "@/components/soccer/MatchLiveEntry";
import { EmptyState, StatusPill } from "@/components/ui/Primitives";
import { leagueDisplayName, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Dict } from "@/lib/i18n/dict";
import type {
  HeadToHeadMatch,
  Match,
  MatchDetails,
  MatchEvent,
  MatchLineup,
  MatchStat,
  TeamForm,
  TeamFormResult,
} from "@/lib/types";

/** W/D/L outcome code extracted from raw provider form strings. */
type Outcome = "W" | "D" | "L";

function hasScore(match: Match): boolean {
  return (
    match.state === "finished" ||
    match.state === "live" ||
    match.state === "halftime"
  );
}

function scoreLine(match: Match): string {
  return `${match.home.score ?? "–"}–${match.away.score ?? "–"}`;
}

function eventIcon(event: MatchEvent) {
  if (
    event.type === "goal" ||
    event.type === "own-goal" ||
    event.type === "penalty"
  ) {
    return <CircleDot size={14} aria-hidden="true" />;
  }
  if (event.type === "yellow" || event.type === "red") {
    return <Square size={12} aria-hidden="true" fill="currentColor" />;
  }
  if (event.type === "substitution") {
    return <ArrowLeftRight size={13} aria-hidden="true" />;
  }
  return <Circle size={11} aria-hidden="true" />;
}

function outcomeOf(result: string): Outcome | null {
  const letter = result.trim().slice(0, 1).toUpperCase();
  return letter === "W" || letter === "D" || letter === "L" ? letter : null;
}

function latestForm(form?: string): string {
  return (form ?? "")
    .replace(/[^WDL]/gi, "")
    .toUpperCase()
    .slice(-5);
}

function scoreNumber(value?: string): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function meetingOutcome(
  meeting: HeadToHeadMatch,
  homeTeamId: string,
): Outcome | null {
  const homeScore = scoreNumber(meeting.homeScore);
  const awayScore = scoreNumber(meeting.awayScore);
  if (homeScore === null || awayScore === null) return null;
  if (homeScore === awayScore) return "D";
  const winner = homeScore > awayScore ? meeting.home.id : meeting.away.id;
  return winner === homeTeamId ? "W" : "L";
}

function summariseMeetings(matches: HeadToHeadMatch[], homeTeamId: string) {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let counted = 0;
  for (const meeting of matches) {
    const outcome = meetingOutcome(meeting, homeTeamId);
    if (!outcome) continue;
    counted += 1;
    if (outcome === "W") homeWins += 1;
    else if (outcome === "D") draws += 1;
    else awayWins += 1;
  }
  return { homeWins, draws, awayWins, counted };
}

function summariseForm(results: TeamFormResult[]) {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const result of results) {
    const outcome = outcomeOf(result.result);
    if (outcome === "W") wins += 1;
    else if (outcome === "D") draws += 1;
    else if (outcome === "L") losses += 1;
  }
  return { wins, draws, losses };
}

/** Slugged lookup key: lowercase, letters/digits only ("Possession %" → "possession"). */
function slugKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

type StatLabels = Dict["matchDetails"]["stats"]["statLabels"];

/**
 * Friendly label for an ESPN stat, keyed by both the raw stat name and the
 * raw label; falls back to the untouched provider label when unknown.
 */
function statLabelFor(stat: MatchStat, labels: StatLabels): string {
  const table = labels as Record<string, string>;
  const candidates = [
    slugKey(stat.name),
    slugKey(stat.label),
    stat.name.trim().toLowerCase(),
    stat.label.trim().toLowerCase(),
  ];
  for (const candidate of candidates) {
    const hit = table[candidate];
    if (hit) return hit;
  }
  return stat.label;
}

function FormChips({
  form,
  name,
  className,
}: {
  form?: string;
  name: string;
  className?: string;
}) {
  const { t, f } = useI18n();
  const letters = t.matchDetails.form.letters;
  const results = latestForm(form).split("") as Outcome[];
  if (results.length === 0) return null;

  return (
    <span
      className={cn("match-form", className)}
      aria-label={f(t.matchDetails.form.ariaRecent, {
        name,
        results: results.map((result) => letters[result]).join(", "),
      })}
    >
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={cn("match-form__chip", `match-form__chip--${result.toLowerCase()}`)}
          aria-hidden="true"
        >
          {letters[result]}
        </span>
      ))}
    </span>
  );
}

function MatchUtility({ details }: { details: MatchDetails }) {
  const { t } = useI18n();
  const { match } = details;
  const competitionHref = match.league
    ? `/competitions/${match.league.slug}`
    : "/competitions";

  return (
    <div className="match-utility">
      <nav className="match-utility__crumb" aria-label={t.matchDetails.utility.crumbAria}>
        <Link href="/matches">{t.layout.nav.matches}</Link>
        <span aria-hidden="true">/</span>
        <Link href={competitionHref}>
          {match.league?.abbreviation ?? match.competition.name}
        </Link>
        {match.round ? (
          <>
            <span aria-hidden="true">/</span>
            <span className="match-utility__round">{match.round}</span>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <Link href={`/matches?date=${match.date.slice(0, 10)}`}>
          <LocalTime date={match.date} mode="date" fallback={match.date.slice(0, 10)} />
        </Link>
      </nav>

      <div className="match-utility__actions">
        <FavoriteButton
          kind="match"
          item={{
            id: match.id,
            label: `${match.home.name} vs ${match.away.name}`,
            date: match.date,
          }}
        />
        <RemindButton
          matchId={match.id}
          label={`${match.home.name} vs ${match.away.name}`}
          kickoff={match.date}
          disabled={match.state !== "scheduled"}
        />
        <CalendarMenu match={match} withLabel={false} />
        <ShareButton title={`${match.home.name} vs ${match.away.name}`} />
      </div>
    </div>
  );
}

function MatchBoard({ details }: { details: MatchDetails }) {
  const { t, f, lang } = useI18n();
  const m = t.matchDetails;
  const { match } = details;
  const scored = hasScore(match);
  const live = match.state === "live" || match.state === "halftime";
  const competition = leagueDisplayName(
    {
      slug: match.league?.slug ?? match.competition.slug,
      name: match.league?.name ?? match.competition.name,
    },
    lang,
  );
  const broadcasts =
    details.broadcasts.length > 0 ? details.broadcasts : match.broadcasts;
  const location = [match.venue, match.city].filter(Boolean).join(", ");

  return (
    <header className="match-board">
      <div className="match-board__top">
        <div className="match-board__comp">
          <LeagueLogo
            src={match.league?.logo ?? match.competition.logo}
            name={competition}
            size={24}
          />
          <span className="match-board__comp-name">{competition}</span>
          {match.round ? (
            <span className="match-board__round">{match.round}</span>
          ) : null}
        </div>
        <div className="match-board__state">
          <StatusPill
            state={match.state}
            label={
              live ? (
                match.clock ? (
                  <span className="u-dir-ltr">{match.clock}</span>
                ) : (
                  match.statusLabel || t.common.states.live
                )
              ) : match.state === "scheduled" ? (
                m.board.kickoff
              ) : (
                match.statusLabel || undefined
              )
            }
          />
          {live ? (
            <span className="match-board__feed">
              <RefreshCw size={11} aria-hidden="true" />
              {m.board.liveData}
            </span>
          ) : null}
        </div>
      </div>

      <h1 className="sr-only">
        {match.home.name} {t.common.vs} {match.away.name}, {competition}
        {match.round ? `, ${match.round}` : ""}
      </h1>

      <div className="match-board__body">
        <div className="match-board__side">
          <Link
            href={`/team/${match.home.id}`}
            className="match-board__crest"
            aria-label={f(m.board.ariaOpenTeam, { name: match.home.name })}
          >
            <TeamLogo
              src={match.home.logo}
              name={match.home.name}
              size={92}
              decorative={false}
            />
          </Link>
          <p className="match-board__side-label">{m.board.home}</p>
          <p className="match-board__name">
            <Link href={`/team/${match.home.id}`}>{match.home.name}</Link>
          </p>
          {match.home.record ? (
            <p className="match-board__record">
              {m.board.record}{" "}
              <span className="u-dir-ltr">{match.home.record}</span>
            </p>
          ) : null}
          <FormChips form={match.home.form} name={match.home.name} />
        </div>

        <div className="match-board__center">
          {scored ? (
            <p
              className="match-board__score u-dir-ltr"
              aria-label={f(m.board.ariaScore, { score: scoreLine(match) })}
            >
              {match.home.score ?? "–"}
              <span>:</span>
              {match.away.score ?? "–"}
            </p>
          ) : (
            <p className="match-board__time">
              <LocalTime date={match.date} mode="time" fallback={t.common.tbc} />
            </p>
          )}
          <p className="match-board__when">
            <LocalTime
              date={match.date}
              mode="date"
              fallback={match.date.slice(0, 10)}
            />
            <span className="match-board__zone"> · {m.board.yourTime}</span>
          </p>
          {match.state !== "scheduled" && match.statusDetail ? (
            <p className="match-board__detail">{match.statusDetail}</p>
          ) : null}
          {match.note ? <p className="match-board__note">{match.note}</p> : null}
        </div>

        <div className="match-board__side match-board__side--away">
          <Link
            href={`/team/${match.away.id}`}
            className="match-board__crest"
            aria-label={f(m.board.ariaOpenTeam, { name: match.away.name })}
          >
            <TeamLogo
              src={match.away.logo}
              name={match.away.name}
              size={92}
              decorative={false}
            />
          </Link>
          <p className="match-board__side-label">{m.board.away}</p>
          <p className="match-board__name">
            <Link href={`/team/${match.away.id}`}>{match.away.name}</Link>
          </p>
          {match.away.record ? (
            <p className="match-board__record">
              {m.board.record}{" "}
              <span className="u-dir-ltr">{match.away.record}</span>
            </p>
          ) : null}
          <FormChips form={match.away.form} name={match.away.name} />
        </div>
      </div>

      <div className="match-board__meta">
        {location ? (
          <span>
            <MapPin size={12} aria-hidden="true" />
            {location}
          </span>
        ) : null}
        {match.attendance ? (
          <span>
            <Users size={12} aria-hidden="true" />
            <span className="u-dir-ltr">
              {match.attendance.toLocaleString("en-GB")}
            </span>{" "}
            {m.board.attendance}
          </span>
        ) : null}
        <span>
          <Tv size={12} aria-hidden="true" />
          {broadcasts.length > 0 ? broadcasts.join(", ") : m.board.broadcastNone}
        </span>
      </div>
    </header>
  );
}

function MatchPanel({
  kicker,
  title,
  meta,
  children,
  className,
  bodyClassName,
}: {
  kicker?: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("match-panel", className)}>
      <header className="match-panel__head">
        <div className="match-panel__heading">
          {kicker ? <p className="match-panel__kicker">{kicker}</p> : null}
          <h2 className="match-panel__title">{title}</h2>
        </div>
        {meta ? <div className="match-panel__meta">{meta}</div> : null}
      </header>
      <div className={cn("match-panel__body", bodyClassName)}>{children}</div>
    </section>
  );
}

function PanelEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="match-panel__empty">
      <p className="match-panel__empty-title">{title}</p>
      <p>{description}</p>
    </div>
  );
}

function EventTimeline({
  events,
  match,
}: {
  events: MatchEvent[];
  match: Match;
}) {
  const { t } = useI18n();
  const m = t.matchDetails.events;

  if (events.length === 0) {
    const copy =
      match.state === "scheduled"
        ? m.empty.scheduled
        : match.state === "finished"
          ? m.empty.finished
          : m.empty.other;
    return <PanelEmpty title={m.empty.title} description={copy} />;
  }

  return (
    <ol className="match-timeline">
      {events.map((event) => {
        const side =
          event.team?.id === match.home.id
            ? "home"
            : event.team?.id === match.away.id
              ? "away"
              : undefined;
        return (
          <li
            className={cn(
              "match-timeline__item",
              side && `match-timeline__item--${side}`,
            )}
            key={event.id}
          >
            <span className="match-timeline__minute u-dir-ltr">
              {event.minute || t.common.notAvailable}
            </span>
            <span
              className={cn(
                "match-timeline__icon",
                event.type === "goal" && "match-timeline__icon--goal",
                event.type === "own-goal" && "match-timeline__icon--own",
                event.type === "penalty" && "match-timeline__icon--goal",
                event.type === "yellow" && "match-timeline__icon--yellow",
                event.type === "red" && "match-timeline__icon--red",
              )}
              title={m.eventTypes[event.type]}
            >
              {eventIcon(event)}
            </span>
            <span className="match-timeline__body">
              <span className="match-timeline__text">
                {event.text}
                {event.homeScore !== undefined &&
                event.awayScore !== undefined ? (
                  <strong>
                    {" "}
                    <span className="u-dir-ltr">
                      ({event.homeScore}–{event.awayScore})
                    </span>
                  </strong>
                ) : null}
              </span>
              {event.team ? (
                <span className="match-timeline__team">
                  <TeamLogo
                    src={event.team.logo}
                    name={event.team.name}
                    size={14}
                  />
                  {event.team.shortName || event.team.name}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatsCompare({
  stats,
  homeName,
  awayName,
}: {
  stats: MatchStat[];
  homeName: string;
  awayName: string;
}) {
  const { t, f } = useI18n();
  const labels = t.matchDetails.stats.statLabels;

  return (
    <div className="stat-compare">
      {stats.map((stat) => {
        const label = statLabelFor(stat, labels);
        const total = stat.homeValue + stat.awayValue;
        const homeWidth =
          total > 0 ? Math.round((stat.homeValue / total) * 100) : 50;
        return (
          <div className="stat-compare__row" key={stat.name}>
            <div className="stat-compare__values">
              <span className="stat-compare__value u-dir-ltr">{stat.home}</span>
              <span className="stat-compare__label">{label}</span>
              <span className="stat-compare__value stat-compare__value--away u-dir-ltr">
                {stat.away}
              </span>
            </div>
            <div
              className="stat-compare__track"
              role="img"
              aria-label={f(t.matchDetails.stats.ariaTrack, {
                label,
                home: homeName,
                homeValue: stat.home,
                away: awayName,
                awayValue: stat.away,
              })}
            >
              <span
                className="stat-compare__home"
                style={{ width: `${homeWidth}%` }}
              />
              <span
                className="stat-compare__away"
                style={{ width: `${100 - homeWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineupCard({ lineup }: { lineup: MatchLineup }) {
  const { t } = useI18n();
  const m = t.matchDetails;
  const starters = lineup.players.filter((player) => player.starter);
  const bench = lineup.players.filter((player) => !player.starter);
  const listed = starters.length > 0 ? starters : lineup.players;
  const substitutes = starters.length > 0 ? bench : [];

  const renderPlayer = (player: (typeof lineup.players)[number]) => (
    <li className="lineup-player" key={player.id || player.name}>
      <span className="lineup-player__number">
        {player.jersey ?? t.common.notAvailable}
      </span>
      <span className="lineup-player__name">{player.name}</span>
      <span
        className={cn(
          "lineup-player__flag",
          player.subbedIn && "lineup-player__flag--in",
        )}
        aria-hidden="true"
        title={
          player.subbedOut
            ? m.lineups.subbedOff
            : player.subbedIn
              ? m.lineups.subbedOn
              : undefined
        }
      >
        {player.subbedOut ? "↓" : player.subbedIn ? "↑" : ""}
      </span>
      <span className="lineup-player__pos">{player.position ?? ""}</span>
    </li>
  );

  return (
    <section className="lineup-card">
      <header className="lineup-card__head">
        <TeamLogo src={lineup.team.logo} name={lineup.team.name} size={28} />
        <div className="lineup-card__identity">
          <span className="lineup-card__side">
            {lineup.homeAway === "home" ? m.board.home : m.board.away}
          </span>
          <Link href={`/team/${lineup.team.id}`} className="lineup-card__team">
            {lineup.team.shortName || lineup.team.name}
          </Link>
        </div>
        {lineup.formation ? (
          <span className="lineup-card__formation u-dir-ltr">
            {lineup.formation}
          </span>
        ) : null}
      </header>

      <div className="lineup-card__section">
        <p className="lineup-card__label">
          {starters.length > 0 ? m.lineups.startingXI : m.lineups.squad}
        </p>
        <ul className="lineup-list">{listed.map(renderPlayer)}</ul>
      </div>

      {substitutes.length > 0 ? (
        <details className="lineup-subs">
          <summary className="lineup-subs__summary">
            {m.lineups.substitutes}
            <span>{substitutes.length}</span>
          </summary>
          <ul className="lineup-list">{substitutes.map(renderPlayer)}</ul>
        </details>
      ) : null}
    </section>
  );
}

function HeadToHeadList({
  matches,
  homeTeamId,
  homeName,
  awayName,
  limit,
}: {
  matches: HeadToHeadMatch[];
  homeTeamId: string;
  homeName: string;
  awayName: string;
  limit?: number;
}) {
  const { t, f } = useI18n();
  const m = t.matchDetails.h2h;

  if (matches.length === 0) {
    return (
      <PanelEmpty title={m.emptyTitle} description={m.emptyDescription} />
    );
  }

  const visible =
    limit && limit < matches.length ? matches.slice(0, limit) : matches;
  const summary = summariseMeetings(matches, homeTeamId);
  const total = summary.counted || 1;
  const caption =
    f(m.captionBase, {
      count: summary.counted,
      noun: summary.counted === 1 ? m.meetingOne : m.meetingOther,
    }) +
    (summary.counted < matches.length
      ? f(m.withScore, { total: matches.length })
      : "") +
    (visible.length < matches.length
      ? f(m.recentListed, { count: visible.length })
      : "") +
    ".";

  return (
    <>
      {summary.counted > 0 ? (
        <div className="h2h-summary">
          <div className="h2h-summary__numbers">
            <span className="h2h-summary__cell">
              <span className="h2h-summary__number">{summary.homeWins}</span>
              <span className="h2h-summary__label">
                {f(m.winsHome, { name: homeName })}
              </span>
            </span>
            <span className="h2h-summary__cell h2h-summary__cell--draw">
              <span className="h2h-summary__number">{summary.draws}</span>
              <span className="h2h-summary__label">{m.draws}</span>
            </span>
            <span className="h2h-summary__cell h2h-summary__cell--away">
              <span className="h2h-summary__number h2h-summary__number--away">
                {summary.awayWins}
              </span>
              <span className="h2h-summary__label">
                {f(m.winsAway, { name: awayName })}
              </span>
            </span>
          </div>
          <div className="h2h-summary__bar" aria-hidden="true">
            <span
              className="h2h-summary__bar-home"
              style={{ width: `${(summary.homeWins / total) * 100}%` }}
            />
            <span
              className="h2h-summary__bar-draw"
              style={{ width: `${(summary.draws / total) * 100}%` }}
            />
            <span
              className="h2h-summary__bar-away"
              style={{ width: `${(summary.awayWins / total) * 100}%` }}
            />
          </div>
          <p className="h2h-summary__caption">{caption}</p>
        </div>
      ) : null}

      <ol className="h2h-list">
        {visible.map((meeting) => {
          const outcome = meetingOutcome(meeting, homeTeamId);
          return (
            <li key={meeting.id}>
              <Link href={`/match/${meeting.id}`} className="h2h-row">
                <span className="h2h-row__date">
                  <LocalTime
                    date={meeting.date}
                    mode="date"
                    fallback={meeting.date}
                  />
                </span>
                <span className="h2h-row__team h2h-row__team--home">
                  <span>{meeting.home.shortName || meeting.home.name}</span>
                  <TeamLogo
                    src={meeting.home.logo}
                    name={meeting.home.name}
                    size={18}
                  />
                </span>
                <span className="h2h-row__score u-dir-ltr">
                  {meeting.homeScore ?? "–"}
                  <em>–</em>
                  {meeting.awayScore ?? "–"}
                </span>
                <span className="h2h-row__team">
                  <TeamLogo
                    src={meeting.away.logo}
                    name={meeting.away.name}
                    size={18}
                  />
                  <span>{meeting.away.shortName || meeting.away.name}</span>
                </span>
                <span
                  className={cn(
                    "h2h-row__outcome",
                    outcome && `h2h-row__outcome--${outcome.toLowerCase()}`,
                  )}
                  aria-label={
                    outcome
                      ? f(m.ariaOutcome, { result: m.outcomes[outcome] })
                      : m.ariaUnavailable
                  }
                >
                  {outcome ? t.matchDetails.form.letters[outcome] : "–"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function FormGuide({ match, form }: { match: Match; form: TeamForm[] }) {
  const { t, f } = useI18n();
  const m = t.matchDetails.form;
  const rows = [
    { team: match.home, form: match.home.form },
    { team: match.away, form: match.away.form },
  ]
    .map((row) => {
      if (latestForm(row.form).length > 0) return row;
      const entry = form.find((team) => team.team.id === row.team.id);
      const derived = (entry?.results ?? [])
        .map((result) => outcomeOf(result.result))
        .filter((value): value is Outcome => Boolean(value))
        .join("");
      return { ...row, form: derived };
    })
    .filter((row) => latestForm(row.form).length > 0);

  if (rows.length === 0) {
    return (
      <PanelEmpty
        title={m.emptyTitle}
        description={m.emptyGuideDescription}
      />
    );
  }

  return (
    <div className="snapshot-form">
      {rows.map(({ team, form }) => {
        const results = latestForm(form).split("") as Outcome[];
        const wins = results.filter((result) => result === "W").length;
        const draws = results.filter((result) => result === "D").length;
        const losses = results.filter((result) => result === "L").length;
        const points = wins * 3 + draws;
        return (
          <div className="snapshot-form__row" key={team.id || team.name}>
            <span className="snapshot-form__team">
              <TeamLogo src={team.logo} name={team.name} size={20} />
              <Link href={`/team/${team.id}`}>
                {team.shortName || team.name}
              </Link>
            </span>
            <FormChips
              form={form}
              name={team.name}
              className="snapshot-form__chips"
            />
            <span
              className="snapshot-form__tally"
              aria-label={f(m.ariaTally, { w: wins, d: draws, l: losses })}
            >
              <span>
                <b>{wins}</b>
                {m.letters.W}
              </span>
              <span>
                <b>{draws}</b>
                {m.letters.D}
              </span>
              <span>
                <b>{losses}</b>
                {m.letters.L}
              </span>
            </span>
            <span
              className="snapshot-form__points"
              aria-label={f(m.ariaPoints, { points, count: results.length })}
            >
              <b>{points}</b> {m.pointsShort}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FormPanels({
  form,
  homeName,
  awayName,
}: {
  form: TeamForm[];
  homeName: string;
  awayName: string;
}) {
  const { t, f } = useI18n();
  const m = t.matchDetails.form;

  if (form.length === 0) {
    return (
      <PanelEmpty
        title={m.emptyTitle}
        description={m.emptyTabDescription}
      />
    );
  }

  return (
    <div className="form-board">
      {form.map((team) => {
        const summary = summariseForm(team.results);
        return (
          <section className="form-team" key={team.team.id || team.team.name}>
            <header className="form-team__head">
              <div className="form-team__identity">
                <TeamLogo
                  src={team.team.logo}
                  name={team.team.name}
                  size={26}
                />
                <Link href={`/team/${team.team.id}`}>
                  {team.team.shortName || team.team.name}
                </Link>
              </div>
              <div
                className="form-team__tally"
                aria-label={f(m.ariaTally, {
                  w: summary.wins,
                  d: summary.draws,
                  l: summary.losses,
                })}
              >
                <span className="form-team__tally-w">
                  {summary.wins}
                  {m.letters.W}
                </span>
                <span className="form-team__tally-d">
                  {summary.draws}
                  {m.letters.D}
                </span>
                <span className="form-team__tally-l">
                  {summary.losses}
                  {m.letters.L}
                </span>
              </div>
            </header>
            <ul className="form-team__list">
              {team.results.map((result) => {
                const outcome = outcomeOf(result.result);
                const venue =
                  result.homeAway === "home"
                    ? m.venue.vs
                    : result.homeAway === "away"
                      ? m.venue.at
                      : "";
                return (
                  <li className="form-row" key={result.id}>
                    <span
                      className={cn(
                        "form-row__outcome",
                        outcome === "W" && "form-row__outcome--w",
                        outcome === "D" && "form-row__outcome--d",
                        outcome === "L" && "form-row__outcome--l",
                      )}
                    >
                      {outcome ? m.letters[outcome] : "–"}
                    </span>
                    <span className="form-row__score u-dir-ltr">
                      {result.score}
                    </span>
                    <span className="form-row__opponent">
                      {venue ? <em>{venue}</em> : null}
                      <TeamLogo
                        src={result.opponent.logo}
                        name={result.opponent.name}
                        size={16}
                      />
                      <span>{result.opponent.shortName || result.opponent.name}</span>
                    </span>
                    <span className="form-row__comp">
                      {result.competition ?? ""}
                    </span>
                    <span className="form-row__date">
                      <LocalTime
                        date={result.date}
                        mode="day-month"
                        fallback={t.common.notAvailable}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="form-board__note">{f(m.note, { home: homeName, away: awayName })}</p>
    </div>
  );
}

function MatchFacts({ details }: { details: MatchDetails }) {
  const { t, lang } = useI18n();
  const m = t.matchDetails.facts;
  const { match } = details;
  const broadcasts =
    details.broadcasts.length > 0 ? details.broadcasts : match.broadcasts;

  return (
    <MatchPanel
      kicker={m.kicker}
      title={m.title}
      className="match-panel--facts"
      bodyClassName="match-panel__body--flush"
    >
      <dl className="fact-list">
        <div className="fact-list__row">
          <dt>{m.competition}</dt>
          <dd>
            {match.league ? (
              <Link href={`/competitions/${match.league.slug}`}>
                {leagueDisplayName(
                  { slug: match.league.slug, name: match.league.name },
                  lang,
                )}
              </Link>
            ) : (
              match.competition.name
            )}
          </dd>
        </div>
        {match.round ? (
          <div className="fact-list__row">
            <dt>{m.round}</dt>
            <dd>{match.round}</dd>
          </div>
        ) : null}
        <div className="fact-list__row">
          <dt>{m.kickoff}</dt>
          <dd>
            <LocalTime date={match.date} mode="datetime" fallback={match.date} />
          </dd>
        </div>
        {match.venue ? (
          <div className="fact-list__row">
            <dt>{m.venue}</dt>
            <dd>{match.venue}</dd>
          </div>
        ) : null}
        {match.city || match.country ? (
          <div className="fact-list__row">
            <dt>{m.location}</dt>
            <dd>{[match.city, match.country].filter(Boolean).join(", ")}</dd>
          </div>
        ) : null}
        {match.season ? (
          <div className="fact-list__row">
            <dt>{m.season}</dt>
            <dd>{match.season}</dd>
          </div>
        ) : null}
        {match.attendance ? (
          <div className="fact-list__row">
            <dt>{m.attendance}</dt>
            <dd>
              <span className="u-dir-ltr">
                {match.attendance.toLocaleString("en-GB")}
              </span>
            </dd>
          </div>
        ) : null}
        <div className="fact-list__row">
          <dt>{m.broadcast}</dt>
          <dd>
            {broadcasts.length > 0 ? broadcasts.join(", ") : m.broadcastNone}
          </dd>
        </div>
        {details.odds?.details || details.odds?.provider ? (
          <div className="fact-list__row">
            <dt>{m.odds}</dt>
            <dd>{details.odds.details ?? details.odds.provider}</dd>
          </div>
        ) : null}
      </dl>
    </MatchPanel>
  );
}

function MatchRail({ details }: { details: MatchDetails }) {
  const { t } = useI18n();
  const m = t.matchDetails;
  const { match } = details;
  const preMatch =
    match.state === "scheduled" ||
    match.state === "postponed" ||
    match.state === "canceled";

  return (
    <aside className="match-rail">
      <MatchFacts details={details} />

      {details.article ? (
        <MatchPanel
          kicker={m.report.kicker}
          title={preMatch ? m.report.previewTitle : m.report.title}
          meta={<Newspaper size={16} aria-hidden="true" />}
          bodyClassName="match-panel__body--flush"
        >
          {details.article.url ? (
            <a
              className="article-link"
              href={details.article.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="article-link__headline">
                {details.article.headline}
              </span>
              {details.article.description ? (
                <span className="article-link__body">
                  {details.article.description}
                </span>
              ) : null}
              <span className="article-link__cta">
                {m.report.cta} <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
              </span>
            </a>
          ) : (
            <div className="article-link">
              <span className="article-link__headline">
                {details.article.headline}
              </span>
              {details.article.description ? (
                <span className="article-link__body">
                  {details.article.description}
                </span>
              ) : null}
            </div>
          )}
        </MatchPanel>
      ) : null}

      {details.news.length > 0 ? (
        <MatchPanel
          kicker={m.news.kicker}
          title={m.news.title}
          meta={
            <Link href="/news" className="match-panel__link">
              {m.news.all}
            </Link>
          }
          bodyClassName="match-panel__body--flush"
        >
          <NewsList articles={details.news.slice(0, 4)} />
        </MatchPanel>
      ) : null}
    </aside>
  );
}

export function MatchDetailView({
  details,
  tab,
}: {
  details: MatchDetails;
  tab: string;
}) {
  const { t, f } = useI18n();
  const m = t.matchDetails;
  const { match } = details;
  const broadcasts =
    details.broadcasts.length > 0 ? details.broadcasts : match.broadcasts;
  const hasForm =
    details.form.length > 0 ||
    latestForm(match.home.form).length > 0 ||
    latestForm(match.away.form).length > 0;
  const preMatch =
    match.state === "scheduled" ||
    match.state === "postponed" ||
    match.state === "canceled";
  // AI analysis is offered for any playable/live/finished match, but a
  // postponed or abandoned fixture has nothing meaningful to analyse.
  // In-play matches get the live analyst panel, finished matches the
  // retrospective panel, everything playable keeps the prediction panel.
  const liveAvailable = match.state === "live" || match.state === "halftime";
  const analysisAvailable =
    !liveAvailable && match.state !== "postponed" && match.state !== "canceled";
  const historicalAvailable = match.state === "finished";

  return (
    <div className="match-page">
      <MatchUtility details={details} />
      <MatchBoard details={details} />

      <LinkTabs
        tabs={[
          {
            key: "summary",
            label: m.tabs.summary,
            count: details.events.length || undefined,
          },
          {
            key: "stats",
            label: m.tabs.stats,
            count: details.stats.length || undefined,
          },
          {
            key: "lineups",
            label: m.tabs.lineups,
            count: details.lineups.length || undefined,
          },
          {
            key: "h2h",
            label: m.tabs.h2h,
            count: details.headToHead.length || undefined,
          },
          { key: "form", label: m.tabs.form },
        ]}
        active={tab}
        baseHref={`/match/${match.id}`}
        ariaLabel={m.tabs.ariaLabel}
        className="match-tabs"
      />

      <div className="match-layout">
        <div className="match-main">
          {tab === "summary" ? (
            <>
              {liveAvailable ? (
                <MatchLiveEntry
                  matchId={match.id}
                  homeName={match.home.shortName}
                  awayName={match.away.shortName}
                />
              ) : analysisAvailable ? (
                historicalAvailable ? (
                  <MatchHistory match={match} />
                ) : (
                  <MatchAnalysis
                    matchId={match.id}
                    homeName={match.home.shortName}
                    awayName={match.away.shortName}
                  />
                )
              ) : null}

              {details.events.length > 0 ||
              (!hasForm && details.headToHead.length === 0) ? (
                <MatchPanel
                  kicker={
                    match.state === "live" || match.state === "halftime"
                      ? m.events.kickerLive
                      : m.events.kicker
                  }
                  title={m.events.title}
                  meta={
                    details.events.length > 0 ? (
                      <span>
                        {details.events.length}{" "}
                        {details.events.length === 1
                          ? m.events.metaOne
                          : m.events.metaOther}
                      </span>
                    ) : undefined
                  }
                  bodyClassName="match-panel__body--flush"
                >
                  <EventTimeline events={details.events} match={match} />
                </MatchPanel>
              ) : null}

              {hasForm ? (
                <MatchPanel
                  kicker={m.form.guideKicker}
                  title={m.form.guideTitle}
                  meta={
                    <Link
                      className="match-panel__link"
                      href={`/match/${match.id}?tab=form`}
                    >
                      {m.form.guideLink}{" "}
                      <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
                    </Link>
                  }
                >
                  <FormGuide match={match} form={details.form} />
                  <p className="match-panel__footnote">
                    {m.form.guideFootnote}
                  </p>
                </MatchPanel>
              ) : null}

              {details.headToHead.length > 0 ? (
                <MatchPanel
                  kicker={m.h2h.kicker}
                  title={m.h2h.titleSummary}
                  meta={
                    <Link
                      className="match-panel__link"
                      href={`/match/${match.id}?tab=h2h`}
                    >
                      {f(t.matchDetails.h2h.linkAll, {
                        count: details.headToHead.length,
                      })}{" "}
                      <ArrowRight size={13} aria-hidden="true" data-flip="rtl" />
                    </Link>
                  }
                  bodyClassName="match-panel__body--flush"
                >
                  <HeadToHeadList
                    matches={details.headToHead}
                    homeTeamId={match.home.id}
                    homeName={match.home.shortName}
                    awayName={match.away.shortName}
                    limit={4}
                  />
                </MatchPanel>
              ) : null}
            </>
          ) : tab === "stats" ? (
            details.statsAvailable ? (
              <MatchPanel
                kicker={preMatch ? m.stats.kickerPre : m.stats.kickerPost}
                title={preMatch ? m.stats.titlePre : m.stats.titlePost}
                meta={<span>{m.stats.meta}</span>}
              >
                <div className="match-legend">
                  <span className="match-legend__team">
                    <TeamLogo
                      src={match.home.logo}
                      name={match.home.name}
                      size={18}
                    />
                    {match.home.shortName}
                  </span>
                  <span className="match-legend__team match-legend__team--away">
                    {match.away.shortName}
                    <TeamLogo
                      src={match.away.logo}
                      name={match.away.name}
                      size={18}
                    />
                  </span>
                </div>
                <StatsCompare
                  stats={details.stats}
                  homeName={match.home.shortName}
                  awayName={match.away.shortName}
                />
                <p className="match-panel__footnote">
                  {preMatch ? m.stats.footnotePre : m.stats.footnotePost}
                </p>
              </MatchPanel>
            ) : (
              <MatchPanel
                kicker={preMatch ? m.stats.kickerPre : m.stats.kickerPost}
                title={preMatch ? m.stats.titlePre : m.stats.titlePost}
              >
                <PanelEmpty
                  title={m.stats.emptyTitle}
                  description={m.stats.emptyDescription}
                />
              </MatchPanel>
            )
          ) : tab === "lineups" ? (
            <MatchPanel
              kicker={m.lineups.kicker}
              title={m.lineups.title}
              meta={
                details.lineups.length > 0 ? (
                  <span>
                    {details.lineups.length}{" "}
                    {details.lineups.length === 1
                      ? t.matchDetails.lineups.metaOne
                      : t.matchDetails.lineups.metaOther}
                  </span>
                ) : undefined
              }
              bodyClassName="match-panel__body--flush"
            >
              {details.lineups.length === 0 ? (
                <EmptyState
                  icon={<Users size={22} />}
                  title={m.lineups.emptyTitle}
                  description={m.lineups.emptyDescription}
                >
                  <Link
                    className="btn btn--ghost"
                    href={`/team/${match.home.id}`}
                  >
                    {f(m.lineups.squadLink, { name: match.home.shortName })}
                  </Link>
                  <Link
                    className="btn btn--ghost"
                    href={`/team/${match.away.id}`}
                  >
                    {f(m.lineups.squadLink, { name: match.away.shortName })}
                  </Link>
                </EmptyState>
              ) : (
                <div className="lineups">
                  {details.lineups.map((lineup) => (
                    <LineupCard
                      key={`${lineup.homeAway}-${lineup.team.id}`}
                      lineup={lineup}
                    />
                  ))}
                </div>
              )}
            </MatchPanel>
          ) : tab === "h2h" ? (
            <MatchPanel
              kicker={m.h2h.kicker}
              title={m.h2h.titleTab}
              meta={
                details.headToHead.length > 0 ? (
                  <span>
                    {details.headToHead.length}{" "}
                    {details.headToHead.length === 1
                      ? m.h2h.metaOne
                      : m.h2h.metaOther}
                  </span>
                ) : undefined
              }
              bodyClassName="match-panel__body--flush"
            >
              <HeadToHeadList
                matches={details.headToHead}
                homeTeamId={match.home.id}
                homeName={match.home.shortName}
                awayName={match.away.shortName}
              />
            </MatchPanel>
          ) : (
            <MatchPanel
              kicker={m.form.tabKicker}
              title={m.form.tabTitle}
              meta={<span>{m.form.tabMeta}</span>}
            >
              <FormPanels
                form={details.form}
                homeName={match.home.shortName}
                awayName={match.away.shortName}
              />
            </MatchPanel>
          )}
        </div>

        <MatchRail details={details} />
      </div>

      <div className="match-toolbar">
        <Link
          href={`/matches?date=${match.date.slice(0, 10)}`}
          className="btn btn--ghost btn--sm"
        >
          <CalendarDays size={15} aria-hidden="true" />
          {m.toolbar.allMatchesOnDate}
        </Link>
        {match.league ? (
          <Link
            href={`/competitions/${match.league.slug}?tab=fixtures`}
            className="btn btn--ghost btn--sm"
          >
            <Trophy size={15} aria-hidden="true" />
            {f(m.toolbar.leagueFixtures, {
              abbr: match.league.abbreviation,
            })}
          </Link>
        ) : null}
        <span className="match-toolbar__count">
          <Ticket size={12} aria-hidden="true" />
          {broadcasts.length > 0
            ? f(m.toolbar.tv, { channels: broadcasts.join(", ") })
            : m.toolbar.tvNone}
        </span>
      </div>

      <p className="match-source">
        <Megaphone size={12} aria-hidden="true" /> {m.source}
      </p>
    </div>
  );
}
