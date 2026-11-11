/**
 * Persistence for the AI Predictions League.
 *
 * The project has no database, so (like the analysis store) documents are
 * JSON files, one per match, under the gitignored `.data/` directory:
 *
 *   .data/predictions/ledger/<matchId>.json       write-once original prediction
 *   .data/predictions/evaluations/<matchId>.json  verification result (replaceable)
 *
 * The filesystem enforces the unique-fixture constraint: a ledger file is created
 * with the exclusive flag `wx`, so a second prediction for the same match (a
 * regeneration, a race between two requests, a post-kickoff refresh) can never
 * overwrite the original. Evaluations are written atomically (temp + rename).
 */
import "server-only";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Entry, EvaluationRecord, LedgerRecord } from "./types";

const ROOT = path.join(process.cwd(), ".data", "predictions");
const LEDGER_DIR = path.join(ROOT, "ledger");
const EVAL_DIR = path.join(ROOT, "evaluations");

function safeId(matchId: string): string {
  if (!/^[0-9a-z_-]+$/i.test(matchId)) throw new Error("Invalid match id");
  return matchId;
}

const ledgerFile = (id: string) => path.join(LEDGER_DIR, `${safeId(id)}.json`);
const evalFile = (id: string) => path.join(EVAL_DIR, `${safeId(id)}.json`);

/* ---- in-memory document cache keyed by mtime+size ---------------------- */

interface Cached<T> {
  stamp: string;
  value: T | null;
}
const ledgerCache = new Map<string, Cached<LedgerRecord>>();
const evalCache = new Map<string, Cached<EvaluationRecord>>();

async function readCached<T>(
  file: string,
  cache: Map<string, Cached<T>>,
  valid: (value: unknown) => value is T,
): Promise<T | null> {
  try {
    const info = await stat(file);
    const stamp = `${info.mtimeMs}:${info.size}`;
    const hit = cache.get(file);
    if (hit && hit.stamp === stamp) return hit.value;
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    const value = valid(parsed) ? parsed : null;
    cache.set(file, { stamp, value });
    return value;
  } catch {
    cache.delete(file);
    return null;
  }
}

const isLedger = (value: unknown): value is LedgerRecord => {
  const v = value as LedgerRecord | null;
  return (
    !!v &&
    v.version === 1 &&
    typeof v.matchId === "string" &&
    typeof v.generatedAt === "string" &&
    !!v.prediction &&
    !!v.picks
  );
};
const isEvaluation = (value: unknown): value is EvaluationRecord => {
  const v = value as EvaluationRecord | null;
  return !!v && v.version === 1 && typeof v.matchId === "string" && typeof v.status === "string";
};

export async function readLedger(matchId: string): Promise<LedgerRecord | null> {
  return readCached(ledgerFile(matchId), ledgerCache, isLedger);
}

export async function readEvaluation(matchId: string): Promise<EvaluationRecord | null> {
  return readCached(evalFile(matchId), evalCache, isEvaluation);
}

/**
 * Create the ledger entry for a match. Returns false (and writes nothing) when
 * one already exists: the original prediction is immutable.
 */
export async function createLedgerRecord(record: LedgerRecord): Promise<boolean> {
  try {
    await mkdir(LEDGER_DIR, { recursive: true });
    await writeFile(ledgerFile(record.matchId), JSON.stringify(record, null, 2), {
      encoding: "utf8",
      flag: "wx",
    });
    invalidateEntries();
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EEXIST") return false;
    console.error("[predictions] ledger write failed:", (error as Error)?.message);
    return false;
  }
}

export async function writeEvaluation(record: EvaluationRecord): Promise<void> {
  try {
    await mkdir(EVAL_DIR, { recursive: true });
    const file = evalFile(record.matchId);
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(record, null, 2), "utf8");
    await rename(temp, file);
    invalidateEntries();
  } catch (error) {
    console.error("[predictions] evaluation write failed:", (error as Error)?.message);
  }
}

/* ---- bulk loading with a short-lived cache -------------------------------- */

let entriesCache: { at: number; entries: Entry[] } | null = null;
let entriesLoading: Promise<Entry[]> | null = null;
const ENTRIES_TTL_MS = 20_000;

export function invalidateEntries(): void {
  entriesCache = null;
}

async function listIds(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir))
      .filter((name) => name.endsWith(".json"))
      .map((name) => name.slice(0, -5));
  } catch {
    return [];
  }
}

export async function listLedgerIds(): Promise<string[]> {
  return listIds(LEDGER_DIR);
}

/** Every ledger entry joined with its evaluation (if any). */
export async function loadEntries(): Promise<Entry[]> {
  if (entriesCache && Date.now() - entriesCache.at < ENTRIES_TTL_MS) {
    return entriesCache.entries;
  }
  if (entriesLoading) return entriesLoading;

  entriesLoading = (async () => {
    const ids = await listLedgerIds();
    const entries: Entry[] = [];
    // Bounded concurrency keeps a thousand-file archive from exhausting handles.
    const queue = [...ids];
    const worker = async () => {
      for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
        const ledger = await readLedger(id);
        if (!ledger) continue;
        entries.push({ ledger, evaluation: await readEvaluation(id) });
      }
    };
    await Promise.all(Array.from({ length: 16 }, worker));
    entriesCache = { at: Date.now(), entries };
    return entries;
  })().finally(() => {
    entriesLoading = null;
  });
  return entriesLoading;
}

export async function loadEntry(matchId: string): Promise<Entry | null> {
  const ledger = await readLedger(matchId);
  if (!ledger) return null;
  return { ledger, evaluation: await readEvaluation(matchId) };
}
