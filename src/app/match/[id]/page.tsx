import { Suspense } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
import {
  EmptyState,
  Skeleton,
  StatusPill,
} from "@/components/ui/Primitives";
import { getMatchDetails } from "@/lib/api";
import { cn } from "@/lib/utils";
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

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TABS = ["summary", "stats", "lineups", "h2h", "form"] as const;
type TabKey = (typeof TABS)[number];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseTab(value: string | undefined): TabKey {
  return TABS.includes(value as TabKey) ? (value as TabKey) : "summary";
}

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

function outcomeOf(result: string): "W" | "D" | "L" | null {
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
): "W" | "D" | "L" | null {
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

export function generateMetadata() {
  return {
    title: "Match centre",
    description:
      "Live scoreboard, key events, team statistics, lineups, head-to-head record and recent form for a single fixture.",
  };
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
  const results = latestForm(form).split("");
  if (results.length === 0) return null;

  return (
    <span
      className={cn("match-form", className)}
      aria-label={`${name} recent form: ${results.join(", ")}`}
    >
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={cn("match-form__chip", `match-form__chip--${result.toLowerCase()}`)}
          aria-hidden="true"
        >
          {result}
        </span>
      ))}
    </span>
  );
}

function FormGuide({ match, form }: { match: Match; form: TeamForm[] }) {
  const rows = [
    { team: match.home, form: match.home.form },
    { team: match.away, form: match.away.form },
  ]
    .map((row) => {
      if (latestForm(row.form).length > 0) return row;
      const entry = form.find((team) => team.team.id === row.team.id);
      const derived = (entry?.results ?? [])
        .map((result) => outcomeOf(result.result))
        .filter((value): value is "W" | "D" | "L" => Boolean(value))
        .join("");
      return { ...row, form: derived };
    })
    .filter((row) => latestForm(row.form).length > 0);

  if (rows.length === 0) {
    return (
      <PanelEmpty
        title="Recent form is not available"
        description="ESPN has not published a form guide for these teams yet."
      />
    );
  }

  return (
    <div className="snapshot-form">
      {rows.map(({ team, form }) => {
        const results = latestForm(form).split("");
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
              aria-label={`${wins} wins, ${draws} draws, ${losses} losses`}
            >
              <span>
                <b>{wins}</b>W
              </span>
              <span>
                <b>{draws}</b>D
              </span>
              <span>
                <b>{losses}</b>L
              </span>
            </span>
            <span
              className="snapshot-form__points"
              aria-label={`${points} points from the last ${results.length} matches`}
            >
              <b>{points}</b> pts
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MatchSkeleton() {
  return (
    <div className="match-page" aria-hidden="true">
      <div className="match-utility">
        <Skeleton width={260} height={12} />
        <Skeleton width={168} height={32} />
      </div>
      <div className="match-board match-board--skeleton">
        <div className="match-board__top">
          <Skeleton width={210} height={14} />
          <Skeleton width={96} height={24} />
        </div>
        <div className="match-board__body">
          <div className="match-board__side">
            <Skeleton width={88} height={88} />
            <Skeleton width={150} height={20} />
            <Skeleton width={100} height={9} />
          </div>
          <div className="match-board__center">
            <Skeleton width={130} height={56} />
            <Skeleton width={160} height={11} />
          </div>
          <div className="match-board__side">
            <Skeleton width={88} height={88} />
            <Skeleton width={150} height={20} />
            <Skeleton width={100} height={9} />
          </div>
        </div>
        <div className="match-board__meta">
          <Skeleton width={260} height={10} />
        </div>
      </div>
      <div className="link-tabs match-tabs">
        <Skeleton width="100%" height={42} />
      </div>
      <div className="match-layout">
        <div className="match-panel">
          <div className="match-panel__head">
            <Skeleton width={120} height={16} />
          </div>
          <div className="match-panel__body" style={{ display: "grid", gap: 16 }}>
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton width="100%" height={13} key={row} />
            ))}
          </div>
        </div>
        <div className="match-panel">
          <div className="match-panel__head">
            <Skeleton width={100} height={16} />
          </div>
          <div className="match-panel__body" style={{ display: "grid", gap: 14 }}>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton width="100%" height={12} key={row} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchUtility({ details }: { details: MatchDetails }) {
  const { match } = details;
  const competitionHref = match.league
    ? `/competitions/${match.league.slug}`
    : "/competitions";

  return (
    <div className="match-utility">
      <nav className="match-utility__crumb" aria-label="Breadcrumb">
        <Link href="/matches">Matches</Link>
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
  const { match } = details;
  const scored = hasScore(match);
  const live = match.state === "live" || match.state === "halftime";
  const competition = match.league?.name ?? match.competition.name;
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
              live
                ? match.clock || match.statusLabel || "Live"
                : match.state === "scheduled"
                  ? "Kick-off"
                  : match.statusLabel || undefined
            }
          />
          {live ? (
            <span className="match-board__feed">
              <RefreshCw size={11} aria-hidden="true" />
              Live data
            </span>
          ) : null}
        </div>
      </div>

      <h1 className="sr-only">
        {match.home.name} vs {match.away.name}, {competition}
        {match.round ? `, ${match.round}` : ""}
      </h1>

      <div className="match-board__body">
        <div className="match-board__side">
          <Link
            href={`/team/${match.home.id}`}
            className="match-board__crest"
            aria-label={`Open ${match.home.name}`}
          >
            <TeamLogo
              src={match.home.logo}
              name={match.home.name}
              size={92}
              decorative={false}
            />
          </Link>
          <p className="match-board__side-label">Home</p>
          <p className="match-board__name">
            <Link href={`/team/${match.home.id}`}>{match.home.name}</Link>
          </p>
          {match.home.record ? (
            <p className="match-board__record">Record {match.home.record}</p>
          ) : null}
          <FormChips form={match.home.form} name={match.home.name} />
        </div>

        <div className="match-board__center">
          {scored ? (
            <p
              className="match-board__score"
              aria-label={`Score ${scoreLine(match)}`}
            >
              {match.home.score ?? "–"}
              <span>:</span>
              {match.away.score ?? "–"}
            </p>
          ) : (
            <p className="match-board__time">
              <LocalTime date={match.date} mode="time" fallback="TBC" />
            </p>
          )}
          <p className="match-board__when">
            <LocalTime
              date={match.date}
              mode="date"
              fallback={match.date.slice(0, 10)}
            />
            <span className="match-board__zone"> · your time</span>
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
            aria-label={`Open ${match.away.name}`}
          >
            <TeamLogo
              src={match.away.logo}
              name={match.away.name}
              size={92}
              decorative={false}
            />
          </Link>
          <p className="match-board__side-label">Away</p>
          <p className="match-board__name">
            <Link href={`/team/${match.away.id}`}>{match.away.name}</Link>
          </p>
          {match.away.record ? (
            <p className="match-board__record">Record {match.away.record}</p>
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
            {match.attendance.toLocaleString("en-GB")} attendance
          </span>
        ) : null}
        <span>
          <Tv size={12} aria-hidden="true" />
          {broadcasts.length > 0
            ? broadcasts.join(", ")
            : "Broadcast not listed"}
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
  if (events.length === 0) {
    const copy =
      match.state === "scheduled"
        ? "ESPN publishes goals, cards and substitutions as they happen. The timeline will fill in once the match is under way."
        : match.state === "finished"
          ? "ESPN did not publish a key-event timeline for this fixture. The score, statistics and lineups above are still reported."
          : "No key events have been reported yet. This feed refreshes from ESPN's public match summary.";
    return <PanelEmpty title="No key events yet" description={copy} />;
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
            <span className="match-timeline__minute">
              {event.minute || "—"}
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
                    ({event.homeScore}–{event.awayScore})
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
  return (
    <div className="stat-compare">
      {stats.map((stat) => {
        const total = stat.homeValue + stat.awayValue;
        const homeWidth =
          total > 0 ? Math.round((stat.homeValue / total) * 100) : 50;
        return (
          <div className="stat-compare__row" key={stat.name}>
            <div className="stat-compare__values">
              <span className="stat-compare__value">{stat.home}</span>
              <span className="stat-compare__label">{stat.label}</span>
              <span className="stat-compare__value stat-compare__value--away">
                {stat.away}
              </span>
            </div>
            <div
              className="stat-compare__track"
              role="img"
              aria-label={`${stat.label}: ${homeName} ${stat.home}, ${awayName} ${stat.away}`}
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
  const starters = lineup.players.filter((player) => player.starter);
  const bench = lineup.players.filter((player) => !player.starter);
  const listed = starters.length > 0 ? starters : lineup.players;
  const substitutes = starters.length > 0 ? bench : [];

  const renderPlayer = (player: (typeof lineup.players)[number]) => (
    <li className="lineup-player" key={player.id || player.name}>
      <span className="lineup-player__number">{player.jersey ?? "—"}</span>
      <span className="lineup-player__name">{player.name}</span>
      <span
        className={cn(
          "lineup-player__flag",
          player.subbedIn && "lineup-player__flag--in",
        )}
        aria-hidden="true"
        title={
          player.subbedOut
            ? "Substituted off"
            : player.subbedIn
              ? "Substituted on"
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
            {lineup.homeAway === "home" ? "Home" : "Away"}
          </span>
          <Link href={`/team/${lineup.team.id}`} className="lineup-card__team">
            {lineup.team.shortName || lineup.team.name}
          </Link>
        </div>
        {lineup.formation ? (
          <span className="lineup-card__formation">{lineup.formation}</span>
        ) : null}
      </header>

      <div className="lineup-card__section">
        <p className="lineup-card__label">
          {starters.length > 0 ? "Starting XI" : "Squad"}
        </p>
        <ul className="lineup-list">{listed.map(renderPlayer)}</ul>
      </div>

      {substitutes.length > 0 ? (
        <details className="lineup-subs">
          <summary className="lineup-subs__summary">
            Substitutes
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
  if (matches.length === 0) {
    return (
      <PanelEmpty
        title="No previous meetings on record"
        description="ESPN has not published a head-to-head series for these two teams."
      />
    );
  }

  const visible =
    limit && limit < matches.length ? matches.slice(0, limit) : matches;
  const summary = summariseMeetings(matches, homeTeamId);
  const total = summary.counted || 1;

  return (
    <>
      {summary.counted > 0 ? (
        <div className="h2h-summary">
          <div className="h2h-summary__numbers">
            <span className="h2h-summary__cell">
              <span className="h2h-summary__number">{summary.homeWins}</span>
              <span className="h2h-summary__label">{homeName} wins</span>
            </span>
            <span className="h2h-summary__cell h2h-summary__cell--draw">
              <span className="h2h-summary__number">{summary.draws}</span>
              <span className="h2h-summary__label">Draws</span>
            </span>
            <span className="h2h-summary__cell h2h-summary__cell--away">
              <span className="h2h-summary__number h2h-summary__number--away">
                {summary.awayWins}
              </span>
              <span className="h2h-summary__label">{awayName} wins</span>
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
          <p className="h2h-summary__caption">
            Results from the current home team&apos;s point of view across{" "}
            {summary.counted}{" "}
            {summary.counted === 1 ? "meeting" : "meetings"}
            {summary.counted < matches.length
              ? ` with a recorded score (${matches.length} total)`
              : ""}
            {visible.length < matches.length
              ? `. The ${visible.length} most recent are listed below`
              : ""}
            .
          </p>
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
                <span className="h2h-row__score">
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
                      ? `Current home team: ${outcome === "W" ? "win" : outcome === "D" ? "draw" : "loss"}`
                      : "Result unavailable"
                  }
                >
                  {outcome ?? "–"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
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
  if (form.length === 0) {
    return (
      <PanelEmpty
        title="Recent form is not available"
        description="ESPN has not returned the last five results for these teams yet."
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
                aria-label={`${summary.wins} wins, ${summary.draws} draws, ${summary.losses} losses`}
              >
                <span className="form-team__tally-w">{summary.wins}W</span>
                <span className="form-team__tally-d">{summary.draws}D</span>
                <span className="form-team__tally-l">{summary.losses}L</span>
              </div>
            </header>
            <ul className="form-team__list">
              {team.results.map((result) => {
                const outcome = outcomeOf(result.result);
                const venue =
                  result.homeAway === "home"
                    ? "vs"
                    : result.homeAway === "away"
                      ? "at"
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
                      {outcome ?? "–"}
                    </span>
                    <span className="form-row__score">{result.score}</span>
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
                        fallback="—"
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <p className="form-board__note">
        Most recent result first, as published by ESPN.{" "}
        {homeName} and {awayName} records are shown for context.
      </p>
    </div>
  );
}

function MatchFacts({ details }: { details: MatchDetails }) {
  const { match } = details;
  const broadcasts =
    details.broadcasts.length > 0 ? details.broadcasts : match.broadcasts;

  return (
    <MatchPanel
      kicker="Match file"
      title="Fixture details"
      className="match-panel--facts"
      bodyClassName="match-panel__body--flush"
    >
      <dl className="fact-list">
        <div className="fact-list__row">
          <dt>Competition</dt>
          <dd>
            {match.league ? (
              <Link href={`/competitions/${match.league.slug}`}>
                {match.league.name}
              </Link>
            ) : (
              match.competition.name
            )}
          </dd>
        </div>
        {match.round ? (
          <div className="fact-list__row">
            <dt>Round</dt>
            <dd>{match.round}</dd>
          </div>
        ) : null}
        <div className="fact-list__row">
          <dt>Kick-off</dt>
          <dd>
            <LocalTime date={match.date} mode="datetime" fallback={match.date} />
          </dd>
        </div>
        {match.venue ? (
          <div className="fact-list__row">
            <dt>Venue</dt>
            <dd>{match.venue}</dd>
          </div>
        ) : null}
        {match.city || match.country ? (
          <div className="fact-list__row">
            <dt>Location</dt>
            <dd>{[match.city, match.country].filter(Boolean).join(", ")}</dd>
          </div>
        ) : null}
        {match.season ? (
          <div className="fact-list__row">
            <dt>Season</dt>
            <dd>{match.season}</dd>
          </div>
        ) : null}
        {match.attendance ? (
          <div className="fact-list__row">
            <dt>Attendance</dt>
            <dd>{match.attendance.toLocaleString("en-GB")}</dd>
          </div>
        ) : null}
        <div className="fact-list__row">
          <dt>Broadcast</dt>
          <dd>
            {broadcasts.length > 0
              ? broadcasts.join(", ")
              : "Not listed by ESPN"}
          </dd>
        </div>
        {details.odds?.details || details.odds?.provider ? (
          <div className="fact-list__row">
            <dt>Odds</dt>
            <dd>{details.odds.details ?? details.odds.provider}</dd>
          </div>
        ) : null}
      </dl>
    </MatchPanel>
  );
}

function MatchRail({ details }: { details: MatchDetails }) {
  return (
    <aside className="match-rail">
      <MatchFacts details={details} />

      {details.article ? (
        <MatchPanel
          kicker="From the wire"
          title="Match report"
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
                Read on ESPN <ArrowRight size={13} aria-hidden="true" />
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
          kicker="Around the game"
          title="Related stories"
          meta={
            <Link href="/news" className="match-panel__link">
              All news
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

async function MatchContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const tab = parseTab(first(query.tab));

  let details: MatchDetails | null = null;
  let failed = false;
  try {
    details = await getMatchDetails(id);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        icon={<RefreshCw size={22} />}
        title="This match could not be loaded"
        description="ESPN's match summary endpoint did not respond. The match may also be too old to be indexed."
        action={{ href: `/match/${id}`, label: "Try again" }}
      >
        <Link href="/matches" className="btn btn--ghost">
          Back to the match centre
        </Link>
      </EmptyState>
    );
  }

  if (!details) notFound();

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

  return (
    <div className="match-page">
      <MatchUtility details={details} />
      <MatchBoard details={details} />

      <LinkTabs
        tabs={[
          {
            key: "summary",
            label: "Summary",
            count: details.events.length || undefined,
          },
          {
            key: "stats",
            label: "Statistics",
            count: details.stats.length || undefined,
          },
          {
            key: "lineups",
            label: "Lineups",
            count: details.lineups.length || undefined,
          },
          {
            key: "h2h",
            label: "Head to head",
            count: details.headToHead.length || undefined,
          },
          { key: "form", label: "Form" },
        ]}
        active={tab}
        baseHref={`/match/${match.id}`}
        ariaLabel="Match sections"
        className="match-tabs"
      />

      <div className="match-layout">
        <div className="match-main">
          {tab === "summary" ? (
            <>
              {details.events.length > 0 ||
              (!hasForm && details.headToHead.length === 0) ? (
                <MatchPanel
                  kicker={
                    match.state === "live" || match.state === "halftime"
                      ? "Live feed"
                      : "Match timeline"
                  }
                  title="Key events"
                  meta={
                    details.events.length > 0 ? (
                      <span>
                        {details.events.length}{" "}
                        {details.events.length === 1 ? "event" : "events"}
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
                  kicker="Form guide"
                  title="Last five"
                  meta={
                    <Link
                      className="match-panel__link"
                      href={`/match/${match.id}?tab=form`}
                    >
                      Full form <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  }
                >
                  <FormGuide match={match} form={details.form} />
                  <p className="match-panel__footnote">
                    Form as published by ESPN, most recent first. The Form tab
                    lists every opponent and score.
                  </p>
                </MatchPanel>
              ) : null}

              {details.headToHead.length > 0 ? (
                <MatchPanel
                  kicker="Series history"
                  title="Recent meetings"
                  meta={
                    <Link
                      className="match-panel__link"
                      href={`/match/${match.id}?tab=h2h`}
                    >
                      All {details.headToHead.length}{" "}
                      <ArrowRight size={13} aria-hidden="true" />
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
                kicker={preMatch ? "Season so far" : "By the numbers"}
                title={preMatch ? "Season statistics" : "Match statistics"}
                meta={<span>As reported by ESPN</span>}
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
                  {preMatch
                    ? "Before kick-off ESPN reports season totals for each team, not match totals. Percentages and counts are shown exactly as the provider publishes them."
                    : "Percentages and counts are shown exactly as the provider reports them. Some cup fixtures never receive a box score."}
                </p>
              </MatchPanel>
            ) : (
              <MatchPanel
                kicker={preMatch ? "Season so far" : "By the numbers"}
                title={preMatch ? "Season statistics" : "Match statistics"}
              >
                <PanelEmpty
                  title="Statistics are not available"
                  description="ESPN has not published a box score for this fixture. This is normal before kick-off and for some cup matches."
                />
              </MatchPanel>
            )
          ) : tab === "lineups" ? (
            <MatchPanel
              kicker="Team sheets"
              title="Lineups"
              meta={
                details.lineups.length > 0 ? (
                  <span>
                    {details.lineups.length}{" "}
                    {details.lineups.length === 1 ? "squad" : "squads"}
                  </span>
                ) : undefined
              }
              bodyClassName="match-panel__body--flush"
            >
              {details.lineups.length === 0 ? (
                <EmptyState
                  icon={<Users size={22} />}
                  title="Lineups are not available"
                  description="ESPN publishes team sheets close to kick-off. Check back nearer the match, or open the squad pages for both teams."
                >
                  <Link
                    className="btn btn--ghost"
                    href={`/team/${match.home.id}`}
                  >
                    {match.home.shortName} squad
                  </Link>
                  <Link
                    className="btn btn--ghost"
                    href={`/team/${match.away.id}`}
                  >
                    {match.away.shortName} squad
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
              kicker="Series history"
              title="Previous meetings"
              meta={
                details.headToHead.length > 0 ? (
                  <span>
                    {details.headToHead.length}{" "}
                    {details.headToHead.length === 1 ? "match" : "matches"}
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
              kicker="Last five"
              title="Recent form"
              meta={<span>Most recent first</span>}
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
          All matches on this date
        </Link>
        {match.league ? (
          <Link
            href={`/competitions/${match.league.slug}?tab=fixtures`}
            className="btn btn--ghost btn--sm"
          >
            <Trophy size={15} aria-hidden="true" />
            {match.league.abbreviation} fixtures
          </Link>
        ) : null}
        <span className="match-toolbar__count">
          <Ticket size={12} aria-hidden="true" />
          {broadcasts.length > 0
            ? `TV: ${broadcasts.join(", ")}`
            : "Broadcast details not listed"}
        </span>
      </div>

      <p className="match-source">
        <Megaphone size={12} aria-hidden="true" /> Scores, events and lineups
        come from ESPN&apos;s public match summary. Data may lag the live
        broadcast.
      </p>
    </div>
  );
}

export default function MatchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<MatchSkeleton />}>
      <MatchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
