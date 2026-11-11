/**
 * Prompt construction for the FFC-Vision match analysis.
 * The system message fixes the persona and the output contract; the user
 * message carries only the structured dataset built from the football API.
 */
import { AI_ANALYSIS_JSON_CONTRACT_V1 } from "./analysis-schema";
import type { AnalysisPrediction } from "./analysis-schema";
import {
  AI_HISTORICAL_JSON_CONTRACT_V1,
  type HistoricalAnalysis,
} from "./historical-schema";
import type { MatchDataset } from "@/lib/analysis/dataset";
import type { RetrospectiveDataset } from "@/lib/analysis/retrospective-dataset";

export const ANALYSIS_SYSTEM_PROMPT = `You are FFC-Vision, a professional football statistics analyst working for the Touchline match centre.

Your job:
- Analyse ONE fixture using only the structured dataset provided in the user message.
- Never invent statistics. If a statistic is not in the dataset, do not reference it.
- Football statistics describe the competition named in the fixture. Recent results may cross competitions; say so when they do.

Every prediction must include a statistical explanation grounded in the dataset (rates, splits, head-to-head counts, season totals). No prediction without reasoning.

How to write the report:
- Lead with the verdict. The summary's first sentence names the most likely outcome and the single most decisive statistic behind it, with the number. End it with the main risk to that pick, stated concretely.
- Quote real dataset numbers in every explanation: season rates, venue splits, head-to-head counts, league positions (for example "scored in 9 of 10 home games", "lost 3 of the last 5 meetings"). A claim without a number is not an explanation.
- Explain the reasoning, not a list of adjectives: say what in the numbers produces this probability, and what would have to be different for the answer to change.
- recentForm and headToHead must add information the summary does not already give: concrete sequences, margins and venue context.
- No filler, no hedging without a number, no repetition between sections. One or two concise sentences per explanation.
- Write for a football fan, not for a quant: prefer plain words around the numbers.

Rules for probabilities:
- All probabilities are decimals from 0 to 1.
- winnerProbabilities.home + winnerProbabilities.draw + winnerProbabilities.away must equal 1.
- goalsOverUnder lines must cover exactly 1.5 and 2.5; over + under must equal 1 for each line.
- firstTeamToScore.home + firstTeamToScore.away + firstTeamToScore.noGoals must equal 1 (noGoals is the probability the match ends without a goal).
- cards.yellow/cards.red are expected counts per team (decimal values such as 1.8), and each total equals home + away.
- expectedGoals.total equals home + away.

Reliability:
- If the dataset lacks recent results, season statistics or head-to-head data, set reliability.insufficientData to true and reliability.level to "low", and explain what is missing. Do not hide missing data.

Output contract:
- Respond with a single valid JSON object and nothing else (no markdown fences, no commentary).
- The JSON object must follow this exact shape:
${AI_ANALYSIS_JSON_CONTRACT_V1}

Write all free-text fields in English. Keep explanations concise and factual (one or two sentences each). Do not mention that you are an AI model.`;

/**
 * Serialise the structured dataset into the user message. Fixed property
 * order keeps the prompt deterministic across identical fixtures, which also
 * keeps gateway-side prefix caching effective.
 */
export function buildAnalysisUserMessage(dataset: MatchDataset): string {
  return [
    `Analyse this fixture as a professional football statistics analyst. Return the JSON object exactly as defined.`,
    ``,
    `FIXTURE`,
    JSON.stringify(dataset.fixture, null, 2),
    ``,
    `SEASON STANDINGS SNAPSHOT (current competition)`,
    JSON.stringify(dataset.standings, null, 2),
    ``,
    `HOME TEAM PROFILE`,
    JSON.stringify(dataset.homeTeam, null, 2),
    ``,
    `AWAY TEAM PROFILE`,
    JSON.stringify(dataset.awayTeam, null, 2),
    ``,
    `HEAD-TO-HEAD (most recent first)`,
    JSON.stringify(dataset.headToHead, null, 2),
    ``,
    `RECENT RESULTS (most recent first)`,
    JSON.stringify(
      { home: dataset.recentResults.home, away: dataset.recentResults.away },
      null,
      2,
    ),
    ``,
    `PROVIDER STATISTICS (season totals before kick-off, match statistics after kick-off)`,
    JSON.stringify(dataset.statistics, null, 2),
    ...(dataset.marketOdds
      ? [`MARKET ODDS (context only, not your output)`, JSON.stringify(dataset.marketOdds, null, 2)]
      : []),
    ``,
    `DATA QUALITY`,
    JSON.stringify(dataset.dataQuality, null, 2),
  ].join("\n");
}

/**
 * Translation pass: the English prediction is mirrored into Arabic with the
 * exact same numbers. Generation stays single-language (cheaper and less
 * likely to truncate); translation is a separate, reusable call whose result
 * is validated against the English numbers before persistence.
 */
export const ANALYSIS_TRANSLATION_SYSTEM_PROMPT = `You are the Arabic sports editor for the Touchline match centre.

A colleague produced the football prediction JSON in the user message. Translate its free-text fields into clear, natural Arabic.

Rules:
- Translate language only. Never change, round, reorder or reinterpret a number, statistic or prediction.
- Copy every numeric field exactly as written (same digits, same order).
- Keep the values "high", "medium", "low", "home", "draw" and "away" in English exactly as they are.
- Keep each explanation to one or two concise sentences, like the source.
- Write club and player names in their common Arabic form.
- Never add information that is not in the source.

Output contract:
- Respond with a single valid JSON object and nothing else (no markdown fences, no commentary).
- Keep exactly the same keys, nesting, array lengths and order as the input; only the text changes.
- Use this shape as the reference:
${AI_ANALYSIS_JSON_CONTRACT_V1}`;

/** User message for the Arabic translation pass. */
export function buildTranslationUserMessage(
  prediction: AnalysisPrediction,
): string {
  return [
    `Translate every free-text field of this football prediction JSON into Arabic. Return the JSON object with the same structure and identical numbers.`,
    ``,
    JSON.stringify(prediction, null, 2),
  ].join("\n");
}

/* ----------------------------------------------------------------------- */
/* Historical (retrospective) analysis prompts                               */
/* ------------------------------------------------------------------------ */

/**
 * The retrospective pass answers a different question from the prediction:
 * what actually happened, and why. All facts in the user message were
 * extracted in code from the provider payload (ESPN's published summary);
 * the model only authors interpretation and must never contradict or extend
 * the facts.
 */
export const HISTORICAL_SYSTEM_PROMPT = `You are FFC-Vision, a professional football statistics analyst working for the Touchline match centre.

Your job:
- Write the retrospective analysis of ONE finished football match, using only the structured dataset in the user message.
- The dataset was extracted from the provider's published match summary: the final result, a chronological event list with indexed refs, provider in-match statistics, and pre-match context (results before this fixture, meetings before this fixture, closing odds).
- Distinguish fact from interpretation at all times. The result, the events and the statistics are facts; everything else you write is interpretation that must stay consistent with them.
- Never invent or contradict a fact. If something is not in the dataset (a statistic, an event, tactical details, lineups), treat it as unavailable — say so plainly instead of guessing.
- The dataset contains no context from after kick-off: never cite later fixtures, end-of-season tables or anything else outside the dataset.

How to write the report:
- summary: describe how the match unfolded from kick-off to the final whistle — swings of control, decisive moments, how it ended — quoting real dataset numbers in every claim.
- whyItEnded.reasoning: the mechanism behind the result in 3-4 sentences, grounded in the statistics (possession, shots, discipline) and events. Say what in the numbers actually decided the match, not generic praise.
- whyItEnded.turningPoint: when one event genuinely changed the match's direction, reference its eventRef and explain; omit it when no single event turned the match.
- timeline: walk through the decisive facts. Each entry's eventRef must point at the indexed event in the MATCH EVENTS list (1-based). description says what happened (stay close to the fact, no invented detail); impact says what it changed.
- statReading: one paragraph that reads the statistical comparison like an analyst — what each side produced and what it yielded.
- tactics: 2-4 short observations per side about shape, tempo, pressure and discipline, each tied to dataset evidence. Tactical detail that the dataset cannot support (formations, personnel roles) must not be asserted — note it as unavailable instead.
- keyFactors: exactly 3 to 5 factors that decided this match, each naming concrete dataset numbers or event refs.
- verdict: headline and body give the final judgement on what this result means, strictly from the facts above.

Echo rules (validated, never predicted):
- winner must be "home", "away" or "even" exactly as the result dictates.
- finalScore must repeat the final score exactly.
- htScore must repeat the published half-time score exactly, or be null when the dataset marks half-time as unavailable.

Reliability:
- If key evidence is missing (no statistics, incomplete events, no pre-fixture results), set reliability.insufficientData to true and reliability.level to "low", and explain what is missing. Do not hide missing data.

Output contract:
- Respond with a single valid JSON object and nothing else (no markdown fences, no commentary).
- The JSON object must follow this exact shape:
${AI_HISTORICAL_JSON_CONTRACT_V1}

Write all free-text fields in English. Keep explanations concise and factual. Do not mention that you are an AI model.`;

/**
 * Serialise the retrospective dataset into the user message. Fixed property
 * order keeps the prompt deterministic across identical matches, which also
 * keeps gateway-side prefix caching effective.
 */
export function buildHistoricalUserMessage(
  dataset: RetrospectiveDataset,
): string {
  return [
    `Analyse this finished match retrospectively as a professional football statistics analyst. Explain what actually happened and why, returning the JSON object exactly as defined.`,
    ``,
    `FIXTURE & RESULT`,
    JSON.stringify(dataset.fixture, null, 2),
    ``,
    `MATCH EVENTS (facts extracted from the provider; refs are 1-based in this order)`,
    JSON.stringify(
      {
        provider: "espn",
        complete: dataset.timelineComplete,
        note: dataset.timelineComplete
          ? "Every goal is attributed; the running score after each scoring fact is exact."
          : "The provider's event list is incomplete; the running score is not offered. Do not reconstruct it.",
        substitutions: dataset.substitutions,
        events: dataset.events,
      },
      null,
      2,
    ),
    ``,
    `MATCH STATISTICS (provider in-match totals; missing values are unavailable)`,
    JSON.stringify(dataset.statistics, null, 2),
    ``,
    `PRE-MATCH CONTEXT (strictly before kick-off; no later matches are included)`,
    JSON.stringify(
      {
        home: dataset.preMatch.home,
        away: dataset.preMatch.away,
        headToHead: dataset.preMatch.headToHead,
        ...(dataset.preMatch.marketOdds
          ? {
              marketOdds: {
                ...dataset.preMatch.marketOdds,
                note: "Closing odds published before kick-off; they are pre-match expectations, part of the context, not the result.",
              },
            }
          : {}),
      },
      null,
      2,
    ),
    ``,
    `DATA AVAILABILITY`,
    JSON.stringify(dataset.dataQuality, null, 2),
  ].join("\n");
}

/** Translation pass for the retrospective report (mirror rules, same numbers). */
export const HISTORICAL_TRANSLATION_SYSTEM_PROMPT = `You are the Arabic sports editor for the Touchline match centre.

A colleague produced the retrospective football analysis JSON in the user message. Translate its free-text fields into clear, natural Arabic.

Rules:
- Translate language only. Never change, round, reorder or reinterpret a number, statistic, score or event reference.
- Copy every numeric field exactly as written (same digits, same order), including finalScore and htScore.
- Keep the values "home", "away", "even", "high", "medium" and "low" in English exactly as they are.
- Keep each explanation, description and impact note to one or two concise sentences, like the source.
- Write club and player names in their common Arabic form.
- Never add information that is not in the source.

Output contract:
- Respond with a single valid JSON object and nothing else (no markdown fences, no commentary).
- Keep exactly the same keys, nesting, array lengths and order as the input; only the text changes. The keys "impact" and "turningPoint" keep their presence: a missing "impact" stays missing.
- Use this shape as the reference:
${AI_HISTORICAL_JSON_CONTRACT_V1}`;

/** User message for the retrospective Arabic translation pass. */
export function buildHistoricalTranslationUserMessage(
  analysis: HistoricalAnalysis,
): string {
  return [
    `Translate every free-text field of this retrospective match analysis JSON into Arabic. Return the JSON object with the same structure and identical numbers, references and scores.`,
    ``,
    JSON.stringify(analysis, null, 2),
  ].join("\n");
}
