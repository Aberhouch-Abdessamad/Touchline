# Inaccessible and rejected data sources

This project uses only publicly reachable APIs that respond to ordinary server-side requests. Where a provider blocked access or required bypassing a protection measure, it was documented and excluded rather than worked around.

## 1. JDwel web API

**Target:** JDwel's own JSON endpoints under `/api/web/v1/...`, observed while reviewing the reference site in a browser.

**Result:** Requests from non-browser clients (Node `fetch`, curl, server-side code) receive Cloudflare challenge/403 responses rather than JSON. Browser sessions succeed because they satisfy Cloudflare's client checks.

**Decision:** Not used. The project does not attempt to:

- solve or replay Cloudflare challenges,
- copy browser cookies or tokens,
- spoof browser fingerprints,
- scrape rendered HTML as a substitute API.

**Consequence:** Touchline's data model was designed independently around ESPN and FIFA. JDwel was used only as a functional reference for page types and workflows, which is documented in [`jdwel-analysis.md`](jdwel-analysis.md).

## 2. TheSportsDB

**Target:** `https://www.thesportsdb.com/api/v1/json/123/...` (the long-standing public test key).

**Result:** Repeated HTTP 429 responses with upstream error code `1015` (rate limit). The public test key is shared by a very large number of clients and was not reliable enough for a production data path.

**Decision:** Abandoned. No attempt was made to obtain or use a private key, rotate keys, or evade rate limiting.

**Consequence:** ESPN's public soccer APIs provide the required fixtures, tables, statistics, teams, search and news. TheSportsDB is not referenced anywhere in the code.

## 3. SofaScore and FotMob

**Target:** Unofficial mobile/web endpoints sometimes used by football aggregators.

**Result:** Endpoints were unavailable, blocked, or lacked a stable public contract suitable for server-side use. These services are not documented as public APIs, and their terms do not grant redistribution rights for this use.

**Decision:** Not used. Touchline does not scrape their pages or reverse-engineer private mobile APIs.

**Consequence:** No dependency on either service. All football data comes from ESPN; rankings come from FIFA.

## 4. ESPN competition slugs that failed verification

**Target:** Several league slugs discovered while exploring ESPN's soccer namespace.

**Result:** HTTP 400 (or otherwise unusable payloads) for slugs including:

- `fifa.u20`
- `uefa.youth`
- `pol.1`
- `ukr.1`

**Decision:** Excluded from `src/data/leagues.ts`. The catalogue only contains 76 competitions that were individually verified to return usable metadata and current-season data.

**Consequence:** A visitor may occasionally see a fixture in the all-competitions scoreboard whose competition is not in the directory. The match row still renders using the competition name supplied by ESPN; only the deep link to a catalogue page is unavailable. This is preferable to listing a competition that returns errors on every request.

## 5. ESPN range queries

**Target:** Month-range scoreboard requests such as `dates=20261101-20261130`.

**Result:** HTTP 400. ESPN accepts a single day (`YYYYMMDD`) or a month (`YYYYMM`), not a `start-end` range.

**Decision:** Month browsing uses `dates=YYYYMM`. Per-day data uses `dates=YYYYMMDD`. No range syntax is used.

**Consequence:** A single month response is capped at 1,000 events. The UI and API expose a `limited` flag when the cap is hit.

## 6. Provider limitations that are not access failures

These are normal data gaps, handled in the UI rather than treated as blocked sources:

| Limitation | Handling |
| --- | --- |
| No league table for a cup or an unpublished season | `available: false` plus a reason and a link to fixtures |
| No scorer/assist leaderboard for a competition | Same pattern; the two boards are independent |
| No lineups, stats or events before kick-off | `PanelEmpty` with an explicit "not published yet" message |
| Missing venue, broadcaster or attendance | Fields omitted; no placeholder numbers |
| Early-season scoreboard containing prior-season events | Filtered by `event.season.year === requestedSeason` |
| All-scoreboard events lacking a league slug | Resolved via `competition.altGameNote` and the catalogue alias index, with the summary endpoint as the exact fallback |
| FIFA rankings publication cadence | Cached for six hours; the published date is shown |

## 7. Why this matters

The requirement was real data only: no hardcoded fixtures, no invented endpoints, no authentication bypass, no exposed secrets. That constraint has three practical consequences:

1. **The catalogue is curated.** Every competition in `src/data/leagues.ts` was verified. The generator script can be re-run, but a failed slug is excluded rather than shipped.
2. **The UI is honest.** Empty, partial and unavailable states are first-class. A missing table is never replaced by a mock table.
3. **The architecture is replaceable.** All upstream access is isolated in `src/lib/espn.ts`, `src/lib/fifa.ts` and `src/lib/http.ts`. If a provider changes or disappears, the normalisation layer and pages can be adapted without touching the design system.

## 8. Etiquette commitments

- Read-only requests only.
- No authentication bypass, cookie replay, CAPTCHA solving or fingerprint spoofing.
- Modest request rates backed by server-side caching and request de-duplication.
- Bounded retries only for timeouts, 429 and 5xx.
- Attribution in the footer, About page, API metadata and API documentation.
- Headlines link to the original publisher; article bodies are not rehosted.
- No provider logos are used as Touchline branding.
