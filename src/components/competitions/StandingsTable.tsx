"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Star } from "lucide-react";
import { TeamLogo } from "@/components/ui/Logos";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { cn } from "@/lib/utils";
import type { StandingGroup } from "@/lib/types";

function FormStrip({ form }: { form?: string }) {
  if (!form) return <span className="small text-muted">—</span>;
  const results = form
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .slice(-5)
    .split("");
  if (results.length === 0) return <span className="small text-muted">—</span>;
  return (
    <span className="form-strip" aria-label={`Recent form: ${results.join(" ")}`}>
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={
            result === "W" ? "form-w" : result === "D" ? "form-d" : "form-l"
          }
        >
          {result}
        </span>
      ))}
    </span>
  );
}

export function StandingsTable({ groups }: { groups: StandingGroup[] }) {
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
                {group.name} standings, including played, won, drawn, lost,
                goals and points
              </caption>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Team</th>
                  <th scope="col">P</th>
                  <th scope="col">W</th>
                  <th scope="col">D</th>
                  <th scope="col">L</th>
                  <th scope="col">GF</th>
                  <th scope="col">GA</th>
                  <th scope="col">GD</th>
                  <th scope="col">Pts</th>
                  <th scope="col">Form</th>
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
                            aria-label="Favourite team"
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
                        {entry.goalDifference > 0
                          ? `+${entry.goalDifference}`
                          : entry.goalDifference}
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
