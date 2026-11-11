/**
 * Capturing predictions into the ledger.
 *
 *  - `recordPredictionSnapshot` is called by the analysis flow right after
 *    FFC-Vision answers. It stores the prediction ONLY when the match is still
 *    scheduled and kickoff is in the future, and never overwrites an existing
 *    entry.
 *  - `backfillFromAnalysisStore` imports predictions the analysis store already
 *    holds (written before this feature existed). Those are admitted only when
 *    the match was still "scheduled" at generation time; the exact
 *    generated-before-kickoff check is completed at verification, once the
 *    provider's kickoff time is known.
 */
import "server-only";
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { AnalysisPrediction } from "@/lib/ai/analysis-schema";
import type { DatasetFixture } from "@/lib/analysis/dataset";
import { readStoredAnalysis } from "@/lib/analysis/store";
import { derivePicks } from "./evaluate";
import { createLedgerRecord, readLedger } from "./store";
import type { LedgerRecord } from "./types";

export async function recordPredictionSnapshot(input: {
  fixture: DatasetFixture;
  prediction: AnalysisPrediction;
  generatedAt: string;
}): Promise<"recorded" | "exists" | "skipped"> {
  const { fixture, prediction, generatedAt } = input;
  const kickoff = Date.parse(fixture.kickoff);
  const generated = Date.parse(generatedAt);
  // Pre-kickoff only: a prediction made once the match started is not a prediction.
  if (
    fixture.state !== "scheduled" ||
    Number.isNaN(kickoff) ||
    Number.isNaN(generated) ||
    generated >= kickoff
  ) {
    return "skipped";
  }
  if (await readLedger(fixture.id)) return "exists";

  const record: LedgerRecord = {
    version: 1,
    matchId: fixture.id,
    recordedAt: new Date().toISOString(),
    generatedAt,
    source: "live",
    stateAtGeneration: fixture.state,
    fixture: {
      homeId: fixture.home.id,
      homeName: fixture.home.name,
      awayId: fixture.away.id,
      awayName: fixture.away.name,
      competition: fixture.competition,
      competitionSlug: fixture.competitionSlug,
      season: fixture.season,
      round: fixture.round,
      kickoff: fixture.kickoff,
    },
    prediction,
    picks: derivePicks(prediction),
  };
  return (await createLedgerRecord(record)) ? "recorded" : "exists";
}

/** Import pre-existing stored analyses that were generated before kickoff. */
export async function backfillFromAnalysisStore(): Promise<number> {
  let names: string[] = [];
  try {
    names = await readdir(path.join(process.cwd(), ".data", "analyses"));
  } catch {
    return 0;
  }
  let created = 0;
  for (const name of names) {
    // Prediction files are `<id>.json`; historical/live documents carry suffixes.
    const match = /^(\d+)\.json$/.exec(name);
    if (!match) continue;
    const matchId = match[1];
    if (await readLedger(matchId)) continue;
    const stored = await readStoredAnalysis(matchId);
    if (!stored || stored.matchState !== "scheduled") continue;
    const record: LedgerRecord = {
      version: 1,
      matchId,
      recordedAt: new Date().toISOString(),
      generatedAt: stored.generatedAt,
      source: "backfill",
      stateAtGeneration: stored.matchState,
      prediction: stored.prediction,
      picks: derivePicks(stored.prediction),
    };
    if (await createLedgerRecord(record)) created += 1;
  }
  return created;
}
