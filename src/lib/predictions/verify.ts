/**
 * Automatic result verification.
 *
 * For every ledger entry this fetches the match summary from the football API
 * (the only source of actual facts), decides whether the result can be used,
 * and stores an EvaluationRecord. It never touches the ledger.
 *
 * What counts as "completed":
 *  - finished with a published final score  -> evaluated
 *  - postponed / canceled / abandoned       -> void (excluded from accuracy)
 *  - decided after extra time or penalties  -> void (a 90-minute prediction is
 *    not comparable with a score that includes extra time)
 *  - anything still scheduled / in play     -> pending (never counted as wrong)
 *
 * Duplicate work is prevented: one in-flight evaluation per match and one
 * in-flight verification sweep per process, plus per-match back-off.
 */
import "server-only";
import { fetchSummary } from "@/lib/espn";
import { normalizeSummary } from "@/lib/normalize";
import type { Match, MatchDetails } from "@/lib/types";
import { evaluateCategories, outcomeOfScore } from "./evaluate";
import {
  listLedgerIds,
  readEvaluation,
  readLedger,
  writeEvaluation,
} from "./store";
import {
  RULES_VERSION,
  type ActualEvent,
  type ActualResult,
  type EvaluationRecord,
  type FixtureMeta,
  type LedgerRecord,
  type VoidReason,
} from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const GIVE_UP_AFTER_MS = 21 * 24 * HOUR;
const EXTRA_TIME = /\baet\b|a\.e\.t|extra time|penalt|\bpens?\b|shootout/i;
const ABANDONED = /abandon|suspend|interrupt/i;

function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return parseScore(record.displayValue ?? record.value);
  }
  return null;
}

interface RawCompetitor {
  homeAway?: string;
  score?: unknown;
}

function finalScoreOf(raw: unknown, match: Match): { home: number; away: number } | null {
  const header = (raw as { header?: { competitions?: Array<{ competitors?: RawCompetitor[] }> } } | null)?.header;
  const competitors: RawCompetitor[] = header?.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((c) => c?.homeAway === "home");
  const away = competitors.find((c) => c?.homeAway === "away");
  const hs = parseScore(home?.score ?? match.home.score);
  const as = parseScore(away?.score ?? match.away.score);
  return hs === null || as === null ? null : { home: hs, away: as };
}

/** Card totals from the provider's published match statistics, or null (never 0). */
function cardTotal(
  details: MatchDetails,
  kind: "yellow" | "red",
): { home: number; away: number; total: number } | null {
  const row = details.stats.find((stat) => {
    const name = stat.name.toLowerCase();
    const label = stat.label.toLowerCase();
    return kind === "yellow"
      ? name === "yellowcards" || label.includes("yellow card")
      : name === "redcards" || label.includes("red card");
  });
  if (!row) return null;
  if (!Number.isFinite(row.homeValue) || !Number.isFinite(row.awayValue)) return null;
  return {
    home: row.homeValue,
    away: row.awayValue,
    total: row.homeValue + row.awayValue,
  };
}

function eventsOf(details: MatchDetails): ActualEvent[] {
  const { home, away } = details.match;
  const out: ActualEvent[] = [];
  for (const event of details.events) {
    if (
      event.type !== "goal" &&
      event.type !== "own-goal" &&
      event.type !== "penalty" &&
      event.type !== "yellow" &&
      event.type !== "red"
    ) {
      continue;
    }
    const teamId = event.team?.id;
    out.push({
      minute: event.minute,
      type: event.type,
      side: teamId === home.id ? "home" : teamId === away.id ? "away" : null,
      player: event.player,
    });
  }
  return out.slice(0, 40);
}

function fixtureMeta(ledger: LedgerRecord, match: Match): FixtureMeta {
  return {
    homeId: match.home.id,
    homeName: match.home.name,
    homeLogo: match.home.logo,
    awayId: match.away.id,
    awayName: match.away.name,
    awayLogo: match.away.logo,
    competition: match.league?.name ?? match.competition.name,
    competitionSlug: match.league?.slug ?? match.competition.slug,
    season: match.season ?? ledger.fixture?.season,
    round: match.round ?? ledger.fixture?.round,
    kickoff: match.date || ledger.fixture?.kickoff || "",
  };
}

function backoff(attempts: number, now: number): string {
  const minutes = Math.min(360, 15 * 2 ** Math.min(attempts, 5));
  return new Date(now + minutes * MINUTE).toISOString();
}

/** Pure decision: ledger + provider details -> evaluation record. */
export function buildEvaluation(
  ledger: LedgerRecord,
  details: MatchDetails | null,
  raw: unknown,
  previous: EvaluationRecord | null,
  now = Date.now(),
): EvaluationRecord {
  const attempts = (previous?.attempts ?? 0) + 1;
  const base = {
    version: 1 as const,
    matchId: ledger.matchId,
    checkedAt: new Date(now).toISOString(),
    attempts,
    rulesVersion: RULES_VERSION,
  };
  const pending = (fixture?: FixtureMeta, kickoffMs?: number): EvaluationRecord => ({
    ...base,
    status: "pending",
    fixture,
    nextCheckAt:
      kickoffMs && kickoffMs + 2 * HOUR > now
        ? new Date(kickoffMs + 2 * HOUR).toISOString()
        : backoff(attempts, now),
  });
  const voided = (reason: VoidReason, fixture?: FixtureMeta): EvaluationRecord => ({
    ...base,
    status: "void",
    voidReason: reason,
    fixture,
  });

  if (!details) return pending(previous?.fixture);

  const match = details.match;
  const fixture = fixtureMeta(ledger, match);
  const kickoffMs = Date.parse(match.date);
  const statusText = `${match.statusLabel} ${match.statusDetail}`;

  if (match.state === "postponed") return voided("postponed", fixture);
  if (match.state === "canceled") return voided("canceled", fixture);
  if (ABANDONED.test(statusText)) return voided("abandoned", fixture);

  if (match.state !== "finished") {
    if (Number.isFinite(kickoffMs) && now - kickoffMs > GIVE_UP_AFTER_MS) {
      return voided("no_result_published", fixture);
    }
    return pending(fixture, Number.isFinite(kickoffMs) ? kickoffMs : undefined);
  }

  // Finished from here on.
  const generated = Date.parse(ledger.generatedAt);
  if (!Number.isFinite(kickoffMs) || !Number.isFinite(generated)) {
    return pending(fixture);
  }
  if (generated >= kickoffMs) return voided("created_after_kickoff", fixture);
  if (EXTRA_TIME.test(statusText)) return voided("extra_time", fixture);

  const score = finalScoreOf(raw, match);
  if (!score) {
    // Finished but no official score yet: pending verification, never zero.
    if (now - kickoffMs > GIVE_UP_AFTER_MS) return voided("no_result_published", fixture);
    return pending(fixture);
  }

  const actual: ActualResult = {
    finalScore: score,
    totalGoals: score.home + score.away,
    outcome: outcomeOfScore(score.home, score.away),
    bothScored: score.home > 0 && score.away > 0,
    yellow: cardTotal(details, "yellow"),
    red: cardTotal(details, "red"),
    events: eventsOf(details),
  };

  return {
    ...base,
    status: "evaluated",
    fixture,
    actual,
    categories: evaluateCategories(ledger.picks, actual),
    evaluatedAt: new Date(now).toISOString(),
  };
}

const evaluating = new Map<string, Promise<EvaluationRecord | null>>();

/** Verify one match (de-duplicated per match). */
export function verifyMatch(
  matchId: string,
  options: { force?: boolean } = {},
): Promise<EvaluationRecord | null> {
  const running = evaluating.get(matchId);
  if (running) return running;

  const task = (async () => {
    const ledger = await readLedger(matchId);
    if (!ledger) return null;
    const previous = await readEvaluation(matchId);
    if (
      previous &&
      !options.force &&
      (previous.status === "void" ||
        (previous.status === "evaluated" && previous.rulesVersion === RULES_VERSION))
    ) {
      return previous;
    }

    let details: MatchDetails | null = null;
    let raw: unknown = null;
    try {
      raw = await fetchSummary(matchId);
      details = normalizeSummary(raw, matchId);
    } catch (error) {
      console.error(`[predictions] summary ${matchId} failed:`, (error as Error)?.message);
    }
    const next = buildEvaluation(ledger, details, raw, previous);
    await writeEvaluation(next);
    return next;
  })().finally(() => {
    evaluating.delete(matchId);
  });

  evaluating.set(matchId, task);
  return task;
}

export interface VerifySweep {
  checked: number;
  evaluated: number;
  pending: number;
  voided: number;
}

let sweeping: Promise<VerifySweep> | null = null;

/** Verify matches that are due. One sweep at a time per process. */
export function verifyDue(
  options: { max?: number; budgetMs?: number } = {},
): Promise<VerifySweep> {
  if (sweeping) return sweeping;
  const max = options.max ?? 12;
  const budgetMs = options.budgetMs ?? 25_000;

  sweeping = (async () => {
    const started = Date.now();
    const result: VerifySweep = { checked: 0, evaluated: 0, pending: 0, voided: 0 };
    const due: Array<{ id: string; generatedAt: string }> = [];

    for (const id of await listLedgerIds()) {
      const evaluation = await readEvaluation(id);
      if (evaluation && (evaluation.status === "void" ||
        (evaluation.status === "evaluated" && evaluation.rulesVersion === RULES_VERSION))) {
        continue;
      }
      if (evaluation?.nextCheckAt && Date.parse(evaluation.nextCheckAt) > Date.now()) continue;
      const ledger = await readLedger(id);
      if (!ledger) continue;
      const kickoff = Date.parse(ledger.fixture?.kickoff ?? "");
      // A known future kickoff has nothing to verify yet.
      if (Number.isFinite(kickoff) && kickoff + 2 * HOUR > Date.now()) continue;
      due.push({ id, generatedAt: ledger.generatedAt });
    }

    due.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
    for (const item of due.slice(0, max)) {
      if (Date.now() - started > budgetMs) break;
      const evaluation = await verifyMatch(item.id);
      result.checked += 1;
      if (evaluation?.status === "evaluated") result.evaluated += 1;
      else if (evaluation?.status === "void") result.voided += 1;
      else result.pending += 1;
    }
    return result;
  })().finally(() => {
    sweeping = null;
  });
  return sweeping;
}
