# Implementation status

Snapshot of the Touchline build: what is complete, how it was verified, and what remains a known limitation.

- **Date:** 1 November 2026
- **Runtime:** Node.js 24.20.0 · Next.js 16.4.3 (Turbopack) · React 19.3.0
- **Verification mode:** `next dev` on `http://localhost:3000`
- **Not run:** `next build`, `npm run lint`, automated tests, deployment. Those were intentionally left to the operator.

## 1. Feature status

Everything below is implemented, reachable from the UI, and backed by live provider data. No screen is a mock-up and no button is inert.

| Area | Status | Notes |
| --- | --- | --- |
| Daily fixtures | Complete | Grouped by competition, live/scheduled/finished states, competition/state/favourite filters, 60 s refresh while visible. |
| Date navigation | Complete | Previous/next day plus a validated date input that routes directly. |
| Competition directory | Complete | 76 verified competitions with search, region, type, gender and format filters. |
| Competition detail | Complete | URL-driven table/scorers/fixtures tabs, season switching, month filter for fixtures, favourites, related competitions. |
| Match centre | Complete | Dark scoreboard, key events, summary form guide and recent meetings, statistics (season totals before kick-off), lineups, full head-to-head and form tabs, venue/broadcasters, report links, calendar and share actions. |
| Team pages | Complete | Profile, season schedule, record summaries, favourite control. |
| FIFA rankings | Complete | Men's and women's boards, dark masthead with leader panel and stats, top-three podium, confederation filter, points bars, movement, publication date, official source link. |
| Calendar | Complete | Dark month masthead with a 12-month strip and summary stats, month grid with real fixture counts, day panel, day/month `.ics` exports, per-match Google/Outlook/`.ics` actions. |
| News | Complete | Dark newsroom hero, lead story + latest-headlines rail + attribution, three-column wire grid, external publisher links, newsroom stats, skeleton and empty/error states. |
| Search | Complete | Catalogue search plus ESPN team search, distinguishing "no results" from "upstream unavailable". |
| Settings | Complete | Theme, time zone, notifications, favourites, reminders, JSON export/import, two-step reset. |
| Static pages | Complete | About, FAQ, contact, privacy, in-app API documentation. |
| JSON API | Complete | 12 read-only routes with shared validation, normalisation, cache headers and error envelopes. |
| Metadata routes | Complete | Sitemap (static routes + all 76 competition pages), robots, web manifest. |
| Error surfaces | Complete | Route error boundary, global error boundary, 404 page, route-level loading skeletons. |

## 2. Runtime verification

A scripted pass requested every page type and API route, in the order a visitor is likely to meet them, and checked both the HTTP status and the response body for framework error markers.

### 2.1 Pages and metadata routes

| Route | Status | Result |
| --- | --- | --- |
| `/` | 200 | Matchday front page: match-of-the-day spotlight, "The day" panel, shortcut ticker, matchday desk, table and FIFA insight cards, competition index and news front rendered. |
| `/matches` | 200 | Defaults to today in UTC. |
| `/matches?date=2026-11-01` | 200 | Explicit date path. |
| `/competitions` | 200 | Directory with all filters. |
| `/competitions/eng.1` | 200 | Table tab. |
| `/competitions/eng.1?tab=scorers&season=2026` | 200 | Goals and assists boards. |
| `/competitions/eng.1?tab=fixtures&season=2026` | 200 | Season fixture list. |
| `/competitions/not-a-league` | 200 | Streams the 404 UI; see §3.1. |
| `/team/359` | 200 | Arsenal profile and schedule. |
| `/team/notanid` | 200 | Streams the 404 UI; see §3.1. |
| `/rankings` | 200 | Men's board, all confederations. |
| `/rankings?gender=women&confederation=UEFA` | 200 | Filtered board. |
| `/calendar` | 200 | Current month. |
| `/calendar?month=2026-11&date=2026-11-01` | 200 | Selected day with fixtures. |
| `/news` | 200 | Dark newsroom masthead, four stat cells, lead story panel, lead card, numbered latest-headlines rail, attribution card and wire grid. All cards open ESPN in a new tab. |
| `/search?q=arsenal` | 200 | Competition and team results. |
| `/search` | 200 | Idle prompt state. |
| `/settings` | 200 | All panels render without stored preferences. |
| `/about` | 200 | — |
| `/faq` | 200 | — |
| `/contact` | 200 | Unconfigured-address state (no `NEXT_PUBLIC_CONTACT_EMAIL` set). |
| `/privacy` | 200 | — |
| `/api-docs` | 200 | Endpoint catalogue matches the route handlers. |
| `/sitemap.xml` | 200 | 76 competition URLs plus static pages. |
| `/robots.txt` | 200 | Disallows `/api/`, `/settings`, `/search`. |
| `/manifest.webmanifest` | 200 | Icons, colours, shortcuts. |
| `/this-page-does-not-exist` | 404 | Static not-found route. |

### 2.2 JSON API

| Route | Status | Result |
| --- | --- | --- |
| `/api/matches?date=2026-11-01` | 200 | Day envelope with `matches`. |
| `/api/matches?month=2026-11` | 200 | Month envelope with `limited`. |
| `/api/matches?date=2026-02-30` | 400 | Invalid calendar date rejected. |
| `/api/leagues?type=club&featured=true` | 200 | Filtered catalogue. |
| `/api/leagues/eng.1/standings?season=2026` | 200 | Grouped table. |
| `/api/leagues/eng.1/scorers?season=2026` | 200 | Goals and assists. |
| `/api/leagues/eng.1/fixtures?season=2026` | 200 | Season fixtures. |
| `/api/leagues/nope/standings` | 404 | Unknown slug. |
| `/api/rankings?gender=women&confederation=UEFA&limit=5` | 200 | Filtered and limited. |
| `/api/rankings?gender=invalid` | 400 | Invalid gender. |
| `/api/news?limit=3` | 200 | Three headlines. |
| `/api/search?q=arsenal` | 200 | Local and upstream results. |
| `/api/search?q=a` | 400 | Query below two characters. |
| `/api/calendar?month=2026-11` | 200 | `text/calendar` attachment. |
| `/api/health` | 200 | `status: "ok"` with upstream latency. |
| `/api/match/notanid` | 404 | Non-numeric event id. |
| `/api/team/notanid` | 404 | Non-numeric team id. |

**Result: 44/44 checks passed.** The development log for the run contains no framework errors or warnings after the fixes in §3.

### 2.3 Browser checks

The header was exercised in the in-app browser at 800 px wide, where the mobile layout is active:

- The active section is highlighted and carries `aria-current="page"` after hydration on `/matches`, `/competitions/eng.1` and `/calendar`.
- The mobile panel opens from the menu button, reflects the active section, locks body scroll, and closes on Escape and on link activation.
- No console errors on `/team/359`, `/matches`, `/calendar` or `/competitions/eng.1`.
- The home page was measured in a same-origin frame at 1440 px, 800 px and 390 px: no horizontal page overflow, the spotlight and "The day" panel stack below 1080 px, the ticker wraps, and the masthead actions collapse below 420 px.
- The match centre was measured at 1440 px and in a 390 px frame: the scoreboard keeps its three-column shape, the fact rail moves below the main column at 1080 px, tabs wrap at 420 px, and summary form/head-to-head panels reflow to two rows per team without clipping.
- The `/matches` redesign was measured in same-origin frames at 1440 px and a true 390 px. No horizontal overflow at either width (`docScrollWidth` equals the viewport width); the masthead week strip keeps Sunday visible, live cards render 334 px wide and the board drops to one column below 900 px.
- `/matches` interactions were exercised in the in-app browser at 800 px with no console errors: search, clear search, Live tab (live board only), favourites empty state and its clear action, group collapse/expand, load-more (`20 of 53 shown`), competition select, Results tab, favourite toggle persisting to `touchline.preferences.v1`, favourites filter and reset.
- A past date (`/matches?date=2026-10-25`) renders the "Back to today" affordance and finished fixtures with the live board hidden.
- `/rankings` and `/calendar` were rebuilt and measured at 1440 px and in a true 390 px same-origin frame. Neither page scrolls horizontally; the rankings table drops the confederation column below 480 px, and the calendar month strip becomes 6×2 below 560 px.
- `/news` was rebuilt and measured at 1440 px, in a true 390 px same-origin frame, and in dark mode via a same-origin frame. The page never scrolls horizontally; the hero stats become a 2×2 grid below 760 px and the wire grid drops from three to two to one column. The lead card, four latest-headline items, attribution panel and ten-item grid all render with real ESPN headlines and external links. No console errors.
- Rankings interactions were exercised in the in-app browser with no console errors: the men's/women's switch (`198 teams` for women), the CONCACAF chip (`33 in view`, ranks renumbered), and the official FIFA source link.
- Calendar interactions were exercised with no console errors: next month (`December 2026`), month selection, day selection (`Friday, 25 December 2026`) and the empty-day state. Export links resolve to `/api/calendar?month=2026-12` and `/api/calendar?date=2026-12-25`.
- Both `.ics` routes returned `200 text/calendar` (month: 1,000 fixtures; day: 94 KB) and the month cap is reported through the hero's `limited` notice.
- Rankings empty/limited states are handled explicitly: a confederation with no entries renders the board's empty message, and the filter count reports "n in view".

## 3. Next.js 16 Cache Components measures

`next.config.ts` enables `cacheComponents` and `partialPrefetching`. That model requires care with request-time values; these are the deliberate measures in the code.

1. **Request-time data inside `<Suspense>`.** Pages that read `params`, `searchParams` or the current date await `connection()` inside an async child component rendered under `<Suspense>`. The page shells stay prerenderable.
2. **`usePathname()` isolated to a leaf.** The header's active-link highlight lives in `DesktopLinks`, wrapped in a `<Suspense>` with a plain-link fallback of identical size. The mobile panel reads the pathname only after the visitor opens it. This removes the `blocking-prerender-client-hook` error without shifting the header.
3. **No current time in prerendered shells.** The footer no longer prints `new Date().getFullYear()`.
4. **Smooth scrolling declared.** `<html data-scroll-behavior="smooth">` matches the global `scroll-behavior: smooth` rule, removing the navigation warning.
5. **Large payloads bypass the Next data cache.** ESPN all-scoreboard responses for a day, a month or a league season can exceed 2 MB, which Next refuses to store. Those calls use `cache: "no-store"` and rely on the bounded in-process cache and request de-duplication in `src/lib/http.ts`. Smaller responses keep the Next data cache.

### 3.1 Streamed 404s

Unknown competition slugs and team ids are detected after the shell has begun streaming, because `params` is awaited inside the Suspense boundary. Next.js commits to HTTP 200 at that point; `notFound()` then renders the 404 UI in place and Next injects `<meta name="robots" content="noindex">`. This is documented upstream behaviour for streamed not-found errors, not a missing route.

Unknown API resources and unknown top-level pages return real `404` status codes, because no streaming has started when they respond.

## 4. Data verification

- ESPN public soccer endpoints were exercised for all-scoreboard daily and monthly queries, league scoreboards, standings v2, statistics leaders, match summaries, team profiles and schedules, core league metadata, common-v3 search and news.
- FIFA's public rankings API was checked for both men (`gender=1`) and women (`gender=2`).
- The 76-entry catalogue in `src/data/leagues.ts` was generated from ESPN core metadata and each slug was individually checked for usable current-season data. Slugs that answered with errors were excluded; see [`inaccessible-apis.md`](inaccessible-apis.md).
- No hardcoded fixtures, tables, rankings or news exist anywhere in the UI. Every displayed value comes from a provider response or from project metadata that is clearly labelled as such (competition names, logos, aliases).
- Missing provider data is rendered as an explicit empty or unavailable state; nothing is filled in with plausible-looking numbers.

## 5. Known limitations

| Limitation | Handling |
| --- | --- |
| ESPN endpoints are public but undocumented. | All access is isolated in `src/lib/espn.ts` and normalisation is defensive; a changed field degrades to an empty state. |
| One scoreboard response is capped at 1,000 events. | The API and calendar expose a `limited` flag; daily lists are complete. |
| Some competitions publish no table or leaderboard for a season. | `available: false` plus a reason and a link to fixtures. |
| Pre-match summaries lack events, lineups and statistics. | Explicit "not published yet" panels; the summary shows a form guide and recent meetings, and statistics are labelled as season totals when they exist. |
| The contact form has no backend inbox. | It composes a real `mailto:` message. Without `NEXT_PUBLIC_CONTACT_EMAIL` the page explains that no address is configured. |
| Preferences are browser-local. | No accounts and no cloud sync by design; `/settings` offers JSON export/import and a two-step reset. |
| Kick-off reminders need an open tab. | The Notification API is used while a Touchline tab is open; this is stated in the UI. |
| Unknown dynamic pages stream a 200 with a 404 UI. | Documented in §3.1; search engines receive `noindex`. |
| JDwel's own API is Cloudflare-protected. | Not bypassed and not used; see [`inaccessible-apis.md`](inaccessible-apis.md). |

## 6. How to re-run the verification

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000` and walk the navigation: home → matches → a competition tab → a match → a team → rankings → calendar → news → search → settings.
3. Exercise the API directly, for example:

   ```bash
   curl "http://localhost:3000/api/health"
   curl "http://localhost:3000/api/matches?date=2026-11-01"
   curl "http://localhost:3000/api/leagues/eng.1/standings?season=2026"
   curl "http://localhost:3000/api/search?q=a"          # expect 400
   curl "http://localhost:3000/api/leagues/nope/standings" # expect 404
   ```

4. Watch the server log for `Error:` / `Warning:` lines while navigating; a clean run should contain request logs only.

Production build, lint and tests remain unrun by request and should be executed by the operator before deployment.
