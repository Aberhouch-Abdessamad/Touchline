# Feature matrix

Status legend: **Done** = implemented and reachable in the UI · **Partial** = implemented with a documented provider constraint · **N/A** = not applicable to this product.

## 1. Discovery and navigation

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Public home page | Yes | **Done** | `/` |
| Match-of-the-day spotlight | Date hero | **Done** — strongest live or upcoming fixture, derived from real match data | `SpotlightMatch` |
| "The day" score panel | Yes | **Done** — live and upcoming fixtures with times in the visitor's zone | `DayPanel` |
| Shortcut ticker | Unclear | **Done** | `HomeHero` |
| Sticky primary navigation | Yes | **Done** | `SiteHeader` |
| Mobile navigation | Assumed responsive | **Done** — dialog-style panel, Escape to close, body scroll lock | `SiteHeader` |
| Search entry point | Yes | **Done** | `/search`, header |
| Dark / light theme | Theme choice | **Done** — light, dark, system | `ThemeToggle`, `/settings` |
| Visible data attribution | Limited | **Done** — footer, About, API docs, `meta.attribution` | `SiteFooter`, `site.ts` |
| Sitemap / robots / manifest | Not verified | **Done** | `sitemap.ts`, `robots.ts`, `manifest.ts` |
| News surface | No dedicated section observed | **Done** — lead story, headline rail, grid | `/news`, home |

## 2. Fixtures and scores

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Today's fixtures | Yes | **Done** | `/matches` (defaults to today), home matchday desk |
| Previous / next day | Yes | **Done** | `DateNav`, `DateJump` |
| Arbitrary date jump | Yes | **Done** — validated `YYYY-MM-DD` query | `/matches?date=` |
| Grouping by competition | Yes | **Done** — two-column board, 4 rows per competition before "Show all" | `MatchesExplorer`, `MatchCentreRow` |
| Live / half-time / finished / postponed states | Yes | **Done** — labelled status pills; live games promoted to a light live board | `MatchCentreRow`, `LiveMatchCard` |
| Live clock and score | Yes | **Done** | `LiveMatchCard`, `MatchCentreRow` |
| Kick-off time in local time zone | Time-zone setting | **Done** — `LocalTime` + preference | `/settings` |
| Competition filter | Likely | **Done** — client filter over the day's competitions | `MatchesExplorer` |
| State filter | Unclear | **Done** — all / live / scheduled / finished | `MatchesExplorer` |
| Favourites-only filter | Favourites | **Done** — stored locally, with a dedicated empty state | `MatchesExplorer` |
| Auto-refresh while visible | Unclear | **Done** — 60 s server refresh, paused when hidden | `RefreshTicker` |
| Month fixture list | Calendar | **Done** | `/calendar`, `/api/matches?month=` |
| Fixture count and empty state | Basic | **Done** — day tally, board count, empty and error states | `MatchDayHeader`, `/matches` |

## 3. Competitions

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Competition directory | Yes | **Done** — 76 competitions | `/competitions` |
| Search by name / country / alias | Limited | **Done** | `CompetitionsExplorer`, `/api/leagues?q=` |
| Filter by region | Likely | **Done** | `/competitions` |
| Filter by club / national | Likely | **Done** | `/competitions` |
| Filter by men / women | Not observed | **Done** | `/competitions` |
| Filter by format (league / cup / qualifier / friendly) | Not observed | **Done** | `/competitions` |
| Featured competition shortcuts | Yes | **Done** | Home competition index |
| Favourite a competition | Favourites | **Done** — star outside card link, no nested buttons | `CompetitionCard` |
| League table | Yes | **Done** — group support, provider order preserved | `/competitions/[slug]?tab=standings` |
| Table columns | Position, team, P/W/D/L, goals, points | **Done** — plus form where supplied | Standings panel |
| Top scorers | Yes | **Done** | `/competitions/[slug]?tab=scorers` |
| Assists board | Sometimes | **Done** — independent array | Scorers panel |
| Season fixtures | Yes | **Done** | `/competitions/[slug]?tab=fixtures` |
| Season switching | Yes | **Done** — URL-driven, validated | `SeasonSelect` |
| URL-addressable tabs | Unclear | **Done** | `?tab=` |
| Honest "no table / no leaderboard" state | Unclear | **Done** — `available: false` + reason | Panels |

## 4. Match detail

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Score header, teams, competition, round | Yes | **Done** | `/match/[id]` |
| Venue, date, broadcasters | Partly | **Done** where supplied | `MatchInfo` |
| Key events timeline | Yes | **Done** — falls back to competition details when `keyEvents` is absent | `EventTimeline` |
| Team statistics | Yes | **Done** — comparison bars with real values | `StatsCompare` |
| Lineups and substitutes | Yes | **Done** where published | `LineupsPanel` |
| Head-to-head | Yes | **Done** | `HeadToHeadList` |
| Recent form | Yes | **Done** | `FormPanels` |
| Summary snapshot | Not observed | **Done** — form guide and four most recent meetings above the tabs' detail | `FormGuide`, `HeadToHeadList` |
| Pre-match statistics | Unclear | **Done** — provider season totals, labelled as such | `StatsCompare` |
| Related news / match report | Sometimes | **Done** — links to publisher | `MatchRail` |
| Pre-match graceful state | Unclear | **Done** — explicit "not published yet" panels | `PanelEmpty` |
| Add to calendar | Unclear | **Done** — Google, Outlook, `.ics` | `CalendarMenu` |
| Share match | Not observed | **Done** — Web Share API with clipboard fallback | `ShareButton` |
| Favourite match | Favourites | **Done** | `FavoriteButton` |
| Reminder | Alerts | **Done** — browser notification while site is open | `RemindButton` |
| Unknown match id | Error page | **Done** — `notFound()` | `/match/[id]` |

## 5. Teams

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Team profile | Not a primary page | **Done** | `/team/[id]` |
| Team logo and competition | Yes in listings | **Done** | Team hero |
| Season schedule | Within competition fixtures | **Done** | `/team/[id]?season=` |
| Provider record summaries | Not observed | **Done** where supplied | Team page |
| Favourite team | Favourites | **Done** | `FavoriteButton` |
| Unknown team id | — | **Done** — 404 | `/team/[id]` |

## 6. FIFA rankings

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Men's world ranking | Yes | **Done** | `/rankings?gender=men` |
| Women's world ranking | Yes | **Done** | `/rankings?gender=women` |
| Rank, team, points | Yes | **Done** | Rankings table |
| Top-three podium | Sometimes | **Done** — top three repeated above the board | `Podium` |
| Leader summary + hero stats | — | **Done** — leader, teams, confederations, biggest climber, publication date | `RankingsHero` |
| Points bar per team | — | **Done** — scaled against the leader | `rk-points__track` |
| Movement vs. previous rank | Yes | **Done** — up/down/flat with accessible labels | `Movement` |
| Confederation filter | Likely | **Done** | `?confederation=` |
| Publication date | Likely | **Done** — shown in local time | `LocalTime` |
| Official source link | Sometimes | **Done** | `/rankings` |

## 7. Calendar

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Month grid | Yes | **Done** — real fixture counts per day | `/calendar` |
| 12-month strip | Yes | **Done** — jump to any month in the year | `CalendarHero` |
| Month summary stats | — | **Done** — fixtures, active days, live now, busiest day | `CalendarHero` |
| Previous / next month | Yes | **Done** | Month controls |
| Jump to today | Likely | **Done** | Month controls |
| Select a day | Yes | **Done** | Day links |
| Day fixture panel | Yes | **Done** | `DayPanel` |
| Month `.ics` export | Unclear | **Done** | `/api/calendar?month=` |
| Day `.ics` export | Unclear | **Done** | `/api/calendar?date=` |
| Per-match Google / Outlook / `.ics` | Unclear | **Done** | `CalendarMenu` |
| "Month list is capped" warning | No | **Done** — explicit `limited` notice | `/calendar` |

## 8. News and search

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Headlines feed | Not observed | **Done** — 15 real ESPN stories | `/news`, home |
| Lead story + latest-headline rail | — | **Done** — hero lead panel, lead card and numbered rail | `/news` |
| Wire grid | — | **Done** — remaining stories in a three-column grid | `/news` |
| Feed attribution | — | **Done** — byline, date, section chip, provider panel | `/news` |
| Newsroom stats | — | **Done** — stories, bylines, topics, latest update | `/news` |
| External publisher links | — | **Done** — `target="_blank"`, `rel="noopener noreferrer"` | `NewsCard` |
| Feed failure / empty states | — | **Done** — distinct copy and reload action | `/news` |
| Competition search | Yes | **Done** | `/search`, `/api/search` |
| Team search | Yes | **Done** — upstream team results | `/search` |
| Search suggestions | — | **Done** | `/search` |
| Query validation | — | **Done** — min 2 chars, max 80 | `/search`, `/api/search` |
| Empty / unavailable search states | — | **Done** — distinguishes no results from upstream failure | `/search` |

## 9. Personalisation and settings

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Theme preference | Yes | **Done** — light / dark / system with preview cards | `/settings` |
| Time-zone preference | Yes | **Done** — full IANA list, auto-detect option | `/settings` |
| Notification opt-in | Alerts | **Done** — permission request + feedback | `/settings` |
| Favourite teams | Yes | **Done** — add from team/match pages, manage in settings | `/settings` |
| Favourite competitions | Likely | **Done** | `/settings` |
| Favourite matches | — | **Done** | `/settings` |
| Kick-off reminders | Alerts | **Done** — checked while a tab is open | `/settings`, match page |
| Export preferences | No | **Done** — JSON download | `/settings` |
| Import preferences | No | **Done** — sanitation, malformed fields ignored, feedback | `/settings` |
| Reset preferences | Yes | **Done** — two-step confirmation | `/settings` |
| Account / cloud sync | None | **N/A by design** | — |
| No tracking identifier | Yes | **Done** — no analytics SDK | Whole app |

## 10. Reliability and platform

| Capability | Reference site | Touchline | Where |
| --- | --- | --- | --- |
| Server-rendered data | Yes | **Done** | App Router |
| Loading skeletons | Basic | **Done** — page, route and section level | `Suspense`, `PageSkeleton`, `loading.tsx` |
| Empty states with next action | Basic | **Done** | `EmptyState` |
| Error boundary | Basic | **Done** — route error + global error | `error.tsx`, `global-error.tsx` |
| 404 page | Yes | **Done** | `not-found.tsx` |
| Upstream timeout / retry / de-dupe | Unknown | **Done** | `http.ts` |
| Public JSON API | No | **Done** | `/api/*`, `/api-docs` |
| Health endpoint | No | **Done** — liveness + upstream latency | `/api/health` |
| HTTP cache headers | Unknown | **Done** — `s-maxage`, `stale-while-revalidate` | `api-response.ts` |
| Input validation | Unknown | **Done** — shared validators | `validation.ts` |
| SEO metadata / canonicals | Basic | **Done** — per-page metadata, OG/Twitter | `layout.tsx`, pages |
| Sitemap and robots | Not verified | **Done** | `sitemap.ts`, `robots.ts` |
| Web manifest and shortcuts | Not verified | **Done** | `manifest.ts` |
| Accessibility: skip link, focus, ARIA labels | Unverified | **Done** — see design system | `layout.tsx`, components |
| Reduced-motion support | Unverified | **Done** | `globals.css` |
| Responsive breakpoints | Yes | **Done** — 1080 / 900 / 760 / 420 px | `globals.css` |
| RTL | Arabic RTL | **N/A** — English-first LTR | — |
| Advertising | Yes | **N/A by design** | — |

## 11. Data coverage

| Capability | Reference site | Touchline |
| --- | --- | --- |
| Domestic leagues | Yes | **Done** |
| Continental cups | Yes | **Done** |
| International tournaments | Yes | **Done** |
| Qualifiers | Some | **Done** |
| Women's competitions | Unclear | **Done** |
| Youth competitions | Unclear | **Done where ESPN publishes them** |
| Verified competition count | Not stated | **76** |
| Live results source | Proprietary | ESPN public API |
| Rankings source | FIFA | FIFA public API |
| News source | Not observed | ESPN public API |
| Unavailable providers | — | Documented, not bypassed |
