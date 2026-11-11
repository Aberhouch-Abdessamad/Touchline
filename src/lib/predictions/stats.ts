/**
 * Aggregate statistics for the AI Predictions League.
 *
 * Everything is computed from stored ledger + evaluation documents; nothing is
 * estimated or invented. Principles enforced here:
 *  - accuracy = correct / evaluated, where "evaluated" excludes pending and
 *    void (cancelled, abandoned, unverifiable) predictions;
 *  - every prediction category is scored on its own, never pooled;
 *  - nothing is ranked or highlighted below a minimum sample size.
 */
import "server-only";
import { getLeague } from "@/data/leagues";
import { headlineVerdict, marketTally } from "./evaluate";
import { loadEntries, loadEntry } from "./store";
import type {
  CategoryKey,
  Entry,
  Outcome,
  PredictionStatus,
} from "./types";

/** Competition rows appear in the leaderboard from this many evaluated predictions. */
export const MIN_COMPETITION_SAMPLE = 10;
/** A leader (best competition / category) is only highlighted from this many. */
export const MIN_LEADER_SAMPLE = 20;
/** A category's accuracy is flagged "reliable" from this many. */
export const MIN_CATEGORY_SAMPLE = 20;
/** The best-period highlight needs this many evaluated matches in the month. */
export const MIN_PERIOD_SAMPLE = 10;

export const BREAKDOWN_KEYS: CategoryKey[] = [
  "winner",
  "draw",
  "exactScore",
  "over15",
  "over25",
  "btts",
  "yellowCards",
  "redCards",
];

export interface StatsFilter {
  competition?: string;
  season?: number;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  /** Metric used to rank competitions; defaults to the 1X2 result. */
  category?: CategoryKey;
}

/* ---- entry helpers ------------------------------------------------------ */

interface FixtureView {
  homeId: string;
  homeName: string;
  homeLogo?: string;
  awayId: string;
  awayName: string;
  awayLogo?: string;
  competition: string;
  competitionSlug?: string;
  season?: number;
  round?: string;
  kickoff: string;
}

function fixtureOf(entry: Entry): FixtureView | null {
  return entry.evaluation?.fixture ?? entry.ledger.fixture ?? null;
}

export function teamLogo(id: string, explicit?: string): string | undefined {
  if (explicit) return explicit;
  return id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png` : undefined;
}

function statusOf(entry: Entry): PredictionStatus {
  const evaluation = entry.evaluation;
  if (!evaluation) return "pending";
  if (evaluation.status === "void") return "void";
  if (evaluation.status === "evaluated") {
    return headlineVerdict(evaluation.categories) ?? "pending";
  }
  return "pending";
}

function dayOf(entry: Entry): string {
  const kickoff = fixtureOf(entry)?.kickoff;
  const date = kickoff && !Number.isNaN(Date.parse(kickoff)) ? kickoff : entry.ledger.generatedAt;
  return new Date(date).toISOString().slice(0, 10);
}

function timeOf(entry: Entry): number {
  const kickoff = fixtureOf(entry)?.kickoff;
  const parsed = kickoff ? Date.parse(kickoff) : NaN;
  return Number.isNaN(parsed) ? Date.parse(entry.ledger.generatedAt) : parsed;
}

function applyFilter(entries: Entry[], filter: StatsFilter): Entry[] {
  return entries.filter((entry) => {
    const fixture = fixtureOf(entry);
    if (filter.competition && fixture?.competitionSlug !== filter.competition) return false;
    if (filter.season && fixture?.season !== filter.season) return false;
    const day = dayOf(entry);
    if (filter.from && day < filter.from) return false;
    if (filter.to && day > filter.to) return false;
    return true;
  });
}

interface Tally {
  evaluated: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
}

function tally(entries: Entry[], key: CategoryKey): Tally {
  let correct = 0;
  let incorrect = 0;
  for (const entry of entries) {
    const verdict = entry.evaluation?.categories?.[key]?.verdict;
    if (verdict === "correct") correct += 1;
    else if (verdict === "incorrect") incorrect += 1;
  }
  const evaluated = correct + incorrect;
  return { evaluated, correct, incorrect, accuracy: evaluated ? correct / evaluated : null };
}

const pct = (value: number | null) => (value === null ? null : value * 100);

/* ---- result shapes ------------------------------------------------------- */

export interface Overview {
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  /** Void predictions (cancelled, abandoned, extra time, unverifiable). Not in `total`. */
  excluded: number;
  evaluated: number;
  overallAccuracy: number | null;
  exactScoreAccuracy: number | null;
  winnerAccuracy: number | null;
  exactScoreEvaluated: number;
  winnerEvaluated: number;
}

export interface CategoryRow extends Tally {
  key: CategoryKey;
  unavailable: number;
  reliable: boolean;
  /** Mean absolute error for numeric expectations (cards), when evaluated. */
  meanAbsoluteError: number | null;
}

export interface CompetitionRow {
  slug: string;
  name: string;
  logo: string | null;
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  evaluated: number;
  accuracy: number | null;
  exactScoreAccuracy: number | null;
  bestCategory: { key: CategoryKey; accuracy: number; evaluated: number } | null;
  reliable: boolean;
}

export interface TimelinePoint {
  date: string;
  evaluated: number;
  correct: number;
  cumulativeEvaluated: number;
  cumulativeAccuracy: number;
}

export interface CalibrationBin {
  label: string;
  min: number;
  max: number;
  count: number;
  accuracy: number | null;
  meanConfidence: number | null;
  brier: number | null;
}

export interface Highlights {
  bestCompetition: { slug: string; name: string; accuracy: number; evaluated: number } | null;
  bestCategory: { key: CategoryKey; accuracy: number; evaluated: number } | null;
  bestPeriod: { month: string; accuracy: number; evaluated: number } | null;
  longestStreak: number;
  currentStreak: { type: "correct" | "incorrect"; length: number } | null;
  totalEvaluated: number;
  thresholds: { leader: number; period: number };
}

export interface Summary {
  generatedAt: string;
  overview: Overview;
  categories: CategoryRow[];
  competitions: CompetitionRow[];
  hiddenCompetitions: number;
  timeline: TimelinePoint[];
  calibration: {
    bins: CalibrationBin[];
    outcomeBrier: number | null;
    bttsBrier: number | null;
    over25Brier: number | null;
    sample: number;
    /** Brier score of always answering 1/3-1/3-1/3. */
    outcomeBaseline: number;
  };
  highlights: Highlights;
  options: {
    competitions: Array<{ slug: string; name: string; count: number }>;
    seasons: number[];
  };
  thresholds: { competition: number; leader: number; category: number };
}

/* ---- builders ------------------------------------------------------------ */

function overviewOf(entries: Entry[]): Overview {
  let correct = 0;
  let incorrect = 0;
  let pending = 0;
  let excluded = 0;
  for (const entry of entries) {
    const status = statusOf(entry);
    if (status === "correct") correct += 1;
    else if (status === "incorrect") incorrect += 1;
    else if (status === "pending") pending += 1;
    else excluded += 1;
  }
  const evaluated = correct + incorrect;
  const exact = tally(entries, "exactScore");
  const winner = tally(entries, "winner");
  return {
    total: correct + incorrect + pending,
    correct,
    incorrect,
    pending,
    excluded,
    evaluated,
    overallAccuracy: pct(evaluated ? correct / evaluated : null),
    exactScoreAccuracy: pct(exact.accuracy),
    winnerAccuracy: pct(winner.accuracy),
    exactScoreEvaluated: exact.evaluated,
    winnerEvaluated: winner.evaluated,
  };
}

function categoryRows(entries: Entry[]): CategoryRow[] {
  return BREAKDOWN_KEYS.map((key) => {
    const t = tally(entries, key);
    let unavailable = 0;
    let errorSum = 0;
    let errorCount = 0;
    for (const entry of entries) {
      const result = entry.evaluation?.categories?.[key];
      if (result?.verdict === "unavailable") unavailable += 1;
      if (
        (key === "yellowCards" || key === "redCards") &&
        typeof result?.error === "number" &&
        (result.verdict === "correct" || result.verdict === "incorrect")
      ) {
        errorSum += result.error;
        errorCount += 1;
      }
    }
    return {
      key,
      ...t,
      accuracy: pct(t.accuracy),
      unavailable,
      reliable: t.evaluated >= MIN_CATEGORY_SAMPLE,
      meanAbsoluteError: errorCount ? errorSum / errorCount : null,
    };
  });
}

function competitionRows(
  entries: Entry[],
  metric: CategoryKey,
): { rows: CompetitionRow[]; hidden: number } {
  const groups = new Map<string, { name: string; entries: Entry[] }>();
  for (const entry of entries) {
    const fixture = fixtureOf(entry);
    const slug = fixture?.competitionSlug;
    if (!slug) continue;
    const group = groups.get(slug) ?? { name: fixture?.competition ?? slug, entries: [] };
    group.entries.push(entry);
    groups.set(slug, group);
  }

  const rows: CompetitionRow[] = [];
  let hidden = 0;
  for (const [slug, group] of groups) {
    const ov = overviewOf(group.entries);
    const metricTally = tally(group.entries, metric);
    if (metricTally.evaluated < MIN_COMPETITION_SAMPLE) {
      hidden += 1;
      continue;
    }
    let best: CompetitionRow["bestCategory"] = null;
    for (const key of BREAKDOWN_KEYS) {
      const t = tally(group.entries, key);
      if (t.evaluated < MIN_CATEGORY_SAMPLE / 2 || t.accuracy === null) continue;
      if (!best || t.accuracy * 100 > best.accuracy) {
        best = { key, accuracy: t.accuracy * 100, evaluated: t.evaluated };
      }
    }
    rows.push({
      slug,
      name: group.name,
      logo: getLeague(slug)?.logo ?? null,
      total: ov.total,
      correct: metricTally.correct,
      incorrect: metricTally.incorrect,
      pending: ov.pending,
      evaluated: metricTally.evaluated,
      accuracy: pct(metricTally.accuracy),
      exactScoreAccuracy: ov.exactScoreAccuracy,
      bestCategory: best,
      reliable: metricTally.evaluated >= MIN_LEADER_SAMPLE,
    });
  }
  rows.sort(
    (a, b) =>
      Number(b.reliable) - Number(a.reliable) ||
      (b.accuracy ?? 0) - (a.accuracy ?? 0) ||
      b.evaluated - a.evaluated,
  );
  return { rows, hidden };
}

function evaluatedChronological(entries: Entry[]): Entry[] {
  return entries
    .filter((entry) => statusOf(entry) === "correct" || statusOf(entry) === "incorrect")
    .sort((a, b) => timeOf(a) - timeOf(b));
}

function timelineOf(chronological: Entry[]): TimelinePoint[] {
  const days = new Map<string, { evaluated: number; correct: number }>();
  for (const entry of chronological) {
    const day = dayOf(entry);
    const slot = days.get(day) ?? { evaluated: 0, correct: 0 };
    slot.evaluated += 1;
    if (statusOf(entry) === "correct") slot.correct += 1;
    days.set(day, slot);
  }
  let cumulativeEvaluated = 0;
  let cumulativeCorrect = 0;
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slot]) => {
      cumulativeEvaluated += slot.evaluated;
      cumulativeCorrect += slot.correct;
      return {
        date,
        evaluated: slot.evaluated,
        correct: slot.correct,
        cumulativeEvaluated,
        cumulativeAccuracy: (cumulativeCorrect / cumulativeEvaluated) * 100,
      };
    });
}

const BIN_EDGES: Array<[number, number, string]> = [
  [0, 0.4, "<40%"],
  [0.4, 0.6, "40–60%"],
  [0.6, 0.8, "60–80%"],
  [0.8, 0.9, "80–90%"],
  [0.9, 1.0001, "90%+"],
];

function brierOutcome(entry: Entry): number | null {
  const actual = entry.evaluation?.actual?.outcome;
  if (!actual) return null;
  const p = entry.ledger.picks.probabilities;
  const o = (k: Outcome) => (k === actual ? 1 : 0);
  return (
    (p.home - o("home")) ** 2 + (p.draw - o("draw")) ** 2 + (p.away - o("away")) ** 2
  );
}

function calibrationOf(chronological: Entry[]): Summary["calibration"] {
  const bins: CalibrationBin[] = BIN_EDGES.map(([min, max, label]) => ({
    label,
    min,
    max,
    count: 0,
    accuracy: null,
    meanConfidence: null,
    brier: null,
  }));
  const acc = bins.map(() => ({ correct: 0, conf: 0, brier: 0 }));
  let brierSum = 0;
  let sample = 0;
  let bttsSum = 0;
  let bttsN = 0;
  let overSum = 0;
  let overN = 0;

  for (const entry of chronological) {
    const picks = entry.ledger.picks;
    const confidence = picks.probabilities[picks.outcome];
    const brier = brierOutcome(entry);
    if (brier === null) continue;
    sample += 1;
    brierSum += brier;
    const index = bins.findIndex((bin) => confidence >= bin.min && confidence < bin.max);
    if (index >= 0) {
      bins[index].count += 1;
      acc[index].conf += confidence;
      acc[index].brier += brier;
      if (statusOf(entry) === "correct") acc[index].correct += 1;
    }
    const actual = entry.evaluation?.actual;
    if (actual) {
      bttsSum += (picks.bttsProbability - (actual.bothScored ? 1 : 0)) ** 2;
      bttsN += 1;
      if (picks.over25 !== null) {
        overSum += (picks.overProbabilities.over25 - (actual.totalGoals > 2.5 ? 1 : 0)) ** 2;
        overN += 1;
      }
    }
  }
  bins.forEach((bin, i) => {
    if (bin.count === 0) return;
    bin.accuracy = (acc[i].correct / bin.count) * 100;
    bin.meanConfidence = (acc[i].conf / bin.count) * 100;
    bin.brier = acc[i].brier / bin.count;
  });
  return {
    bins,
    outcomeBrier: sample ? brierSum / sample : null,
    bttsBrier: bttsN ? bttsSum / bttsN : null,
    over25Brier: overN ? overSum / overN : null,
    sample,
    outcomeBaseline: 2 / 3,
  };
}

function highlightsOf(
  chronological: Entry[],
  competitions: CompetitionRow[],
  categories: CategoryRow[],
): Highlights {
  const reliableComps = competitions.filter((row) => row.evaluated >= MIN_LEADER_SAMPLE);
  const bestCompetition = reliableComps
    .slice()
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];
  const bestCategory = categories
    .filter((row) => row.evaluated >= MIN_LEADER_SAMPLE && row.accuracy !== null)
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0];

  const months = new Map<string, { evaluated: number; correct: number }>();
  let longest = 0;
  let run = 0;
  for (const entry of chronological) {
    const month = dayOf(entry).slice(0, 7);
    const slot = months.get(month) ?? { evaluated: 0, correct: 0 };
    slot.evaluated += 1;
    if (statusOf(entry) === "correct") {
      slot.correct += 1;
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
    months.set(month, slot);
  }
  const bestMonth = [...months.entries()]
    .filter(([, slot]) => slot.evaluated >= MIN_PERIOD_SAMPLE)
    .map(([month, slot]) => ({
      month,
      accuracy: (slot.correct / slot.evaluated) * 100,
      evaluated: slot.evaluated,
    }))
    .sort((a, b) => b.accuracy - a.accuracy)[0];

  let current: Highlights["currentStreak"] = null;
  if (chronological.length) {
    const lastType = statusOf(chronological[chronological.length - 1]) as "correct" | "incorrect";
    let length = 0;
    for (let i = chronological.length - 1; i >= 0; i -= 1) {
      if (statusOf(chronological[i]) !== lastType) break;
      length += 1;
    }
    current = { type: lastType, length };
  }

  return {
    bestCompetition: bestCompetition
      ? {
          slug: bestCompetition.slug,
          name: bestCompetition.name,
          accuracy: bestCompetition.accuracy ?? 0,
          evaluated: bestCompetition.evaluated,
        }
      : null,
    bestCategory: bestCategory
      ? { key: bestCategory.key, accuracy: bestCategory.accuracy ?? 0, evaluated: bestCategory.evaluated }
      : null,
    bestPeriod: bestMonth ?? null,
    longestStreak: longest,
    currentStreak: current,
    totalEvaluated: chronological.length,
    thresholds: { leader: MIN_LEADER_SAMPLE, period: MIN_PERIOD_SAMPLE },
  };
}

/* ---- memoised public API --------------------------------------------------- */

const memo = new WeakMap<Entry[], Map<string, unknown>>();
function memoise<T>(entries: Entry[], key: string, compute: () => T): T {
  let bucket = memo.get(entries);
  if (!bucket) {
    bucket = new Map();
    memo.set(entries, bucket);
  }
  if (bucket.has(key)) return bucket.get(key) as T;
  const value = compute();
  bucket.set(key, value);
  return value;
}

export async function getSummary(filter: StatsFilter = {}): Promise<Summary> {
  const all = await loadEntries();
  return memoise(all, `summary:${JSON.stringify(filter)}`, () => {
    // Options come from the unfiltered archive so filters never hide each other.
    const optionMap = new Map<string, { name: string; count: number }>();
    const seasons = new Set<number>();
    for (const entry of all) {
      const fixture = fixtureOf(entry);
      if (fixture?.competitionSlug) {
        const slot = optionMap.get(fixture.competitionSlug) ?? { name: fixture.competition, count: 0 };
        slot.count += 1;
        optionMap.set(fixture.competitionSlug, slot);
      }
      if (fixture?.season) seasons.add(fixture.season);
    }

    // Competition leaderboard ignores the competition filter itself.
    const forLeaderboard = applyFilter(all, { ...filter, competition: undefined });
    const scoped = applyFilter(all, filter);
    const chronological = evaluatedChronological(scoped);
    const categories = categoryRows(scoped);
    const { rows, hidden } = competitionRows(forLeaderboard, filter.category ?? "outcome");

    return {
      generatedAt: new Date().toISOString(),
      overview: overviewOf(scoped),
      categories,
      competitions: rows,
      hiddenCompetitions: hidden,
      timeline: timelineOf(chronological),
      calibration: calibrationOf(chronological),
      highlights: highlightsOf(
        evaluatedChronological(forLeaderboard),
        competitionRows(forLeaderboard, "outcome").rows,
        categoryRows(forLeaderboard),
      ),
      options: {
        competitions: [...optionMap.entries()]
          .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
          .sort((a, b) => b.count - a.count),
        seasons: [...seasons].sort((a, b) => b - a),
      },
      thresholds: {
        competition: MIN_COMPETITION_SAMPLE,
        leader: MIN_LEADER_SAMPLE,
        category: MIN_CATEGORY_SAMPLE,
      },
    };
  });
}

/* ---- history, calendar, detail --------------------------------------------- */

export interface HistoryFilter extends StatsFilter {
  status?: "all" | "correct" | "incorrect" | "pending";
  page?: number;
  pageSize?: number;
}

export interface HistoryItem {
  matchId: string;
  home: { id: string; name: string; logo?: string };
  away: { id: string; name: string; logo?: string };
  competition: { name: string; slug?: string; logo: string | null };
  kickoff: string | null;
  predictedScore: { home: number; away: number };
  actualScore: { home: number; away: number } | null;
  predictedOutcome: Outcome;
  actualOutcome: Outcome | null;
  status: PredictionStatus;
  voidReason?: string;
  marketsCorrect: number;
  marketsEvaluated: number;
  confidence: number;
}

function itemOf(entry: Entry): HistoryItem {
  const fixture = fixtureOf(entry);
  const picks = entry.ledger.picks;
  const tallyMarkets = marketTally(entry.evaluation?.categories);
  const slug = fixture?.competitionSlug;
  return {
    matchId: entry.ledger.matchId,
    home: {
      id: fixture?.homeId ?? "",
      name: fixture?.homeName ?? "",
      logo: fixture ? teamLogo(fixture.homeId, fixture.homeLogo) : undefined,
    },
    away: {
      id: fixture?.awayId ?? "",
      name: fixture?.awayName ?? "",
      logo: fixture ? teamLogo(fixture.awayId, fixture.awayLogo) : undefined,
    },
    competition: {
      name: fixture?.competition ?? "",
      slug,
      logo: slug ? (getLeague(slug)?.logo ?? null) : null,
    },
    kickoff: fixture?.kickoff && !Number.isNaN(Date.parse(fixture.kickoff)) ? fixture.kickoff : null,
    predictedScore: picks.score,
    actualScore: entry.evaluation?.actual?.finalScore ?? null,
    predictedOutcome: picks.outcome,
    actualOutcome: entry.evaluation?.actual?.outcome ?? null,
    status: statusOf(entry),
    voidReason: entry.evaluation?.voidReason,
    marketsCorrect: tallyMarkets.correct,
    marketsEvaluated: tallyMarkets.evaluated,
    confidence: picks.probabilities[picks.outcome],
  };
}

export async function getHistory(filter: HistoryFilter = {}): Promise<{
  items: HistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}> {
  const all = await loadEntries();
  const pageSize = Math.min(Math.max(filter.pageSize ?? 20, 1), 100);
  const status = filter.status ?? "all";
  const filtered = applyFilter(all, filter)
    // Unresolved backfill entries carry no fixture yet: nothing meaningful to list.
    .filter((entry) => fixtureOf(entry) !== null)
    .filter((entry) => {
      if (status === "all") return true;
      return statusOf(entry) === status;
    })
    .sort((a, b) => timeOf(b) - timeOf(a));
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(filter.page ?? 1, 1), pages);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(itemOf),
    total,
    page,
    pageSize,
    pages,
  };
}

export interface CalendarDay {
  date: string;
  total: number;
  correct: number;
  incorrect: number;
  pending: number;
  accuracy: number | null;
}

export async function getCalendar(month: string, filter: StatsFilter = {}): Promise<CalendarDay[]> {
  const all = applyFilter(await loadEntries(), filter);
  const days = new Map<string, CalendarDay>();
  for (const entry of all) {
    if (!fixtureOf(entry)) continue;
    const date = dayOf(entry);
    if (!date.startsWith(month)) continue;
    const status = statusOf(entry);
    if (status === "void") continue;
    const slot =
      days.get(date) ?? { date, total: 0, correct: 0, incorrect: 0, pending: 0, accuracy: null };
    slot.total += 1;
    if (status === "correct") slot.correct += 1;
    else if (status === "incorrect") slot.incorrect += 1;
    else slot.pending += 1;
    days.set(date, slot);
  }
  return [...days.values()]
    .map((day) => {
      const evaluated = day.correct + day.incorrect;
      return { ...day, accuracy: evaluated ? (day.correct / evaluated) * 100 : null };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDetail(matchId: string) {
  const entry = await loadEntry(matchId);
  if (!entry) return null;
  return {
    item: itemOf(entry),
    ledger: entry.ledger,
    evaluation: entry.evaluation,
  };
}
