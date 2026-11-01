# JDwel analysis

This document records the reference-site review that shaped Touchline. It is a functional and structural analysis, not a copy plan. No JDwel markup, styles, assets, logos, copy or API responses are used in this project.

## 1. Scope and method

The review covered every publicly reachable page type and workflow reachable from the JDwel homepage:

- home / today's football
- match listing for a selected day
- competition directory
- competition detail with tables, scorers and fixtures
- match detail
- FIFA world rankings
- calendar / date browsing
- settings and personalisation
- about, FAQ, contact and privacy pages

The review was performed in a browser, as an ordinary visitor. No authentication was bypassed, no protected endpoint was scraped, and no anti-bot measure was circumvented.

**Important limitation:** JDwel's own `/api/web/v1/...` endpoints answer non-browser clients with Cloudflare challenge pages (HTTP 403). They were therefore not usable as a data source. This is documented further in [`inaccessible-apis.md`](inaccessible-apis.md).

## 2. Product model

JDwel is an Arabic-language, right-to-left football results site. Its core promise is narrow and clear: show today's matches, let a visitor move through dates and competitions, and show tables and rankings for the competitions it covers.

Observed characteristics:

| Dimension | Observation |
| --- | --- |
| Language / direction | Arabic, RTL |
| Primary content | Fixtures, live scores, league tables, top scorers, FIFA rankings |
| Account model | None visible. No registration, sign-in, newsletter or profile page. |
| Personalisation | Local browser preferences: favourites, theme, time zone and alert settings |
| Monetisation | Advertising slots in the page shell |
| Data freshness | Strong emphasis on "today"; timestamps and live state are prominent |
| Navigation | Shallow: a small top-level set, then competition and match detail pages |
| Visual language | Dark blue surfaces, gold highlights, dense cards, RTL typography |

There is no meaningful editorial layer, no long-form content and no social feature. The site is a utility.

## 3. Information architecture

The effective hierarchy is:

```text
Home / Today
├── Matches for a date
│   └── Match detail
├── Competitions
│   └── Competition detail
│       ├── Standings
│       ├── Scorers
│       └── Fixtures
├── FIFA rankings
├── Calendar
├── Settings
└── Static help pages (about, FAQ, contact, privacy)
```

This is a four-level model: **day → competition → match → supporting data**. The most important navigation is temporal (previous day / today / next day), not hierarchical.

### Navigation behaviour

- A compact primary navigation exposes the main sections.
- Competition pages use tabs rather than nested routes; the tab is part of the page state.
- Date selection is a first-class control, not a filter buried in a form.
- Match rows lead directly to match detail, where the score is the largest element.

## 4. Page-by-page inventory

### 4.1 Home / today

- Date-oriented hero or headline block for the current match day.
- Dense list of fixtures grouped by competition.
- Live matches visually distinguished from scheduled and finished matches.
- Competition shortcuts and a rankings entry point.
- Advertising placements around the content.

**Takeaway:** the home page is a scoreboard, not a magazine cover.

### 4.2 Match listing

- Date navigation with previous/next day and a date picker.
- Fixtures grouped by competition.
- Each row shows status, teams, score or kick-off time.
- Some personalisation hooks (favourite teams) in the listing.

**Takeaway:** grouping by competition is essential at this density. A flat chronological list is much harder to scan.

### 4.3 Competitions

- Directory of covered competitions, likely filtered by region/type.
- Each entry links to tables, scorers and fixtures.
- Competition identity is carried by name and badge.

**Takeaway:** the directory needs search and classification, not just a long list.

### 4.4 Competition detail

- **Standings:** position, team, played, won, drawn, lost, goals, points; group support for cup formats.
- **Scorers:** player, team, goals, often assists.
- **Fixtures:** full season list, grouped or ordered by round/date.
- Season selection where multiple seasons are available.

**Takeaway:** these are three distinct modes of the same entity and should be URL-addressable.

### 4.5 Match detail

- Score header with teams, competition, round, date and venue.
- Key events (goals, cards, substitutions) in timeline form.
- Team statistics.
- Lineups and substitutes where available.
- Head-to-head and recent form blocks.
- Related content or links.

**Takeaway:** pre-match pages must still be useful when events, lineups and stats do not yet exist.

### 4.6 FIFA rankings

- Men's and women's boards.
- Rank, team, points and movement.
- Confederation filtering.
- Publication date.

**Takeaway:** rankings are a separate data domain from club football and should not be forced into the competition model.

### 4.7 Calendar

- Month grid with fixture density per day.
- Day panel listing that day's matches.
- Date navigation and an export path.

**Takeaway:** the calendar is a browsing aid first and an export tool second.

### 4.8 Settings

- Theme choice.
- Time zone selection.
- Notification/alert preference.
- Favourite teams and competitions.
- Local reset.

All state is browser-local. There is no account to synchronise.

### 4.9 Static pages

About, FAQ, contact and privacy exist to explain the service and its data. The FAQ is operational (how scores update, why a match is missing), not marketing.

## 5. Functional requirements derived from the review

| Requirement | Why it matters |
| --- | --- |
| Daily fixture list with competition grouping | The primary use case is "what is on today?" |
| Live / scheduled / finished distinction | Users scan state before teams |
| Date navigation | Football is organised by match day |
| Competition directory with search | Coverage is broad; browsing alone is insufficient |
| Table / scorers / fixtures as separate views | Different questions, different layouts |
| Season switching | Tables and fixtures are season-scoped |
| Match detail with graceful pre-match state | Most matches are not live when viewed |
| Separate FIFA rankings domain | National-team rankings are not league tables |
| Month calendar with day drill-down | Planning and discovery |
| Calendar export | A real user workflow, not a decorative button |
| Local favourites and time zone | Repeat visitors expect continuity without signing in |
| Theme preference | Long sessions, low-light use |
| Explicit empty/error states | Provider gaps are common in football data |
| Responsive layout | Match checking is heavily mobile |

## 6. Design observations (and deliberate divergence)

JDwel's design is dense, dark and gold-accented, with RTL composition and advertising in the shell.

Touchline deliberately diverges:

| Aspect | JDwel | Touchline |
| --- | --- | --- |
| Direction | RTL Arabic | LTR English |
| Default theme | Dark blue | Light editorial, optional dark |
| Accent | Gold | Lime |
| Typography | Arabic-first family | Plus Jakarta Sans for display and body |
| Density | High, card-heavy | Structured editorial grid with generous spacing |
| Shell | Advertising slots | No ads, no tracking |
| Navigation | Compact utility nav | Sticky header with clear section and settings entry |
| Content | Scores and tables | Scores and tables plus a news surface and developer docs |

Nothing from JDwel's CSS, layout files, imagery, iconography, brand marks or copy was reused. The shared surface is the underlying football domain — fixtures, tables, rankings — which is not proprietary.

## 7. Gaps in the reference experience, addressed in Touchline

1. **No English-language edition.** Touchline is English-first.
2. **No accessible public API.** Touchline exposes documented same-origin JSON routes.
3. **Limited pre-match detail.** Touchline shows honest "not published yet" states and still provides form, head-to-head and venue where available.
4. **Opaque data provenance.** Touchline names its providers, shows attribution, and documents caching and limitations.
5. **No export workflow beyond a basic calendar view.** Touchline generates real `.ics` files for a day or month and offers per-match calendar actions.
6. **No portable preferences.** Touchline adds JSON export/import and a two-step reset.
7. **Weak failure communication.** Touchline separates upstream failure from empty data and offers retry paths.
8. **No developer surface.** Touchline includes `/api-docs`, `robots.txt`, a sitemap and a manifest.

## 8. What was intentionally not carried over

- Arabic copy, brand name, logo or visual identity.
- Dark-blue/gold palette and RTL grid.
- Advertising slots or ad-tech scripts.
- Any JDwel API call, reverse-engineered endpoint or bypass of Cloudflare.
- Any assumption that an upstream field exists. Every optional block is treated as optional.

## 9. Resulting product brief

Touchline was built as a complete football data utility with:

- the same core jobs (scores, tables, fixtures, rankings, calendar, favourites),
- a wider competition catalogue (76 verified competitions),
- an original English editorial design with light/dark themes,
- a documented data layer and JSON API,
- explicit handling of unavailable data,
- no accounts and no server-side personal data.

The implementation against this brief is tracked in [`feature-matrix.md`](feature-matrix.md) and [`implementation-status.md`](implementation-status.md).
