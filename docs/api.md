# Public API

Touchline exposes a small, read-only JSON API used by its own front end. It validates input, normalises upstream payloads and reports cache metadata. There is no API key and no commercial SLA.

Base URL: the site origin (for local development, `http://localhost:3000`). All routes are `GET`-only.

## 1. Conventions

### Success envelope

```json
{
  "data": {},
  "meta": {
    "source": "ESPN public API",
    "attribution": "Data provided by ESPN's public sports APIs.",
    "fetchedAt": "2026-11-01T12:00:00.000Z",
    "cacheSeconds": 30
  }
}
```

### Error envelope

```json
{
  "error": {
    "message": "No data is available for that request.",
    "status": 404,
    "code": "not_found"
  }
}
```

| HTTP status | `code` | Meaning |
| ---: | --- | --- |
| 400 | `bad_request` | A parameter failed validation. |
| 404 | `not_found` | Unknown competition, team or match, or no upstream record. |
| 4xx | `upstream_error` | The provider returned the same 4xx. |
| 502 | `upstream_error` | The provider failed or returned 5xx. |
| 504 | `upstream_timeout` | The provider timed out. |

Error responses are `Cache-Control: no-store`.

### Response headers

- `Cache-Control: public, max-age=0, s-maxage=<n>, stale-while-revalidate=<2n>`
- `X-Data-Source: ESPN public API` / `FIFA public API`

`/api/health` is the one exception to the caching rule: it sends `Cache-Control: no-store` so monitoring always reaches a live probe.

The calendar route is the only endpoint that does not return JSON.

### Input rules

Shared validators live in `src/lib/validation.ts`.

| Parameter | Rule |
| --- | --- |
| `date` | `YYYY-MM-DD` and a real calendar date (e.g. `2026-02-30` is rejected). |
| `month` | `YYYY-MM`, month 01–12. |
| `season` | Integer within the last ten seasons through next year. Invalid values fall back to the competition's default season. |
| `q` | Control characters removed, whitespace collapsed, trimmed, 80 characters maximum. Search requires at least 2. |
| `limit` | Clamped to the route's documented maximum; non-numeric values use the default. |
| Path ids | Numeric ESPN ids for teams and matches; catalogue slugs for competitions. |

## 2. Endpoint summary

| Endpoint | Purpose | Cache |
| --- | --- | --- |
| `GET /api/matches` | Day or month fixture list | 30 s / 120 s |
| `GET /api/leagues` | Competition catalogue | 3600 s |
| `GET /api/leagues/[slug]/standings` | League table | 120 s |
| `GET /api/leagues/[slug]/scorers` | Goals and assists leaders | 120 s |
| `GET /api/leagues/[slug]/fixtures` | Season fixtures | 120 s |
| `GET /api/match/[id]` | Match summary | 30 s |
| `GET /api/team/[id]` | Team profile and schedule | 300 s |
| `GET /api/rankings` | FIFA world rankings | 21600 s |
| `GET /api/news` | Football headlines | 300 s |
| `GET /api/search` | Competition and team search | 120 s |
| `GET /api/calendar` | iCalendar export | 120 s |
| `GET /api/health` | Liveness and upstream check | no-store |

## 3. Endpoints

### 3.1 `GET /api/matches`

Fixtures for one calendar day, or a month when `month` is supplied without `date`.

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `date` | `YYYY-MM-DD` | No | Defaults to today in UTC. Wins over `month`. |
| `month` | `YYYY-MM` | No | Month fixture list. |

Day response:

```json
{
  "data": {
    "date": "2026-11-01",
    "matches": []
  },
  "meta": { "...": "..." }
}
```

Month response:

```json
{
  "data": {
    "month": "2026-11",
    "matches": [],
    "limited": false
  },
  "meta": { "...": "..." }
}
```

`limited: true` means the provider capped the response at 1,000 events. Daily lists are complete; extremely busy months may not be. Invalid dates or months return 400.

```bash
curl "http://localhost:3000/api/matches?date=2026-11-01"
curl "http://localhost:3000/api/matches?month=2026-11"
```

### 3.2 `GET /api/leagues`

The verified catalogue (76 competitions). Served from project metadata; no upstream request.

| Param | Type | Notes |
| --- | --- | --- |
| `q` | string | Matches name, abbreviation, country, region and aliases. |
| `region` | string | Exact region, e.g. `Europe`. |
| `type` | `club` \| `national` | Competition type. |
| `gender` | `men` \| `women` | Competition gender. |
| `format` | `league` \| `cup` \| `qualifier` \| `friendly` | Competition format. |
| `featured` | `true` \| `false` | Featured-only or non-featured-only. |

```json
{
  "data": {
    "total": 76,
    "leagues": [
      {
        "slug": "eng.1",
        "espnId": "700",
        "name": "English Premier League",
        "abbreviation": "Premier League",
        "country": "England",
        "region": "Europe",
        "type": "club",
        "gender": "men",
        "format": "league",
        "youth": false,
        "featured": true,
        "order": 1,
        "logo": "https://a.espncdn.com/i/leaguelogos/soccer/500/23.png",
        "aliases": ["epl", "premier league"]
      }
    ]
  },
  "meta": { "...": "..." }
}
```

```bash
curl "http://localhost:3000/api/leagues?type=club&featured=true"
```

### 3.3 `GET /api/leagues/[slug]/standings`

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug` | path | Yes | Catalogue slug, e.g. `eng.1`. |
| `season` | `YYYY` | No | Defaults to the competition's current season. |

```json
{
  "data": {
    "league": { "...": "..." },
    "season": 2026,
    "available": true,
    "reason": null,
    "groups": [
      {
        "name": "Table",
        "entries": [
          {
            "rank": 1,
            "team": { "id": "359", "name": "Arsenal", "abbreviation": "ARS" },
            "played": 10,
            "wins": 8,
            "draws": 1,
            "losses": 1,
            "goalsFor": 22,
            "goalsAgainst": 8,
            "goalDifference": 14,
            "points": 25,
            "form": "WWWDW"
          }
        ]
      }
    ]
  },
  "meta": { "...": "..." }
}
```

`available: false` with a `reason` means the provider publishes no table for that season. A single group is normalised to `Table`. Unknown slugs return 404.

```bash
curl "http://localhost:3000/api/leagues/eng.1/standings?season=2026"
```

### 3.4 `GET /api/leagues/[slug]/scorers`

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug` | path | Yes | Catalogue slug. |
| `season` | `YYYY` | No | Season year. |

```json
{
  "data": {
    "league": { "...": "..." },
    "season": 2026,
    "available": true,
    "reason": null,
    "goals": [
      {
        "rank": 1,
        "playerId": "123",
        "playerName": "Player Name",
        "shortName": "P. Name",
        "team": { "id": "359", "name": "Arsenal" },
        "goals": 12,
        "assists": 4,
        "appearances": 10,
        "jersey": "9"
      }
    ],
    "assists": []
  },
  "meta": { "...": "..." }
}
```

The two boards are independent and may differ in length. Cup competitions frequently return `available: false`.

```bash
curl "http://localhost:3000/api/leagues/esp.1/scorers?season=2026"
```

### 3.5 `GET /api/leagues/[slug]/fixtures`

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug` | path | Yes | Catalogue slug. |
| `season` | `YYYY` | No | Season year. |

```json
{
  "data": {
    "league": { "...": "..." },
    "season": 2026,
    "matches": []
  },
  "meta": { "...": "..." }
}
```

Fixtures are ordered by date. Matches from the wrong season can appear in ESPN's season scoreboard early in a calendar year; those are filtered out.

### 3.6 `GET /api/match/[id]`

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | path | Yes | Numeric ESPN event id. |

Returns a `MatchDetails` object:

```json
{
  "data": {
    "match": { "...": "..." },
    "events": [],
    "stats": [],
    "lineups": [],
    "headToHead": [],
    "form": [],
    "article": { "headline": "...", "url": "https://..." },
    "news": [],
    "broadcasts": [],
    "odds": { "provider": "...", "details": "..." },
    "lineupsAvailable": false,
    "statsAvailable": false
  },
  "meta": { "...": "..." }
}
```

Optional blocks are empty when the provider has not published them — normal before kick-off. Unknown ids return 404.

### 3.7 `GET /api/team/[id]`

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | path | Yes | Numeric ESPN team id. |
| `season` | `YYYY` | No | Season for the schedule. |

```json
{
  "data": {
    "team": {
      "id": "359",
      "name": "Arsenal",
      "shortName": "Arsenal",
      "abbreviation": "ARS",
      "logo": "https://...",
      "color": "#EF0107",
      "standingSummary": "1st in English Premier League",
      "recordSummary": "8-1-1",
      "seasonSummary": "2026-27",
      "leagueSlug": "eng.1",
      "leagueName": "English Premier League"
    },
    "fixtures": [],
    "league": { "...": "..." },
    "season": 2026
  },
  "meta": { "...": "..." }
}
```

Returns 404 for non-numeric ids or ids ESPN does not recognise.

### 3.8 `GET /api/rankings`

| Param | Type | Notes |
| --- | --- | --- |
| `gender` | `men` \| `women` | Defaults to `men`. Anything else returns 400. |
| `confederation` | string | Exact match: `UEFA`, `CONMEBOL`, `CONCACAF`, `CAF`, `AFC`, `OFC`. |
| `limit` | `1–211` | Defaults to 211. |

```json
{
  "data": {
    "gender": "men",
    "updatedAt": "2026-10-23T00:00:00.000Z",
    "entries": [
      {
        "rank": 1,
        "previousRank": 1,
        "movement": 0,
        "teamId": "43969",
        "countryCode": "ARG",
        "name": "Argentina",
        "confederation": "CONMEBOL",
        "points": 1885.36,
        "matches": 8
      }
    ],
    "total": 211
  },
  "meta": {
    "source": "FIFA public API",
    "attribution": "Rankings data provided by the FIFA public API (api.fifa.com).",
    "fetchedAt": "2026-11-01T12:00:00.000Z",
    "cacheSeconds": 21600
  }
}
```

`total` is the number of entries after confederation filtering, before `limit`.

```bash
curl "http://localhost:3000/api/rankings?gender=women&confederation=UEFA&limit=20"
```

### 3.9 `GET /api/news`

| Param | Type | Notes |
| --- | --- | --- |
| `limit` | `1–24` | Defaults to 12. |

```json
{
  "data": {
    "articles": [
      {
        "id": "123456",
        "headline": "...",
        "description": "...",
        "published": "2026-11-01T09:15:00.000Z",
        "image": "https://...",
        "imageAlt": "...",
        "url": "https://www.espn.com/...",
        "byline": "ESPN",
        "section": "soccer"
      }
    ],
    "total": 12
  },
  "meta": { "...": "..." }
}
```

Headlines link to the original publisher. Touchline does not rehost article bodies.

### 3.10 `GET /api/search`

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `q` | string | Yes | At least 2 characters after cleaning. |

```json
{
  "data": {
    "query": "arsenal",
    "leagues": [],
    "teams": [
      {
        "id": "359",
        "name": "Arsenal",
        "abbreviation": "ARS",
        "logo": "https://...",
        "leagueSlug": "eng.1",
        "leagueName": "English Premier League",
        "color": "#EF0107"
      }
    ],
    "teamsAvailable": true
  },
  "meta": { "...": "..." }
}
```

`teamsAvailable: false` means the upstream team search failed; local competition results are still returned. Fewer than two characters returns 400.

### 3.11 `GET /api/calendar`

Returns `text/calendar; charset=utf-8` with a `Content-Disposition` attachment.

| Param | Type | Notes |
| --- | --- | --- |
| `date` | `YYYY-MM-DD` | Export one day. |
| `month` | `YYYY-MM` | Export a month. Ignored when `date` is present. |
| neither | — | Exports today in UTC. |

```bash
curl -OJ "http://localhost:3000/api/calendar?month=2026-11"
```

Timestamps are UTC. Fixtures without a confirmed kick-off are omitted rather than guessed. Event UIDs use `match-<id>@touchline`.

### 3.12 `GET /api/health`

Liveness probe. Returns HTTP 200 even when upstream is degraded.

```json
{
  "data": {
    "status": "ok",
    "checks": {
      "catalogue": { "ok": true, "leagues": 76 },
      "espn": { "ok": true, "latencyMs": 412, "fixturesToday": 63 }
    }
  },
  "meta": {
    "source": "ESPN public API",
    "attribution": "Data provided by ESPN's public sports APIs.",
    "fetchedAt": "2026-11-01T12:00:00.000Z",
    "cacheSeconds": 0
  }
}
```

`status` is `degraded` when the fixture feed fails. This distinction lets monitoring separate an application failure from a provider failure.

## 4. Upstream mapping

| Touchline route | Upstream |
| --- | --- |
| `/api/matches?date=` | `site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=YYYYMMDD&limit=1000` |
| `/api/matches?month=` | Same scoreboard with `dates=YYYYMM` |
| `/api/leagues/[slug]/standings` | `site.api.espn.com/apis/v2/sports/soccer/{slug}/standings?season=` |
| `/api/leagues/[slug]/scorers` | `site.api.espn.com/apis/site/v2/sports/soccer/{slug}/statistics?season=` |
| `/api/leagues/[slug]/fixtures` | `site.api.espn.com/apis/site/v2/sports/soccer/{slug}/scoreboard?dates={season}&limit=500` |
| `/api/match/[id]` | `site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=` |
| `/api/team/[id]` | `.../all/teams/{id}` and `.../all/teams/{id}/schedule?season=` |
| `/api/search` | Local catalogue + `site.api.espn.com/apis/common/v3/search?query=` |
| `/api/news` | `site.api.espn.com/apis/site/v2/sports/soccer/all/news?limit=` |
| `/api/rankings` | `api.fifa.com/api/v3/rankings?gender=1|2&sportId=1&language=en` |

Upstream behaviour (`src/lib/http.ts`):

- 15–25 s timeout depending on endpoint.
- Up to two retries for timeouts, HTTP 429, HTTP 5xx and network errors.
- No retry for other 4xx responses.
- In-process TTL cache keyed by endpoint and parameters.
- In-flight request de-duplication.
- Cache is bounded and pruned oldest-first.

These are undocumented public endpoints. They can change without notice; the normalisation layer is defensive, and the UI degrades to empty states rather than inventing data.

## 5. Usage etiquette

- Do not poll faster than the documented cache windows.
- Do not use the API to bulk-archive provider content.
- Keep the attribution intact if you display the data.
- Respect ESPN's and FIFA's terms. Touchline's API is a convenience proxy, not a licence to redistribute provider data.
