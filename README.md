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
- **Public JSON API.** Same-origin routes with validation, normalisation, cache metadata and a documented envelope.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4.3 (App Router, Cache Components) |
| UI | React 19.3, TypeScript, custom CSS |
| Icons | `lucide-react` |
| Fonts | Plus Jakarta Sans Variable, self-hosted via Fontsource |
| Data | ESPN public soccer APIs; FIFA public rankings API |
| Persistence | `localStorage` only |

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

No API keys are needed. The upstream APIs are public and unauthenticated.

## Routes

### Pages

| Route | What it does |
| --- | --- |
| `/` | Matchday front page: match-of-the-day spotlight, "The day" panel, shortcut ticker, desk, insight cards, competition index and headlines. |
| `/matches?date=YYYY-MM-DD` | Day masthead with date stepper and week strip, live-score board, and fixtures grouped by competition with competition/state/favourite filters, paging and a refresh ticker. |
| `/competitions` | Searchable, filterable directory of all 76 competitions. |
| `/competitions/[slug]?tab=standings&season=YYYY` | Competition table, scorers or fixtures. Tabs are URL-driven. |
| `/match/[id]` | Match centre: scoreboard, summary form guide and recent meetings, events, statistics, lineups, form, head-to-head and calendar export. |
| `/team/[id]?season=YYYY` | Team profile, season schedule and provider-supplied record summaries. |
| `/rankings?gender=men&confederation=UEFA` | FIFA world rankings: leader panel, top-three podium, points bars and movement. |
| `/calendar?month=YYYY-MM&date=YYYY-MM-DD` | Month masthead with 12-month strip and stats, day grid, selected-day panel and `.ics` exports. |
| `/news` | Dark newsroom masthead with stats, leading story, latest-headlines rail and a wire grid; every card links to ESPN in a new tab. |
| `/search?q=` | Local competition search plus upstream team search. |
| `/settings` | Theme, time zone, notifications, favourites, reminders, export/import and reset. |
| `/about`, `/faq`, `/contact`, `/privacy`, `/api-docs` | Project, help, contact, privacy and developer documentation. |

### JSON API

All routes are `GET`-only and documented in-app at `/api-docs` and in [`docs/api.md`](docs/api.md).

```text
GET /api/matches?date=YYYY-MM-DD
GET /api/matches?month=YYYY-MM
GET /api/leagues?q=&region=&type=&gender=&format=&featured=
GET /api/leagues/[slug]/standings?season=YYYY
GET /api/leagues/[slug]/scorers?season=YYYY
GET /api/leagues/[slug]/fixtures?season=YYYY
GET /api/match/[id]
GET /api/team/[id]?season=YYYY
GET /api/rankings?gender=&confederation=&limit=
GET /api/news?limit=
GET /api/search?q=
GET /api/calendar?date=YYYY-MM-DD | ?month=YYYY-MM
GET /api/health
```

Successful JSON responses use `{ data, meta }`. Failures use `{ error: { message, status, code } }`. The calendar route returns `text/calendar` instead.

## Data sources and attribution

- **ESPN public soccer APIs** — fixtures, scores, tables, statistics, summaries, teams, search and news.
- **FIFA public API** (`api.fifa.com`) — men's and women's world rankings.
- League metadata in `src/data/leagues.ts` is generated from ESPN's public core API by `scripts/generate-league-catalog.mjs`. It contains names, logos, aliases and classification only; results and tables are always fetched at runtime.

Touchline is an independent project and is not affiliated with ESPN or FIFA. Provider terms and attribution requirements apply to their data. Headlines link to the original publisher; Touchline does not rehost articles.

## Architecture

```text
src/
  app/                 App Router pages, metadata routes and /api handlers
  components/
    layout/            Header, footer, brand mark, theme toggle
    providers/         Preferences and toast contexts
    soccer/            Match rows, explorers, competition cards, news cards, date controls
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
    types.ts           Shared domain types
    validation.ts      Input validation shared by API routes
    calendar.ts        iCalendar generation
```

**Server first.** Page components call `src/lib/api.ts` on the server. Client components never talk to ESPN directly; interactive features call same-origin `/api/*` routes where an HTTP boundary is useful. Upstream keys and URLs never reach the browser.

**Caching.** `fetchJson` adds a timeout, bounded retries (429/5xx/timeouts only), an in-process TTL cache and request de-duplication. Cache windows range from 30 seconds for live summaries to 21,600 seconds for FIFA rankings. Public API responses also set `s-maxage` and `stale-while-revalidate`, plus `X-Data-Source`.

**Cache Components.** `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Request-time data is read inside `<Suspense>` boundaries after `connection()`, and route pages remain non-async where required by this model. See [`docs/implementation-status.md`](docs/implementation-status.md) for details.

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
- The contact form composes a `mailto:` message in the user's mail client. There is no backend inbox, so delivery depends on the visitor's mail app.
- JDwel's own APIs are protected by Cloudflare. They were not bypassed and are not used. See [`docs/inaccessible-apis.md`](docs/inaccessible-apis.md).
- There is no multi-device sync: preferences are local by design.

## Status

Feature-complete for the planned scope. Local verification is performed with `next dev`; production build, test and deployment commands are intentionally left to the operator. See `docs/implementation-status.md`.

---

Touchline is a private, non-commercial project. Provider data remains subject to the providers' own terms.
