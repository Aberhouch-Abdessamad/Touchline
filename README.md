# Touchline

**Football, without the noise.** An independent football data site: live scores, league tables, season fixtures, player leaderboards, FIFA world rankings, match detail, news and calendar exports across 76 competitions.

Touchline is a complete, original Next.js application built on real public sports APIs. It is functionally inspired by the Arabic football site [JDwel](https://jdwel.com/) but shares no code, design, branding or assets with it. The interface is English-first, left-to-right, light-first with a lime accent, and has a full dark mode.

---

## Highlights

- **Real data only.** Every score, table row, ranking and news item comes from a live provider response. Missing data is shown as missing — never invented.
- **76 verified competitions.** Domestic leagues, continental cups, international tournaments, women's competitions and qualifiers, all from a generated catalogue.
- **Matchday front page.** A match-of-the-day spotlight chosen from the day's real fixtures, a dark "The day" panel with live and upcoming scores, and a shortcut ticker.
- **Match centre page.** A dark matchday masthead with the day's tally and a Monday-first week strip, a light live-score board, then a two-column competition board with aligned score columns, sticky filters, group paging and favourites.
- **Full match centre.** Dark scoreboard, key events, statistics, lineups, head-to-head record, form guide and recent meetings in the summary, venue, broadcasters and related coverage where the provider publishes them. Before kick-off, statistics are labelled as season totals.
- **Competition workspace.** Live table, top scorers and assists, and the full season fixture list, with season switching.
- **FIFA rankings.** Official men's and women's world rankings with a leader panel, top-three podium, points bars, rank movement and confederation filters.
- **Calendar that works.** A month masthead with a 12-month strip and fixture stats, a real day grid, a selected-day panel, and month/day `.ics` exports plus Google Calendar and Outlook actions.
- **Browser-local personalisation.** Theme, time zone, favourite teams/competitions/matches, and kick-off reminders. No account, no server-side profile.
- **Honest states.** Loading skeletons, empty states, retry paths and degraded-mode messaging throughout.
- **AI match analysis.** On a match page, Touchline AI reasons over the real ESPN dataset to predict the result, score, goals, cards and first-half markets — every number with an explanation, and a reliability flag when data is thin.
- **AI historical match analysis.** Finished matches get a retrospective instead of a prediction: the factual timeline, in-match statistics and pre-match context are rebuilt from the provider payload in code, and Touchline AI explains why the match ended that way — separating published facts from its own interpretation and never inventing missing data.
- **Public JSON API.** Same-origin routes with validation, normalisation, cache metadata and a documented envelope.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4.3 (App Router, Cache Components) |
| UI | React 19.3, TypeScript, custom CSS |
| Icons | `lucide-react` |
| Fonts | Plus Jakarta Sans Variable, self-hosted via Fontsource |
| Data | ESPN public soccer APIs; FIFA public rankings API |
| AI | Touchline AI (OpenAI-compatible service), server-side only |
| Persistence | `localStorage`; gitignored server-side JSON files for AI analyses |

No database, no authentication service, no analytics SDK and no third-party UI kit.

## Requirements

- Node.js **20.9 or newer** (required by Next.js 16)
- npm (or another package manager)

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

> On Windows PowerShell, if `npm` is blocked by the execution policy, run `cmd /c "npm run dev"` instead.

### Environment variables

Copy `.env.example` to `.env.local` and adjust as needed:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended in production | Canonical origin used for metadata, sitemap, robots and share links. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional | Enables the contact form's `mailto:` action. Without it the contact page explains that no address is configured. |
| `AI_PROVIDER` | Optional | Must be `touchline-ai` (also the default); any other value fails loudly on the server. Internal token only — it is never shown to users. |
| `AI_BASE_URL` | Required for AI analysis | OpenAI-compatible service base URL including the `/v1` segment. Private per deployment; set it in `.env.local`, never in this file. |
| `AI_API_KEY` | Required for AI analysis | Bearer key for the private AI service. Server-only; never logged, never sent to the browser, never returned by any API. Stored analyses stay viewable without it. |
| `AI_MODEL` | Optional | Model id used for analysis. Server-side only: it is never stored, returned or rendered; users only see the public name "Touchline AI". |
| `AI_TIMEOUT_MS` | Optional | Per-request timeout (5,000–120,000). Defaults to 60000. |
| `AI_RETRIES` | Optional | Retries on temporary failures (429/5xx/timeout). Defaults to 2. |
| `AI_MAX_TOKENS` | Optional | Completion budget for one analysis, including hidden reasoning tokens. Defaults to 12000. |
| `AI_TEMPERATURE` | Optional | Sampling temperature. Defaults to 0.2. |
| `AI_RATE_LIMIT_PER_HOUR` | Optional | Generate-calls allowed per client IP per hour. Defaults to 10. |
| `AI_LIVE_MIN_INTERVAL_SECONDS` | Optional | Minimum seconds between two AI captures of the same in-play match (clamped 30–1800). Defaults to 120. |

The football data APIs are public and need no key. The private AI service key is the only credential; it lives in the gitignored `.env.local` and reaches only the server-side analysis pipeline. No API response, page payload or error message ever carries the key, the service address or the model id.

## Routes

### Pages

| Route | What it does |
| --- | --- |
| `/` | Matchday front page: match-of-the-day spotlight, "The day" panel, shortcut ticker, desk, insight cards, competition index and headlines. |
| `/matches?date=YYYY-MM-DD` | Day masthead with date stepper and week strip, live-score board, and fixtures grouped by competition with competition/state/favourite filters, paging and a refresh ticker. |
| `/competitions` | Searchable, filterable directory of all 76 competitions. |
| `/competitions/[slug]?tab=standings&season=YYYY` | Competition table, scorers or fixtures. Tabs are URL-driven. |
| `/match/[id]` | Match centre: scoreboard, AI analysis (prediction before kick-off, retrospective once finished), summary form guide and recent meetings, events, statistics, lineups, form, head-to-head and calendar export. |
| `/match/[id]/live` | Dedicated AI live desk for an in-play match: header, overview, dominance, live probabilities, next goal, momentum chart, insights, tactical reading, events, prediction trajectory and the automatic final report. |
| `/team/[id]?season=YYYY` | Team profile, season schedule and provider-supplied record summaries. |
| `/rankings?gender=men&confederation=UEFA` | FIFA world rankings: leader panel, top-three podium, points bars and movement. |
| `/calendar?month=YYYY-MM&date=YYYY-MM-DD` | Month masthead with 12-month strip and stats, day grid, selected-day panel and `.ics` exports. |
| `/news` | Dark newsroom masthead with stats, leading story, latest-headlines rail and a wire grid; every card links to ESPN in a new tab. |
| `/search?q=` | Local competition search plus upstream team search. |
| `/settings` | Theme, time zone, notifications, favourites, reminders, export/import and reset. |
| `/about`, `/faq`, `/contact`, `/privacy`, `/api-docs` | Project, help, contact, privacy and developer documentation. |

### JSON API

Data routes are read-only (`GET`), documented in-app at `/api-docs`. The AI analysis and live routes also accept `POST` to spend an AI call.

```text
GET /api/matches?date=YYYY-MM-DD
GET /api/matches?month=YYYY-MM
GET /api/leagues?q=&region=&type=&gender=&format=&featured=
GET /api/leagues/[slug]/standings?season=YYYY
GET /api/leagues/[slug]/scorers?season=YYYY
GET /api/leagues/[slug]/fixtures?season=YYYY
GET /api/match/[id]
GET /api/match/[id]/analysis
GET /api/match/[id]/analysis?kind=past
POST /api/match/[id]/analysis?refresh=1
POST /api/match/[id]/analysis?lang=ar
POST /api/match/[id]/analysis?kind=past
POST /api/match/[id]/analysis?kind=past&refresh=1
POST /api/match/[id]/analysis?kind=past&lang=ar
GET /api/match/[id]/live
POST /api/match/[id]/live
POST /api/match/[id]/live?refresh=1
POST /api/match/[id]/live?lang=ar
GET /api/team/[id]?season=YYYY
GET /api/rankings?gender=&confederation=&limit=
GET /api/news?limit=
GET /api/search?q=
GET /api/calendar?date=YYYY-MM-DD | ?month=YYYY-MM
GET /api/health
```

Successful JSON responses use `{ data, meta }`. Failures use `{ error: { message, status, code } }`. The calendar route returns `text/calendar` instead. The analysis routes accept `kind=past` on either method to address the retrospective document of a finished match instead of the pre-match prediction; on the live route `GET` returns every stored capture (and computes the final report once the match is over) while `POST` captures the current in-play state when a real trigger justifies it.

## Data sources and attribution

- **ESPN public soccer APIs** — fixtures, scores, tables, statistics, summaries, teams, search and news.
- **FIFA public API** (`api.fifa.com`) — men's and women's world rankings.
- **Touchline AI** — the only AI analyst, used exclusively to reason over the ESPN dataset; it never fetches data of its own. The assistant is identified to users only as "Touchline AI"; the private service address, key and model id are server-side secrets.
- League metadata in `src/data/leagues.ts` is generated from ESPN's public core API by `scripts/generate-league-catalog.mjs`. It contains names, logos, aliases and classification only; results and tables are always fetched at runtime.

Touchline is an independent project and is not affiliated with ESPN or FIFA. Provider terms and attribution requirements apply to their data. Headlines link to the original publisher; Touchline does not rehost articles.

## Architecture

```text
src/
  app/                 App Router pages, metadata routes and /api handlers
  components/
    layout/            Header, footer, brand mark, theme toggle
    providers/         Preferences and toast contexts
    soccer/            Match rows, explorers, competition cards, news cards, date controls, AI analysis panel
    competitions/      Competition directory explorer
    settings/          Settings panel
    ui/                Primitives, logos, time, countdown, favourites, calendar menu, share
  data/leagues.ts      Generated competition catalogue and lookup helpers
  lib/
    api.ts             High-level loaders shared by pages and API routes
    espn.ts            ESPN URL adapters and cache windows
    fifa.ts            FIFA rankings adapter
    normalize.ts       Provider payload → internal types
    http.ts            Timeout, bounded retry, in-process cache, request de-duplication
    ai/                AI service config, client, schema validation and prompt
    analysis/          Dataset assembly, retrospective facts, file store and get-or-generate pipelines
    types.ts           Shared domain types
    validation.ts      Input validation shared by API routes
    calendar.ts        iCalendar generation
```

**Server first.** Page components call `src/lib/api.ts` on the server. Client components never talk to ESPN directly; interactive features call same-origin `/api/*` routes where an HTTP boundary is useful. Upstream keys and URLs never reach the browser.

**Caching.** `fetchJson` adds a timeout, bounded retries (429/5xx/timeouts only), an in-process TTL cache and request de-duplication. Cache windows range from 30 seconds for live summaries to 21,600 seconds for FIFA rankings. Public API responses also set `s-maxage` and `stale-while-revalidate`, plus `X-Data-Source`.

**Cache Components.** `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Request-time data is read inside `<Suspense>` boundaries after `connection()`, and route pages remain non-async where required by this model. See [`docs/implementation-status.md`](docs/implementation-status.md) for details.

## AI match analysis

The summary tab of a match page can ask the AI to size the fixture up.

**Separation of concerns.** ESPN is the only source of facts: the fixture, season standings, both teams' schedules and recent results, head-to-head meetings, provider statistics and any published market odds. The server assembles those into a typed dataset (`src/lib/analysis/dataset.ts`). Touchline AI only analyses that payload — it never fetches anything and never sees the API key or anything but the assembled dataset.

**What it produces.** Winner/draw probabilities, predicted score, expected goals, both-teams-to-score, over/under 1.5 and 2.5, expected yellow and red cards, first team to score, first-half outcome, head-to-head and recent-form commentary, tactical strengths and weaknesses and key factors — each item with a statistical explanation. The strict JSON contract is validated before anything is displayed (`src/lib/ai/analysis-schema.ts`); when the dataset is thin, the analysis is required to say so with a low reliability flag. Cards are estimated from competition norms and labelled as such when the provider publishes no card history.

**Operational behaviour.** One analysis per match is stored as a gitignored JSON file in `.data/analyses/` and reused, with a freshness window by match state (6 hours scheduled, 15 minutes live/halftime, 24 hours finished) and de-duplication of concurrent generates. Generation is rate-limited per client IP, auth/model/rate-limit/timeout/parse/data failures map to explicit error codes in the documented envelope, and nothing is ever invented in place of a failed prediction.

**Languages.** The report is always generated in English. When the UI language is Arabic, the panel asks the backend for an Arabic mirror (`POST ?lang=ar`): Touchline AI translates the report text only, every number is validated against the English prediction (`assertSamePredictionNumbers`), and the mirror is stored alongside the original. Until a mirror exists the English report is shown with a small "translating" indicator; if translation fails or is rate-limited the panel degrades silently to English. Reports read in Arabic render with a simplified layout: headline probabilities and score up front, market numbers as compact stat cards and all statistical explanations collapsed under "Why?" disclosures.

## AI historical match analysis

Finished matches get a retrospective instead of a prediction: the summary tab asks what actually happened and why it ended that way.

**Facts are extracted in code.** Before the model is called, the server rebuilds the final and half-time score, the chronological event list (honouring the provider's goal, card, penalty and VAR flags, with a running score wherever it is derivable) and the in-match statistics from the raw ESPN summary (`src/lib/analysis/retrospective-dataset.ts`). The model never supplies the timeline: it can only annotate published events by index, and its factual echo — winner, final and half-time score and every event reference — is validated against the extracted facts (`src/lib/ai/historical-schema.ts`). A match the provider has not finished is rejected with `409 match_not_finished`.

**Context never uses hindsight.** Pre-match context covers each side's results strictly before kick-off, head-to-head meetings before the fixture and the closing odds — never a match played afterwards. Anything the provider did not publish is flagged as unavailable rather than filled in, and an incomplete event list is labelled as such and suppresses the running score.

**What it produces.** A summary, an explanation of why the match ended this way with the turning point pinned to a real event, annotated timeline entries, both teams' tactical notes, three to five key factors and a verdict. Each retrospective is stored in `.data/analyses/<id>-historical.json` beside the facts it was built from, with a 24-hour freshness window, per-client generation rate limiting and in-flight de-duplication. Arabic works the same way as the prediction: `POST ?kind=past&lang=ar` mirrors the report through Touchline AI and validates every number, timeline reference and list length (`assertSameHistoricalNumbers`) before storing it.

## AI live match analysis

In-play matches get a dedicated analyst at `/match/[id]/live`, backed by the same pipeline: ESPN facts assembled in code, Touchline AI reasoning over them, a strict JSON contract (`src/lib/ai/live-schema.ts`) and an append-only store at `.data/analyses/<id>-live.json`.

**Captures, not a stream.** A capture happens when a real trigger justifies one: the first capture, a score change, a red card, a penalty, any new published event or a statistics swing (possession ≥ 8 points, shots ≥ 4, shots on target ≥ 3). A configurable interval (`AI_LIVE_MIN_INTERVAL_SECONDS`, default 120, clamped 30–1800) adds a safety capture, an unchanged fingerprint de-duplicates work and concurrent requests de-duplicate in flight, so nothing twice in a row burns an AI call. The model receives current facts, previous captures, the stored historical record and the stored pre-match prediction — plus the previous live analysis and the match clock — and must explain why its estimate moved.

**What it produces.** A minute-aware overview with a reliability flag, an analytical dominance split (who is dictating play — explicitly not a win probability), live win/draw/away probabilities labelled as such, a next-goal estimate that is withheld when data is insufficient, a momentum note, insights anchored to real events or statistics, tactical reading split into confirmed facts versus interpretation and a risk analysis that is never guaranteed. Every snapshot is stored; the panel and the desk keep the last good reading on screen when a capture fails, poll only while the tab is visible and stop at the final whistle with 409 `match_not_live`.

**Final report.** The first read after the final whistle computes a deterministic report in code: final and half-time score, winner, accuracy of the stored predictions (samples, argmax hits and accuracy, Brier score, mean stated probability) and how much each outcome probability swung between captures. Accuracy is computed only from stored predictions — never re-asked of the model.

**Arabic.** When the UI language is Arabic, reading or capturing with `?lang=ar` requests a one-time Arabic mirror of the latest snapshot through Touchline AI, validated against the English snapshot; until it exists the English reading is shown with a translation note and a retry action.

## Local preferences

Stored under two keys:

- `touchline.preferences.v1` — theme, time zone, notification opt-in, favourites (teams, leagues, matches) and reminders.
- `touchline.theme` — a tiny pre-hydration theme hint used by the inline bootstrap script to avoid a flash of the wrong theme.

Clearing site data removes everything. `/settings` includes JSON export/import and a two-step reset for that reason. Kick-off reminders use the browser Notification API and are checked while a Touchline tab is open; they are not a background push service.

## Scripts

```bash
npm run dev     # local development
npm run lint    # ESLint
npm run build   # production build
npm run start   # serve a production build
```

Regenerate the competition catalogue (network access required):

```bash
node scripts/generate-league-catalog.mjs
```

## Documentation

- [`docs/jdwel-analysis.md`](docs/jdwel-analysis.md) — analysis of the reference site and the decisions it drove
- [`docs/feature-matrix.md`](docs/feature-matrix.md) — reference capability vs. Touchline implementation
- [`docs/api.md`](docs/api.md) — public JSON routes, parameters, errors and caching
- [`docs/design-system.md`](docs/design-system.md) — tokens, typography, components, responsive and accessibility rules
- [`docs/implementation-status.md`](docs/implementation-status.md) — what is complete, how it was verified, known gaps
- [`docs/inaccessible-apis.md`](docs/inaccessible-apis.md) — providers that were unavailable and how that was handled

## Known limitations

- ESPN's endpoints are public but undocumented and can change without notice. Normalisation is defensive; when a field disappears the UI degrades to an honest empty state.
- A single ESPN all-scoreboard response is capped at 1,000 events. Daily fixture lists are complete; very busy months may be flagged `limited: true`.
- Some competitions publish no table or no player leaderboards for a given season. This is reported, not fabricated.
- AI analysis is probabilistic, not a guarantee. When ESPN publishes no card statistics, expected cards are explicitly estimated from competition norms, and the model is instructed to lower its reliability rather than invent certainty.
- The contact form composes a `mailto:` message in the user's mail client. There is no backend inbox, so delivery depends on the visitor's mail app.
- JDwel's own APIs are protected by Cloudflare. They were not bypassed and are not used. See [`docs/inaccessible-apis.md`](docs/inaccessible-apis.md).
- There is no multi-device sync: preferences are local by design.

## Status

Feature-complete for the planned scope. Local verification is performed with `next dev`; production build, test and deployment commands are intentionally left to the operator. See `docs/implementation-status.md`.

---

Touchline is a private, non-commercial project. Provider data remains subject to the providers' own terms.
