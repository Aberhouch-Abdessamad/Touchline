"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ExternalLink,
  Minus,
  Trophy,
} from "lucide-react";
import { EmptyState } from "@/components/ui/Primitives";
import { TeamLogo } from "@/components/ui/Logos";
import { LocalTime } from "@/components/ui/LocalTime";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RankingBoard } from "@/lib/types";

function Movement({ movement }: { movement: number }) {
  const { t, f } = useI18n();
  if (!movement) {
    return (
      <span
        className="movement movement--flat"
        title={t.rankings.move.flatTitle}
      >
        <Minus size={11} aria-hidden="true" />
        <span className="sr-only">{t.rankings.move.flatSr}</span>
      </span>
    );
  }
  const up = movement > 0;
  const abs = Math.abs(movement);
  const sr = up
    ? abs === 1
      ? t.rankings.move.upSrOne
      : t.rankings.move.upSrMany
    : abs === 1
      ? t.rankings.move.downSrOne
      : t.rankings.move.downSrMany;

  return (
    <span
      className={`movement ${up ? "movement--up" : "movement--down"}`}
      title={f(up ? t.rankings.move.upTitle : t.rankings.move.downTitle, {
        n: abs,
      })}
    >
      {up ? (
        <ArrowUp size={11} aria-hidden="true" />
      ) : (
        <ArrowDown size={11} aria-hidden="true" />
      )}
      {abs}
      <span className="sr-only">{f(sr, { n: abs })}</span>
    </span>
  );
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
  const { t, f } = useI18n();
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
    ? t.rankings.ledeFailed
    : entries.length === 0
      ? t.rankings.ledeEmpty
      : f(t.rankings.ledeCount, { n: formatNumber(entries.length) });

  return (
    <section className="rk-hero" aria-labelledby="rk-title">
      <div className="rk-hero__bar">
        <p className="rk-hero__eyebrow">
          <span className="rk-hero__spark" aria-hidden="true" />
          {t.rankings.kicker}
        </p>
        <div className="rk-hero__actions">
          <span className="rk-hero__tag">{t.rankings.tag}</span>
          <a
            className="rk-hero__action"
            href="https://www.fifa.com/fifa-world-ranking"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.rankings.fifaSource}
            <ExternalLink size={13} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="rk-hero__body">
        <div className="rk-hero__intro">
          <h1 className="rk-hero__title" id="rk-title">
            <span className="rk-hero__title-top">
              {gender === "men"
                ? t.rankings.titleTopMen
                : t.rankings.titleTopWomen}
            </span>
            <span className="rk-hero__title-main">
              {gender === "men"
                ? t.rankings.titleMainMen
                : t.rankings.titleMainWomen}
            </span>
          </h1>
          <p className="rk-hero__lede">{lede}</p>

          <div className="rk-switch" role="group" aria-label={t.rankings.genderAria}>
            <Link
              href={genderHref("men", confederation)}
              className={cn("rk-switch__item", gender === "men" && "is-active")}
              aria-current={gender === "men" ? "page" : undefined}
            >
              {t.rankings.genderMen}
            </Link>
            <Link
              href={genderHref("women", confederation)}
              className={cn(
                "rk-switch__item",
                gender === "women" && "is-active",
              )}
              aria-current={gender === "women" ? "page" : undefined}
            >
              {t.rankings.genderWomen}
            </Link>
          </div>
        </div>

        <aside className="rk-leader" aria-label={t.rankings.leaderAria}>
          <p className="rk-leader__label">{t.rankings.leaderLabel}</p>
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
                <span className="u-dir-ltr">{leader.points.toFixed(1)}</span>
                <span>{t.rankings.pointsUnit}</span>
              </p>
              <div className="rk-leader__foot">
                <Movement movement={leader.movement} />
                <span className="rk-leader__note">
                  {leader.movement === 0
                    ? t.rankings.leaderNoteFlat
                    : f(
                        Math.abs(leader.movement) === 1
                          ? t.rankings.leaderNoteOne
                          : t.rankings.leaderNoteMany,
                        { n: Math.abs(leader.movement) },
                      )}
                </span>
              </div>
              <a className="rk-leader__link" href="#rk-table">
                {t.rankings.jumpToTable}
                <ArrowRight size={14} aria-hidden="true" data-flip="rtl" />
              </a>
            </>
          ) : (
            <div className="rk-leader__empty">
              <Trophy size={20} aria-hidden="true" />
              <p>
                {failed
                  ? t.rankings.leaderEmptyFailed
                  : t.rankings.leaderEmptyNone}
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
          <dt>{t.rankings.stats.teams}</dt>
          <dd>{entries.length ? formatNumber(entries.length) : "—"}</dd>
        </div>
        <div className="rk-hero__stat">
          <dt>{t.rankings.stats.confederations}</dt>
          <dd>{board ? confederations.size : "—"}</dd>
        </div>
        <div className="rk-hero__stat">
          <dt>{t.rankings.stats.climber}</dt>
          <dd>
            {climber && climber.movement > 0 ? (
              <span className="u-dir-ltr">{`+${climber.movement}`}</span>
            ) : (
              "—"
            )}
            {climber && climber.movement > 0 ? (
              <span className="rk-hero__stat-note">{climber.name}</span>
            ) : null}
          </dd>
        </div>
        <div className="rk-hero__stat">
          <dt>{t.rankings.stats.published}</dt>
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

function genderHref(
  gender: "men" | "women",
  confederation: string,
): string {
  return `/rankings?gender=${gender}${
    confederation ? `&confederation=${confederation}` : ""
  }`;
}

function Podium({
  board,
  maxPoints,
}: {
  board: RankingBoard;
  maxPoints: number;
}) {
  const { t } = useI18n();
  const top = board.entries.slice(0, 3);
  if (top.length === 0) return null;

  return (
    <section className="rk-podium" aria-labelledby="rk-podium-title">
      <div className="rk-podium__head">
        <h2 className="rk-podium__title" id="rk-podium-title">
          {t.rankings.podium.title}
        </h2>
        <p className="rk-podium__sub">{t.rankings.podium.sub}</p>
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
                  {t.rankings.podium.medals[index]}
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
                  <span className="u-dir-ltr">{entry.points.toFixed(1)}</span>
                  <span>{t.rankings.ptsUnit}</span>
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
  const { t, f } = useI18n();
  const entries = confederation
    ? board.entries.filter((entry) => entry.confederation === confederation)
    : board.entries;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={22} />}
        title={t.rankings.emptyTitle}
        description={t.rankings.emptyDesc}
        action={{
          href: `/rankings?gender=${board.gender}`,
          label: t.rankings.showEveryTeam,
        }}
      />
    );
  }

  const genderToken = t.rankings.genders[board.gender];
  const caption = confederation
    ? f(t.rankings.captionFiltered, {
        gender: genderToken,
        conf: confederation,
      })
    : f(t.rankings.caption, { gender: genderToken });

  return (
    <div className="table-wrap">
      <table className="rk-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.rankings.table.rank}</th>
            <th scope="col">{t.rankings.table.team}</th>
            <th scope="col" className="rk-col-conf">
              {t.rankings.table.confederation}
            </th>
            <th scope="col">{t.rankings.table.points}</th>
            <th scope="col" className="rk-col-prev">
              {t.rankings.table.previous}
            </th>
            <th scope="col">{t.rankings.table.move}</th>
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
                  <span className="rk-points__value u-dir-ltr">
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

/**
 * Client chrome for the FIFA rankings page. The server page keeps metadata,
 * query parsing and the FIFA fetch; this component renders the translated UI
 * around plain ranking data.
 */
export function RankingsView({
  board,
  gender,
  confederation,
  confederations,
  failed,
}: {
  board: RankingBoard | null;
  gender: "men" | "women";
  confederation: string;
  confederations: readonly string[];
  failed: boolean;
}) {
  const { t, f } = useI18n();
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
          title={t.rankings.unavailableTitle}
          description={t.rankings.unavailableDesc}
          action={{
            href: `/rankings?gender=${gender}`,
            label: t.rankings.retryRankings,
          }}
        />
      ) : (
        <>
          <Podium board={board} maxPoints={maxPoints} />

          <div className="rk-filters" id="rk-table">
            <div className="rk-filters__label">
              <Trophy size={13} aria-hidden="true" />
              {t.rankings.filters.label}
            </div>
            <nav className="rk-chips" aria-label={t.rankings.filters.aria}>
              <Link
                href={genderHref(gender, "")}
                className={cn("rk-chip", !confederation && "is-active")}
                aria-current={!confederation ? "true" : undefined}
              >
                {t.common.all}
              </Link>
              {confederations.filter((name) => available.has(name)).map(
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
              {f(
                confederation
                  ? t.rankings.filters.inViewCount
                  : t.rankings.filters.teamsCount,
                {
                  n: formatNumber(
                    confederation
                      ? board.entries.filter(
                          (entry) => entry.confederation === confederation,
                        ).length
                      : board.entries.length,
                  ),
                },
              )}
            </span>
          </div>

          <section className="rk-board" aria-labelledby="rk-board-title">
            <div className="rk-board__head">
              <div>
                <h2 className="rk-board__title" id="rk-board-title">
                  {confederation
                    ? f(t.rankings.board.confTeams, { conf: confederation })
                    : t.rankings.board.allTeams}
                </h2>
                <p className="rk-board__sub">
                  {board.updatedAt ? (
                    <>
                      {t.rankings.board.published}{" "}
                      <LocalTime
                        date={board.updatedAt}
                        mode="date"
                        fallback={board.updatedAt}
                      />
                      {". "}
                    </>
                  ) : null}
                  {t.rankings.board.movementNote}
                </p>
              </div>
              <span className="rk-board__legend">
                <span>
                  <i className="rk-legend-dot rk-legend-dot--up" />{" "}
                  {t.rankings.board.legendUp}
                </span>
                <span>
                  <i className="rk-legend-dot rk-legend-dot--down" />{" "}
                  {t.rankings.board.legendDown}
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
