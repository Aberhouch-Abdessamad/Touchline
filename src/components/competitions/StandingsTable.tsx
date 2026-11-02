"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Star } from "lucide-react";
import { TeamLogo } from "@/components/ui/Logos";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { StandingGroup } from "@/lib/types";

function FormStrip({ form }: { form?: string }) {
  const { t, f } = useI18n();
  const letters = t.competitions.standings.letters;
  if (!form) return <span className="small text-muted">—</span>;
  const results = form
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .slice(-5)
    .split("");
  if (results.length === 0) return <span className="small text-muted">—</span>;
  const shown = results.map((result) =>
    result === "W" ? letters.W : result === "D" ? letters.D : result === "L" ? letters.L : result,
  );
  return (
    <span
      className="form-strip"
      aria-label={
        f(t.competitions.standings.formAria, { form: shown.join(" ") })
      }
    >
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={
            result === "W" ? "form-w" : result === "D" ? "form-d" : "form-l"
          }
        >
          {shown[index]}
        </span>
      ))}
    </span>
  );
}

export function StandingsTable({ groups }: { groups: StandingGroup[] }) {
  const { t, f } = useI18n();
  const columns = t.competitions.standings.columns;
  const preferences = usePreferences();
  const favouriteTeams = useMemo(
    () => new Set(preferences.favorites.teams.map((team) => team.id)),
    [preferences.favorites.teams],
  );

  return (
    <>
      {groups.map((group) => (
        <section key={group.id ?? group.name}>
          {groups.length > 1 || group.name !== "Table" ? (
            <h2 className="group-title">{group.name}</h2>
          ) : null}
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">
                {f(t.competitions.standings.caption, { group: group.name })}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{columns.position}</th>
                  <th scope="col">{columns.team}</th>
                  <th scope="col">{columns.played}</th>
                  <th scope="col">{columns.won}</th>
                  <th scope="col">{columns.drawn}</th>
                  <th scope="col">{columns.lost}</th>
                  <th scope="col">{columns.goalsFor}</th>
                  <th scope="col">{columns.goalsAgainst}</th>
                  <th scope="col">{columns.goalDifference}</th>
                  <th scope="col">{columns.points}</th>
                  <th scope="col">{columns.form}</th>
                </tr>
              </thead>
              <tbody>
                {group.entries.map((entry) => {
                  const isFavourite =
                    preferences.hydrated && favouriteTeams.has(entry.team.id);
                  return (
                    <tr
                      key={`${group.id ?? group.name}-${entry.team.id}`}
                      className={cn(isFavourite && "is-favourite")}
                    >
                      <td className="rank-cell">
                        {entry.rank}
                        {isFavourite ? (
                          <Star
                            size={10}
                            aria-label={t.competitions.standings.favouriteTeam}
                            style={{ marginLeft: 4, display: "inline-block" }}
                          />
                        ) : null}
                      </td>
                      <td>
                        <span className="team-cell">
                          <TeamLogo
                            src={entry.team.logo}
                            name={entry.team.name}
                            size={20}
                          />
                          <Link
                            href={`/team/${entry.team.id}`}
                            className="team-cell__name"
                          >
                            {entry.team.shortName || entry.team.name}
                          </Link>
                        </span>
                      </td>
                      <td>{entry.played}</td>
                      <td>{entry.wins}</td>
                      <td>{entry.draws}</td>
                      <td>{entry.losses}</td>
                      <td>{entry.goalsFor}</td>
                      <td>{entry.goalsAgainst}</td>
                      <td>
                        <span className="u-dir-ltr">
                          {entry.goalDifference > 0
                            ? `+${entry.goalDifference}`
                            : entry.goalDifference}
                        </span>
                      </td>
                      <td className="points-cell">{entry.points}</td>
                      <td>
                        <FormStrip form={entry.form} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {group.entries.some((entry) => entry.note) ? (
            <div className="legend">
              {Array.from(
                new Map(
                  group.entries
                    .filter((entry) => entry.note)
                    .map((entry) => [
                      `${entry.note}-${entry.noteColor ?? ""}`,
                      entry,
                    ]),
                ).values(),
              ).map((entry) => (
                <span key={`${entry.note}-${entry.noteColor ?? ""}`}>
                  <i
                    style={{ background: entry.noteColor ?? "var(--line-strong)" }}
                    aria-hidden="true"
                  />
                  {entry.note}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </>
  );
}
