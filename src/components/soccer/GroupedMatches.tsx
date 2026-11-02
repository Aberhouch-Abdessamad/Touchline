"use client";

import Link from "next/link";
import { useI18n, leagueDisplayName } from "@/lib/i18n";
import { MatchRow } from "./MatchRow";
import { TeamLogo } from "@/components/ui/Logos";
import type { Match } from "@/lib/types";

export interface MatchGroupData {
  key: string;
  name: string;
  /** Competition slug, when known — lets the display name localise itself. */
  slug?: string;
  href?: string;
  matches: Match[];
}

export function GroupedMatches({
  groups,
  empty,
}: {
  groups: MatchGroupData[];
  empty?: React.ReactNode;
}) {
  const { t, lang } = useI18n();
  if (groups.length === 0) return <>{empty}</>;

  return (
    <div>
      {groups.map((group) => {
        const name = leagueDisplayName(
          { slug: group.slug ?? group.key, name: group.name },
          lang,
        );
        return (
          <section className="match-group" key={group.key}>
            <div className="match-group__head">
              {group.href ? (
                <Link href={group.href} className="match-group__name">
                  {name}
                </Link>
              ) : (
                <span className="match-group__name">{name}</span>
              )}
              <span className="small text-muted">{group.matches.length}</span>
              {group.href ? (
                <Link href={group.href} className="match-group__link">
                  {t.matches.groups.openCompetition}
                </Link>
              ) : null}
            </div>
            <div className="match-list">
              {group.matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function MiniMatchRow({ match }: { match: Match }) {
  const { t } = useI18n();
  return (
    <Link href={`/match/${match.id}`} className="calendar-mini-row">
      <span className="calendar-mini-row__time">
        <span className="u-dir-ltr">
          {match.state === "finished"
            ? t.common.stateShort.finished
            : match.clock || match.statusLabel}
        </span>
      </span>
      <span className="calendar-mini-row__teams">
        <span className="calendar-mini-row__team">
          <TeamLogo src={match.home.logo} name={match.home.name} size={14} />
          {match.home.name}
        </span>
        <span className="calendar-mini-row__team">
          <TeamLogo src={match.away.logo} name={match.away.name} size={14} />
          {match.away.name}
        </span>
      </span>
      <span className="calendar-mini-row__score">
        <span className="u-dir-ltr">
          {match.state === "scheduled"
            ? match.round?.slice(0, 14) ?? ""
            : `${match.home.score ?? "–"}–${match.away.score ?? "–"}`}
        </span>
      </span>
    </Link>
  );
}
