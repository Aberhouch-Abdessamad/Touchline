import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ExternalLink,
  Minus,
  Trophy,
} from "lucide-react";
import { EmptyState, Skeleton } from "@/components/ui/Primitives";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { getRankings } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RankingBoard } from "@/lib/types";

const CONFEDERATIONS = [
  "UEFA",
  "CONMEBOL",
  "CONCACAF",
  "CAF",
  "AFC",
  "OFC",
] as const;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseGender(value: string | undefined): "men" | "women" {
  return value === "women" ? "women" : "men";
}

function Movement({ movement }: { movement: number }) {
  if (!movement) {
    return (
      <span className="movement movement--flat" title="No change">
        <Minus size={11} aria-hidden="true" />
        <span className="sr-only">No change</span>
      </span>
    );
  }
  const up = movement > 0;
  return (
    <span
      className={`movement ${up ? "movement--up" : "movement--down"}`}
      title={up ? `Up ${movement}` : `Down ${Math.abs(movement)}`}
    >
      {up ? (
        <ArrowUp size={11} aria-hidden="true" />
      ) : (
        <ArrowDown size={11} aria-hidden="true" />
      )}
      {Math.abs(movement)}
      <span className="sr-only">
        {up ? `up ${movement}` : `down ${Math.abs(movement)}`}{" "}
        {Math.abs(movement) === 1 ? "place" : "places"}
      </span>
    </span>
  );
}

export const metadata = {
  title: "FIFA rankings",
  description:
    "The official FIFA men's and women's world rankings, with movement, confederation filters and points totals from the FIFA public API.",
  alternates: { canonical: "/rankings" },
};

function genderHref(
  gender: "men" | "women",
  confederation: string,
): string {
  return `/rankings?gender=${gender}${
    confederation ? `&confederation=${confederation}` : ""
  }`;
}

function RankingsHero({
  board,
  gender,
  confederation,
  failed,
}: {
  board: RankingBoard | null;
  gender: "men" | "women";
  confederation: string;
  failed: boolean;
}) {
  const leader = board?.entries[0];
  const entries = board?.entries ?? [];
  const confederations = new Set(entries.map((entry) => entry.confederation));
  const climber = entries.reduce<
    (typeof entries)[number] | undefined
  >((best, entry) => {
    if (!best || entry.movement > best.movement) return entry;
    return best;
  }, undefined);

  const lede = failed
    ? "The FIFA public API did not respond. The controls still work, so you can retry or switch ranking."
    : entries.length === 0
      ? "No ranking entries were returned for this release. Try again shortly."
      : `${formatNumber(entries.length)} national teams, ordered by FIFA. Movement compares with the previous release.`;

  return (
    <section className="rk-hero" aria-labelledby="rk-title">
      <div className="rk-hero__bar">
        <p className="rk-hero__eyebrow">
          <span className="rk-hero__spark" aria-hidden="true" />
          World rankings
        </p>
        <div className="rk-hero__actions">
          <span className="rk-hero__tag">Official FIFA table</span>
          <a
            className="rk-hero__action"
            href="https://www.fifa.com/fifa-world-ranking"
            target="_blank"
            rel="noopener noreferrer"
          >
            FIFA source
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="rk-hero__body">
        <div className="rk-hero__intro">
          <h1 className="rk-hero__title" id="rk-title">
            <span className="rk-hero__title-top">
              {gender === "men" ? "Men's world" : "Women's world"}
            </span>
            <span className="rk-hero__title-main">ranking</span>
          </h1>
          <p className="rk-hero__lede">{lede}</p>

          <div className="rk-switch" role="group" aria-label="Ranking gender">
            <Link
              href={genderHref("men", confederation)}
              className={cn("rk-switch__item", gender === "men" && "is-active")}
              aria-current={gender === "men" ? "page" : undefined}
            >
              Men
            </Link>
            <Link
              href={genderHref("women", confederation)}
              className={cn(
                "rk-switch__item",
                gender === "women" && "is-active",
              )}
              aria-current={gender === "women" ? "page" : undefined}
            >
              Women
            </Link>
          </div>
        </div>

        <aside className="rk-leader" aria-label="Ranking leader">
          <p className="rk-leader__label">Top of the table</p>
          {leader ? (
            <>
              <div className="rk-leader__team">
                <TeamLogo name={leader.name} size={46} />
                <div className="rk-leader__id">
                  <p className="rk-leader__name">{leader.name}</p>
                  <p className="rk-leader__conf">
                    {leader.confederation}
                    {leader.countryCode ? ` · ${leader.countryCode}` : ""}
                  </p>
                </div>
              </div>
              <p className="rk-leader__points">
                {leader.points.toFixed(1)}
                <span>points</span>
              </p>
              <div className="rk-leader__foot">
                <Movement movement={leader.movement} />
                <span className="rk-leader__note">
                  {leader.movement === 0
                    ? "unchanged since the last release"
                    : `${Math.abs(leader.movement)} ${
                        Math.abs(leader.movement) === 1 ? "place" : "places"
                      } since the last release`}
                </span>
              </div>
              <a className="rk-leader__link" href="#rk-table">
                Jump to the full table
                <ArrowRight size={14} aria-hidden="true" />
              </a>
            </>
          ) : (
            <div className="rk-leader__empty">
              <Trophy size={20} aria-hidden="true" />
              <p>
                {failed
                  ? "The ranking is temporarily unavailable."
                  : "No leader to show for this release."}
              </p>
            </div>
          )}
          <span className="rk-leader__watermark" aria-hidden="true">
            01
          </span>
        </aside>
      </div>

      <dl className="rk-hero__stats">
        <div className="rk-hero__stat">
          <dt>Teams ranked</dt>
          <dd>{entries.length ? formatNumber(entries.length) : "—"}</dd>
        </div>
        <div className="rk-hero__stat">
          <dt>Confederations</dt>
          <dd>{board ? confederations.size : "—"}</dd>
        </div>
        <div className="rk-hero__stat">
          <dt>Biggest climber</dt>
          <dd>
            {climber && climber.movement > 0 ? `+${climber.movement}` : "—"}
            {climber && climber.movement > 0 ? (
              <span className="rk-hero__stat-note">{climber.name}</span>
            ) : null}
          </dd>
        </div>
        <div className="rk-hero__stat">
          <dt>Published</dt>
          <dd className="rk-hero__stat-date">
            {board?.updatedAt ? (
              <LocalTime
                date={board.updatedAt}
                mode="date"
                fallback={board.updatedAt}
              />
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Podium({
  board,
  maxPoints,
}: {
  board: RankingBoard;
  maxPoints: number;
}) {
  const top = board.entries.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section className="rk-podium" aria-labelledby="rk-podium-title">
      <div className="rk-podium__head">
        <h2 className="rk-podium__title" id="rk-podium-title">
          The top three
        </h2>
        <p className="rk-podium__sub">
          First, second and third as published by FIFA.
        </p>
      </div>
      <div className="rk-podium__grid">
        {top.map((entry, index) => {
          const percent = maxPoints
            ? Math.max(2, Math.round((entry.points / maxPoints) * 100))
            : 0;
          return (
            <article
              key={entry.teamId || entry.name}
              className={cn(
                "rk-podium__card",
                index === 0 && "is-first",
                index === 1 && "is-second",
                index === 2 && "is-third",
              )}
            >
              <div className="rk-podium__top">
                <span className="rk-podium__rank" aria-hidden="true">
                  {String(entry.rank).padStart(2, "0")}
                </span>
                <span className="rk-podium__medal">
                  {index === 0 ? "Leader" : index === 1 ? "Second" : "Third"}
                </span>
              </div>
              <div className="rk-podium__team">
                <TeamLogo name={entry.name} size={36} />
                <div className="rk-podium__id">
                  <h3 className="rk-podium__name">{entry.name}</h3>
                  <p className="rk-podium__conf">
                    {entry.confederation}
                    {entry.countryCode ? ` · ${entry.countryCode}` : ""}
                  </p>
                </div>
              </div>
              <div className="rk-podium__foot">
                <p className="rk-podium__points">
                  {entry.points.toFixed(1)}
                  <span>pts</span>
                </p>
                <Movement movement={entry.movement} />
              </div>
              <span className="rk-podium__track" aria-hidden="true">
                <i style={{ width: `${percent}%` }} />
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RankingsTable({
  board,
  confederation,
  maxPoints,
}: {
  board: RankingBoard;
  confederation: string;
  maxPoints: number;
}) {
  const entries = confederation
    ? board.entries.filter((entry) => entry.confederation === confederation)
    : board.entries;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={22} />}
        title="No teams in this confederation"
        description="Try another confederation, or reset the filter to see the full ranking."
        action={{ href: `/rankings?gender=${board.gender}`, label: "Show every team" }}
      />
    );
  }

  return (
    <div className="table-wrap">
      <table className="rk-table">
        <caption className="sr-only">
          FIFA {board.gender === "women" ? "women's" : "men's"} world rankings
          {confederation ? `, filtered to ${confederation}` : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Team</th>
            <th scope="col" className="rk-col-conf">
              Confederation
            </th>
            <th scope="col">Points</th>
            <th scope="col" className="rk-col-prev">
              Previous
            </th>
            <th scope="col">Move</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const percent = maxPoints
              ? Math.max(1, Math.round((entry.points / maxPoints) * 100))
              : 0;
            return (
              <tr
                key={`${entry.teamId}-${entry.rank}`}
                className={cn(entry.rank <= 3 && "is-podium")}
              >
                <td className="rk-rank-cell">
                  <span
                    className={cn(
                      "rk-rank",
                      entry.rank <= 3 && "rk-rank--top",
                    )}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td>
                  <span className="team-cell">
                    <TeamLogo name={entry.name} size={22} />
                    <span className="team-cell__name">{entry.name}</span>
                    {entry.countryCode ? (
                      <span className="rk-team__code">{entry.countryCode}</span>
                    ) : null}
                  </span>
                </td>
                <td className="rk-col-conf">
                  <span className="rk-conf">{entry.confederation}</span>
                </td>
                <td className="rk-points-cell">
                  <span className="rk-points__value">
                    {entry.points.toFixed(1)}
                  </span>
                  <span className="rk-points__track" aria-hidden="true">
                    <i style={{ width: `${percent}%` }} />
                  </span>
                </td>
                <td className="rk-col-prev rk-prev">
                  {entry.previousRank ?? "—"}
                </td>
                <td className="rk-move-cell">
                  <Movement movement={entry.movement} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RankingsSkeleton() {
  return (
    <div className="rk-page" aria-hidden="true">
      <section className="rk-hero rk-hero--skeleton">
        <div className="rk-hero__bar">
          <Skeleton width={140} height={10} />
          <Skeleton width={110} height={26} />
        </div>
        <div className="rk-hero__body">
          <div className="rk-hero__intro">
            <Skeleton width="72%" height={46} />
            <Skeleton width="54%" height={13} className="rk-skel-gap" />
            <Skeleton width={168} height={34} className="rk-skel-gap" />
          </div>
          <div className="rk-leader">
            <Skeleton width={110} height={9} />
            <Skeleton width="70%" height={40} className="rk-skel-gap" />
            <Skeleton width="46%" height={22} className="rk-skel-gap" />
          </div>
        </div>
        <div className="rk-hero__stats">
          {[0, 1, 2, 3].map((stat) => (
            <div className="rk-hero__stat" key={stat}>
              <Skeleton width={64} height={8} />
              <Skeleton width={52} height={22} className="rk-skel-gap" />
            </div>
          ))}
        </div>
      </section>
      <div className="rk-podium">
        <div className="rk-podium__head">
          <Skeleton width={130} height={18} />
        </div>
        <div className="rk-podium__grid">
          {[0, 1, 2].map((card) => (
            <div className="rk-podium__card" key={card}>
              <Skeleton width="58%" height={14} />
              <Skeleton width="80%" height={26} className="rk-skel-gap" />
              <Skeleton width="42%" height={16} className="rk-skel-gap" />
            </div>
          ))}
        </div>
      </div>
      <div className="rk-board">
        <div className="rk-board__head">
          <Skeleton width={150} height={20} />
        </div>
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div className="rk-skel-row" key={row}>
            <Skeleton width={24} height={14} />
            <Skeleton width={170} height={14} />
            <Skeleton width="100%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

async function RankingsContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const gender = parseGender(first(params.gender));
  const requested = first(params.confederation);
  const confederation =
    requested && CONFEDERATIONS.includes(requested as (typeof CONFEDERATIONS)[number])
      ? requested
      : "";

  let board: RankingBoard | null = null;
  let failed = false;
  try {
    board = await getRankings(gender);
  } catch {
    failed = true;
  }

  const maxPoints = board?.entries[0]?.points ?? 0;
  const available = new Set(
    (board?.entries ?? []).map((entry) => entry.confederation),
  );

  return (
    <div className="rk-page">
      <RankingsHero
        board={board}
        gender={gender}
        confederation={confederation}
        failed={failed}
      />

      {failed || !board ? (
        <EmptyState
          icon={<Trophy size={22} />}
          title="FIFA rankings are unavailable"
          description="The FIFA public API did not respond. Rankings update periodically, so nothing is lost — retry in a moment."
          action={{
            href: `/rankings?gender=${gender}`,
            label: "Retry rankings",
          }}
        />
      ) : (
        <>
          <Podium board={board} maxPoints={maxPoints} />

          <div className="rk-filters" id="rk-table">
            <div className="rk-filters__label">
              <Trophy size={13} aria-hidden="true" />
              Confederation
            </div>
            <nav className="rk-chips" aria-label="Filter by confederation">
              <Link
                href={genderHref(gender, "")}
                className={cn("rk-chip", !confederation && "is-active")}
                aria-current={!confederation ? "true" : undefined}
              >
                All
              </Link>
              {CONFEDERATIONS.filter((name) => available.has(name)).map(
                (name) => (
                  <Link
                    key={name}
                    href={genderHref(gender, name)}
                    className={cn(
                      "rk-chip",
                      confederation === name && "is-active",
                    )}
                    aria-current={confederation === name ? "true" : undefined}
                  >
                    {name}
                  </Link>
                ),
              )}
            </nav>
            <span className="rk-filters__count">
              {formatNumber(
                confederation
                  ? board.entries.filter(
                      (entry) => entry.confederation === confederation,
                    ).length
                  : board.entries.length,
              )}{" "}
              {confederation ? "in view" : "teams"}
            </span>
          </div>

          <section className="rk-board" aria-labelledby="rk-board-title">
            <div className="rk-board__head">
              <div>
                <h2 className="rk-board__title" id="rk-board-title">
                  {confederation
                    ? `${confederation} teams`
                    : "All ranked teams"}
                </h2>
                <p className="rk-board__sub">
                  {board.updatedAt ? (
                    <>
                      Published{" "}
                      <LocalTime
                        date={board.updatedAt}
                        mode="date"
                        fallback={board.updatedAt}
                      />
                      .{" "}
                    </>
                  ) : null}
                  Movement compares with the previous release.
                </p>
              </div>
              <span className="rk-board__legend">
                <span>
                  <i className="rk-legend-dot rk-legend-dot--up" /> Up
                </span>
                <span>
                  <i className="rk-legend-dot rk-legend-dot--down" /> Down
                </span>
              </span>
            </div>

            <RankingsTable
              board={board}
              confederation={confederation}
              maxPoints={maxPoints}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default function RankingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense fallback={<RankingsSkeleton />}>
      <RankingsContent searchParams={searchParams} />
    </Suspense>
  );
}
