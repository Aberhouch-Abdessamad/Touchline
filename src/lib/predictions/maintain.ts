/**
 * Keeps the ledger current without blocking requests.
 *
 *  - imports pre-existing stored predictions once per process;
 *  - runs a verification sweep at most every `MIN_GAP_MS` (non-blocking), so
 *    results appear soon after matches end whenever the site is being used;
 *  - `startBackgroundVerification` (called from instrumentation) also sweeps on
 *    a timer, so evaluation happens even when nobody opens the dashboard.
 */
import "server-only";
import { backfillFromAnalysisStore } from "./record";
import { verifyDue } from "./verify";

const MIN_GAP_MS = 5 * 60_000;
const TIMER_MS = 15 * 60_000;

let backfilled: Promise<number> | null = null;
let lastSweepAt = 0;

export function ensureFresh(): void {
  if (!backfilled) {
    backfilled = backfillFromAnalysisStore().catch(() => 0);
  }
  if (Date.now() - lastSweepAt < MIN_GAP_MS) return;
  lastSweepAt = Date.now();
  void backfilled
    .then(() => verifyDue())
    .catch((error) => console.error("[predictions] sweep failed:", error));
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startBackgroundVerification(): void {
  if (timer) return;
  timer = setInterval(ensureFresh, TIMER_MS);
  // Do not keep the process alive just for this timer.
  timer.unref?.();
  ensureFresh();
}
