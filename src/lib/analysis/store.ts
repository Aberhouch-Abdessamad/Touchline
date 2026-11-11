/**
 * File-backed store for completed FFC-Vision analyses.
 *
 * The project has no database; one JSON file per match (`.data/analyses/<id>.json`,
 * gitignored) persists analyses across server restarts without adding
 * dependencies. Writes are atomic (temp file + rename) and failures are
 * swallowed by design — losing a persisted analysis only means the match can
 * be analysed again.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DatasetDataQuality } from "./dataset";
import type { AnalysisPrediction } from "@/lib/ai/analysis-schema";

export interface StoredAnalysisTranslation {
  translatedAt: string;
  /** Upstream model id that produced the Arabic text. */
  translatedBy: string;
  /** Arabic mirror of `prediction`: identical numbers, translated text. */
  prediction: AnalysisPrediction;
}

export interface StoredAnalysis {
  /** One document per match; stable key. */
  version: 1;
  matchId: string;
  provider: "ffc-vision";
  /** Requested master model (e.g. `FFC-Vision`). */
  model: string;
  /** Upstream model id the gateway actually answered with. */
  answeredBy: string;
  generatedAt: string;
  /** Fixture state when the analysis was produced (drives cache freshness). */
  matchState: string;
  promptTokens?: number;
  completionTokens?: number;
  dataQuality: DatasetDataQuality;
  prediction: AnalysisPrediction;
  /** Optional Arabic mirror, added on demand and persisted in place. */
  translation?: StoredAnalysisTranslation;
}

const DIRECTORY = ".data/analyses";

function filePath(matchId: string) {
  // Caller-validated ids are numeric, but stay defensive about path building.
  if (!/^[0-9a-z_-]+$/i.test(matchId)) {
    throw new Error("Invalid analysis id");
  }
  return path.join(process.cwd(), DIRECTORY, `${matchId}.json`);
}

export async function readStoredAnalysis(
  matchId: string,
): Promise<StoredAnalysis | null> {
  try {
    const contents = await readFile(filePath(matchId), "utf8");
    const parsed = JSON.parse(contents) as StoredAnalysis;
    if (parsed?.version !== 1 || parsed.prediction === undefined) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeStoredAnalysis(
  analysis: StoredAnalysis,
): Promise<void> {
  try {
    const target = path.join(process.cwd(), DIRECTORY);
    await mkdir(target, { recursive: true });
    const file = filePath(analysis.matchId);
    const temp = `${file}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(analysis, null, 2), "utf8");
    await rename(temp, file);
  } catch {
    // Persistence is best-effort: the caller still receives the analysis.
  }
}
