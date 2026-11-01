# Design system

Touchline uses a bespoke design system: one global stylesheet (`src/app/globals.css`), custom properties as tokens, and small React primitives. It is not based on Tailwind, a component library, or any JDwel stylesheet.

## 1. Design principles

1. **Editorial, not dashboard.** Generous whitespace, strong display type and a paper-like background make a data-heavy product calm.
2. **The score is the interface.** Status, teams and score are ordered for scanning; decoration never competes with the result.
3. **One accent.** Lime marks action, emphasis and live energy. It is not used for every border or label.
4. **Light first, dark complete.** Both themes are fully specified, not inverted afterthoughts.
5. **Honest surfaces.** Skeletons, empty states and errors are designed states, not fallbacks.
6. **Motion is feedback.** Short, eased transitions on hover, focus and reveal; no looping decoration except the live pulse, which respects reduced motion.

## 2. Colour tokens

Defined on `:root` and overridden under `[data-theme="dark"]`.

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bg` | `#f4f2ea` | `#0b1310` | Page background |
| `--bg-elevated` | `#fbfaf5` | `#0f1913` | Raised page sections |
| `--surface` | `#ffffff` | `#121d16` | Cards and panels |
| `--surface-soft` | `#ece9df` | `#18251c` | Subtle fills and hovers |
| `--surface-ink` | `#101a12` | `#eef4e8` | Inverted blocks |
| `--ink` | `#111b13` | `#f1f5ea` | Primary text |
| `--ink-soft` | `#2c372e` | `#d4dcd0` | Secondary strong text |
| `--muted` | `#697267` | `#9aa89d` | Descriptions and metadata |
| `--faint` | `#93998f` | `#6c7a70` | Disabled / tertiary |
| `--line` | `#dcd8cb` | `#24332a` | Default borders and dividers |
| `--line-strong` | `#b9b5a7` | `#3a4d3f` | Emphasised borders |
| `--accent` | `#c9f05b` | `#cdf470` | Primary accent fill |
| `--accent-strong` | `#aadd2f` | `#b7e94b` | Accent hover / focus ring |
| `--accent-soft` | `#edf8c9` | `#223217` | Accent tint |
| `--accent-ink` | `#131c09` | `#101a08` | Text on accent |
| `--live` | `#cf4527` | `#ff7f61` | Live / danger |
| `--live-soft` | `#fbe5de` | `#3a1912` | Live tint |
| `--win` | `#1f7a4d` | `#7bdca6` | Win / positive |
| `--win-soft` | `#def2e6` | `#122c1f` | Win tint |
| `--draw` | `#8a671c` | `#e5c66d` | Draw / caution |
| `--draw-soft` | `#f6edcf` | `#2e2714` | Draw tint |
| `--loss` | `#b23a2c` | `#ff9182` | Loss / negative |
| `--loss-soft` | `#fae4e0` | `#351815` | Loss tint |

Colour is always paired with text or an icon. State is never communicated by colour alone.

### Theme bootstrap

`layout.tsx` injects a tiny blocking script before the body renders. It reads `touchline.theme` from `localStorage`, falls back to the OS `prefers-color-scheme`, and sets `data-theme` on `<html>`. This prevents a light flash for dark-mode visitors. `suppressHydrationWarning` is set on `<html>` for that attribute.

## 3. Typography

| Token | Value |
| --- | --- |
| `--font-display` | `"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif` |
| `--font-body` | `"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif` |

Both tokens point at the same family: Plus Jakarta Sans carries headings and body copy across every page. It is self-hosted through Fontsource, so there is no external font request. Swapping the typeface later is a one-variable change in `globals.css`.

| Style | Size | Notes |
| --- | --- | --- |
| Spotlight kick-off / score | `clamp(2.6rem, 4.8vw, 3.8rem)` | `line-height: 0.95`, `letter-spacing: -0.07em`, tabular figures |
| Page title | `clamp(2.1rem, 4.5vw, 3.5rem)` | Section landing pages |
| Section title | `clamp(1.35rem, 2.4vw, 1.85rem)` | `letter-spacing: -0.035em` |
| Body | `16px / 1.55` | Plus Jakarta Sans, antialiased |
| Description | `13.5–15.5px` | Muted, max 580–620px |
| Metadata / eyebrow | `10–12px` | Uppercase kicker, wider tracking |
| Table / row data | `12–13px` | Tabular figures where numbers align |

Display headings use `font-weight: 600–700` and tight negative tracking. Body copy stays at normal weight for contrast.

## 4. Spacing, radius and elevation

| Token | Value |
| --- | --- |
| `--container` | `1180px` |
| `--header-height` | `74px` |
| `--radius-xs` | `8px` |
| `--radius-sm` | `12px` |
| `--radius` | `18px` |
| `--radius-lg` | `26px` |
| `--radius-xl` | `36px` |
| `--ease` | `cubic-bezier(0.22, 1, 0.36, 1)` |

Shadows:

- `--shadow-sm`: hairline lift for rows and small cards.
- `--shadow-md`: deeper elevation for menus and feature panels.
- `--shadow-accent`: lime-tinted glow for accent CTAs.

Spacing is not tokenised globally; components use a consistent 4px-derived rhythm (4, 6, 8, 10, 12, 14, 18, 22, 30, 44, 64). Page shell padding is `34px 0 88px`, reduced on mobile.

## 5. Layout

- `.site-main` uses `width: min(100% - 40px, 1180px)` and centres with `margin-inline: auto`.
- `.split-layout` is a two-column editorial grid (`1.45fr / 0.8fr`) with a sticky rail.
- `.competition-grid`, `.nw-grid`, `.grid-4` and `.stat-strip` provide responsive card grids.
- `.table-wrap` owns horizontal scrolling for wide tables; the page itself never scrolls sideways.
- `.match-row` is a three-column grid: status (`62px`), teams (`minmax(0, 1fr)`), score/kick-off (`auto`).
- `.mc-page` wraps the match centre: a dark `MatchDayHeader` masthead, a sticky `.mc-toolbar`, an optional light `.mc-live` board and the `.mc-groups` competition board.
- `.mc-groups` is a two-column grid of `.mc-group` cards with `align-items: start`, so each competition keeps its own height; below 900 px it becomes one column. CSS multi-column flow was tried and rejected because balancing split the board 19/13 rows.
- `.mc-row` aligns a fixed time column, a shared team column and a right-aligned score column, so scores line up between neighbouring cards. The favourite control sits beside the row link, not inside it.
- `.home-hero__grid` is the front-page grid: a `1.62fr` match spotlight beside a `0.68fr` "The day" panel, stacking below 1080 px.
- `.match-layout` pairs the match main column with a sticky fact rail (`.match-rail`); below 1080 px the rail moves under the main column as a two-card grid.
- `.match-main` stacks summary panels with an 18 px gap, so a pre-match summary can show form, head-to-head and events as separate cards.
- `.rk-page` and `.cal-page` share a dark masthead (`.rk-hero` / `.cal-hero`): a top bar with eyebrow and actions, a split title block and a side panel, then a full-width stat strip. The hero body is a `1.5fr / 0.85fr` grid that collapses to one column below 1080 px.
- `.rk-hero__body` pairs the split "World / ranking" title and gender switch with a `.rk-leader` panel; the leader repeats the first row of the board so the top of the table is readable without scrolling.
- `.rk-hero__stats` and `.cal-hero__stats` are four equal stat cells on a darker band, switching to a 2×2 grid below 760 px. The live cell in the calendar uses the red live tone plus a pulsing dot.
- `.rk-filters` is a sticky chip bar (`top: calc(var(--header-height) + 8px)`), holding the confederation chips and a right-aligned "in view" count.
- `.rk-podium__grid` is a three-card top-three strip (first card tinted with the accent); it becomes one column below 760 px. `.rk-table` renders the full board with a rank badge, confederation pill, points value plus a `.rk-points__track` bar and the previous rank/movement columns. Below 480 px it switches to `table-layout: fixed` and drops the confederation column.
- `.cal-layout` is a named-area grid: `"grid side" / "guide side"`, so the month grid and the guide fill the left column while the selected-day panel and export tools stack in the right rail. Below 1080 px it collapses to `"grid" "side" "guide"`.
- `.cal-months` is the 12-month strip inside the hero (12 columns, 6×2 below 560 px). `.cal-grid` is a seven-column month grid; `.cal-day` is a link with a day number, a fixture dot and a count, with today/selected/outside/live states.
- `.cal-day-panel` lists the selected day with kick-off or live clock, competition, teams, score and match-centre link; `.cal-row` is a `44px / 1fr / 16px` grid that tightens on mobile.
- `.cal-export` holds the month and day `.ics` buttons plus the timezone note; `.cal-guide` carries the provider explanation.
- `.nw-page` is the newsroom. Its dark `.nw-hero` masthead reuses the rankings/calendar bar-title-stat anatomy: an eyebrow bar with a route action, a split "The stories / behind the scores" title beside a `.nw-top` leading-story panel, and a four-cell stat strip (stories, bylines, topics, latest update).
- `.nw-front` pairs the lead card with `.nw-rail` (`1.55fr / 0.85fr`); the rail stacks `.nw-latest` (numbered headline list with thumbnails) above `.nw-about` (feed attribution and provider link). Below 1080 px the lead card takes the full width and the rail becomes a two-card row, then one column below 760 px.
- `.nw-card` is a bordered story card: 16:9 media with a section chip (or a monogram placeholder), date/byline meta, clamped headline, clamped summary and a "Read at ESPN" foot. The lead variant enlarges the headline and summary. The whole card is one external link with `target="_blank"` and `rel="noopener noreferrer"`; stories without a URL render as a plain `article`.
- `.nw-wire` heads the remaining grid with a title, description and story count; `.nw-grid` is three equal columns, two below 900 px and one below 760 px.

Breakpoints:

| Width | Behaviour |
| --- | --- |
| `≤ 1080px` | Feature grids reduce to two columns; split layouts tighten. |
| `≤ 900px` | Split layouts and side rails stack; header navigation collapses; the competition board becomes one column. |
| `≤ 760px` | Mobile shell padding, single-column grids, condensed match rows, hidden non-essential header controls. |
| `≤ 560px` | The board heading stacks above its competition count; the calendar month strip becomes a 6×2 grid. |
| `≤ 480px` | The rankings table fixes its column widths and hides the confederation column. |
| `≤ 420px` | Compact typography and control sizes; tab counts and the "Today" chip hide. |

## 6. Components

### Primitives (`src/components/ui/Primitives.tsx`)

- `PageHeader` — eyebrow, title, description, optional actions.
- `SectionHeader` — kicker, title, description, optional "see all" link.
- `EmptyState` — icon, title, description, optional action and children.
- `Skeleton` — sized shimmer block.
- `Badge` — tone-based status label.
- `Stat` / stat strip patterns.

### Navigation and shell

- `SiteHeader` — sticky, opaque, active-route detection, favourites count, mobile panel.
- `BrandMark` — original geometric mark; no club or reference-site imagery.
- `ThemeToggle` — cycles light/dark/system with accessible label.
- `SiteFooter` — explore/project/legal groups plus provider links.

### Football components

- `MatchDayHeader` — dark matchday masthead for `/matches`: eyebrow with actions, split day/month/year date, fixture lede, four-stat tally, previous/next day arrows, the Monday-first week strip and `DateJump`. The date parts are separate spans because the display tracking is negative and would otherwise close the gap in "1 November".
- `MatchesExplorer` — client filtering by competition, state and favourites; renders the sticky toolbar, live board, two-column competition board, group paging/collapse and load-more.
- `LiveMatchCard` — light live scoreboard card with competition logo, score-aware link label, venue and match-centre CTA.
- `MatchCentreRow` — one fixture line in the competition board: aligned kick-off/status, shared team column, separate score column with winner/loser states, and the favourite control outside the link.
- `GroupedMatches` — competition grouping with counts.
- Home front page — `HomeHero` composes `SpotlightMatch` (match-of-the-day spotlight), `DayPanel` ("The day") and the shortcut ticker. Spotlight selection is derived from competition tier, team points per game, match state, knockout significance, derby keywords and broadcast/venue presence; no club names are hardcoded.
- Match centre — `MatchUtility`, `MatchBoard`, segmented `LinkTabs`, `MatchPanel`, `EventTimeline`, `StatsCompare`, `LineupCard`, `HeadToHeadList`, `FormPanels`, `FormGuide` (the summary snapshot), `MatchFacts` and `MatchRail`.
- `FormChips` / `FormGuide` — provider form strings rendered as W/D/L chips with a tally and points total; the summary reuses the same provider form shown on the scoreboard.
- `CompetitionCard` — directory card; favourite button sits outside the card link.
- `NewsCard` / `NewsGrid` / `NewsList` / `NewsSkeleton` — external story cards (lead and grid variants), the wire grid, the compact list used by the match centre, and the layout-matched newsroom skeleton shared by `loading.tsx` and the route's Suspense fallback.
- `DateNav` / `DateJump` — previous/next day and validated date input.
- `CalendarMenu` — Google, Outlook and `.ics` actions.
- `RankingsHero` / `Podium` / `RankingsTable` / `RankingsSkeleton` — rankings masthead with gender switch, leader panel and stats; top-three strip; full board with points bars and movement; layout-matched skeleton.
- `CalendarHero` / `MonthGrid` / `DayPanel` / `CalendarSkeleton` — calendar masthead with month strip and stats; month grid with day states; selected-day fixture panel; layout-matched skeleton.
- `LocalTime` — renders a timestamp in the saved IANA time zone, with a server fallback.
- `Countdown` — relative time to kick-off.
- `FavoriteButton` — team, league or match star with toast feedback.
- `ShareButton` — Web Share API with clipboard fallback.
- `RemindButton` — local kick-off reminder.
- `RefreshTicker` — server refresh only while the tab is visible.

### Forms and controls

- Pill buttons (`.btn`, `.btn--accent`, `.btn--ghost`, `.btn--danger`), icon-only variants.
- Text inputs, selects and toggles with visible focus rings.
- `.query-select` for URL-persisting server filters.
- Inline validation messages with `aria-describedby` and `aria-invalid`.
- Toast notifications for transient success/failure.

## 7. States

Every data surface has four explicit states:

1. **Loading** — skeletons that match the final layout. Route-level `loading.tsx` and section-level `<Suspense>`.
2. **Ready** — data rendered with provider attribution.
3. **Empty** — the provider returned no records; copy explains why and offers a next action.
4. **Error** — the provider failed or timed out; copy distinguishes this from empty data and offers retry or an alternate route.

Optional match blocks (events, form, head-to-head, statistics, lineups) render `PanelEmpty` rather than collapsing the page. The summary hides the key-events card when no events exist but form or head-to-head data is available, and labels pre-match statistics as season totals rather than match totals.

## 8. Accessibility

- Skip link to `#main`.
- Semantic landmarks: `header`, `nav`, `main`, `footer`, `section`, `article`.
- One `h1` per page; heading levels are not skipped.
- `:focus-visible` uses a 3px `--accent-strong` ring with 3px offset.
- Icon-only controls have `aria-label`; decorative icons use `aria-hidden`.
- Status is text + colour, never colour alone.
- Tabs expose the current tab via `aria-current`.
- The mobile menu closes on Escape and restores body scroll.
- Live regions are used for toasts and validation feedback.
- `prefers-reduced-motion` removes animation and smooth scrolling.
- Tables include captions or labelled headings and scroll within their own container.
- Images are lazy-loaded with empty alt text when decorative (news thumbnails next to a headline).

## 9. Voice and content

- Direct, calm, specific. No hype, no invented superlatives.
- Numbers are formatted with `Intl` helpers and never rounded misleadingly.
- Empty-state copy says what is missing and what still works.
- Time is always presented in the visitor's chosen time zone, with an explicit fallback.
- Provider attribution appears where data is shown, not only in legal pages.

## 10. Originality

The visual system was authored for this project. It does not reuse JDwel's colour palette, typography, layout, iconography, component structure, copy or assets. Similarities are limited to universal football UI patterns: a score row, a league table, a fixture list.
