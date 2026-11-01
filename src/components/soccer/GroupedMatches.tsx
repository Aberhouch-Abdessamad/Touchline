import Link from "next/link";
import { MatchRow } from "./MatchRow";
import { TeamLogo } from "@/components/ui/Logos";
import type { Match } from "@/lib/types";

export interface MatchGroupData {
  key: string;
  name: string;
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
  if (groups.length === 0) return <>{empty}</>;

  return (
    <div>
      {groups.map((group) => (
        <section className="match-group" key={group.key}>
          <div className="match-group__head">
            {group.href ? (
              <Link href={group.href} className="match-group__name">
                {group.name}
              </Link>
            ) : (
              <span className="match-group__name">{group.name}</span>
            )}
            <span className="small text-muted">{group.matches.length}</span>
            {group.href ? (
              <Link href={group.href} className="match-group__link">
                Open competition
              </Link>
            ) : null}
          </div>
          <div className="match-list">
            {group.matches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function MiniMatchRow({ match }: { match: Match }) {
  return (
    <Link href={`/match/${match.id}`} className="calendar-mini-row">
      <span className="calendar-mini-row__time">
        {match.state === "finished" ? "FT" : match.clock || match.statusLabel}
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
        {match.state === "scheduled"
          ? match.round?.slice(0, 14) ?? ""
          : `${match.home.score ?? "–"}–${match.away.score ?? "–"}`}
      </span>
    </Link>
  );
}
