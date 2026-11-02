# i18n conventions — Arabic rollout

The site now supports two UI languages: **English** (`en`, default) and
**Arabic** (`ar`, RTL). This document is the contract every contributor follows.

## Architecture (read-only unless you OWN the file)

- `src/lib/i18n/core.ts` — `Locale` (`"en" | "ar"`), `LOCALES`,
  `LOCALE_CONFIG`, `interpolate()`, `isLocale()`.
- `src/lib/i18n/define.ts` — `defineDomain({ en, ar })` typing helper.
- `src/lib/i18n/domains/<domain>.ts` — one dictionary domain per feature.
- `src/lib/i18n/dict.ts` — assembles the `Dict` type (wired; do not edit).
- `src/lib/i18n/leagues-ar.ts` — Arabic competition-name map +
  `leagueDisplayName(league, lang)`.
- `src/components/i18n/T.tsx` — server-renderable `<T k="domain.key" />`.
- `src/components/providers/PreferencesProvider.tsx` — stores `lang`, applies
  `<html lang/dir>`, exports `useI18n()`.

## Public API

```tsx
import { useI18n, T, leagueDisplayName } from "@/lib/i18n";

const { lang, dir, setLang, t, f, d, hydrated, timeZone } = useI18n();
```

- `t` — typed dictionary for the active language. Access directly:
  `t.matches.kickoff`. (For dot-path rendering from a server component, use
  `<T k="matches.kickoff" />`.)
- `f(text, vars)` — interpolation: `f(t.x.inDays, { n: 3 })` fills `{n}`.
- `d` — locale-aware date/time formatters for client components:
  `d.date(value, options?)`, `d.time(value)`, `d.dateTime(value)`,
  `d.weekday(value)`, `d.monthTitle(year, month)`. Use these instead of
  `@/lib/date` format functions in client components (they default to
  English); `<LocalTime>` already localises itself — keep using it for any
  `<time>` element.
- `lang` / `dir` — active locale and text direction `"ltr" | "rtl"`.
- `setLang(locale)` — switch and persist the language.
- `leagueDisplayName({ slug, name }, lang)` — wraps competition names so the
  ~76 tracked competitions show their Arabic names. Use it everywhere a
  league/competition name from data is displayed:
  `leagueDisplayName(match.league ?? match.competition.slug ? {slug, name} : null, lang)`.
  For a match: `leagueDisplayName({ slug: match.league?.slug ?? match.competition.slug, name: match.competition.name }, lang)`.

## Rules for translating UI

1. **All user-visible strings go through the dictionary.** No English string
   may remain hard-coded in components or pages you own (except `metadata`
   exports — see below).
2. **Both `en` and `ar` sides must exist and match structurally** — identical
   keys, same array order/length, identical `{token}` placeholders. `ar`
   arrays follow `en` order.
3. **Reuse `common`** (`t.common.*`) for shared labels (states, favourites,
   share, remind, today/tomorrow, countdown, theme, language…). Read
   `src/lib/i18n/domains/common.ts` first; do not duplicate its vocabulary.
   Other feature domains may be READ for cross-file needs (e.g. the calendar
   page can read `t.matches.*` for DateNav-adjacent labels) but never edited
   outside ownership.
4. **Keep brand + data strings untranslated**: team names, player names,
   venues, cities, broadcasters, scores, clocks, URLs, `SITE_NAME`.
5. **Arabic copy quality**: Modern Standard Arabic, established football
   terminology, concise UI tone, no diacritics, no transliteration of common
   English UI words. Examples: Live=مباشر, Fixtures=المواعيد, Standings=الترتيب,
   Top scorers=الهدافون, Assists=الصناعة, Kick-off=بداية المباراة,
   Home/Away=على أرضه/خارج أرضه (or أرضي/بعيد), Form=آخر الأداء (or النتائج
   الأخيرة), Head-to-head=المواجهات المباشرة, Lineups=التشكيلة.
6. **`metadata` exports stay English** (server-rendered; out of scope v1).
7. **Do not change URL/route structure, data fetching, or component APIs**
   beyond what translation requires. Keep diffs tight; keep code style
   (double quotes, `cn()` helper, existing class names, `data-*` conventions).
8. **Bidi isolation**: wrap numeric/mixed strings that contain separators —
   score lines like `${home.score}–${away.score}`, clocks like `45'+2`,
   seasons like `2025/26`, ranges like `2 - 0` — in
   `<span className="u-dir-ltr">…</span>` so they render correctly inside RTL.
   Pure single numbers (dates, "19:45") don't need wrapping.
9. **Directional icons**: add `data-flip="rtl"` to lucide
   `ArrowRight`, `ArrowUpRight`, `ChevronLeft`, `ChevronRight`,
   `ArrowLeft`, `ChevronsLeft/Right`, `MoveRight`, `PanelLeft`, etc. —
   anywhere the icon encodes direction (e.g. "view all" arrows, date
   steppers). CSS mirrors them under `html[dir="rtl"]`.
10. **`"use client"` placement**: presentational leaf components that render
    text may be flipped to `"use client"`. They must not import
    `@/lib/api`, `next/server`, or perform async work — pass data as
    serializable props from the server parent (`strings, numbers, arrays,
    plain League objects` are fine as props).
11. **Server pages with inline English text**: extract the text-bearing
    markup into a sibling client component (e.g. `app/matches/MatchesPageView.tsx`)
    OR use `<T k="…" />` inline for small bits. Keep `export const metadata`
    and data fetching server-side. Loading/error skeletons need no text
    (aria-hidden), keep them.
12. **Aria/title attributes are user-visible text** — translate them too.
13. **Never edit**: `src/lib/i18n/**` (other than your own domain files),
    `Providers`, `layout.tsx`, `SiteHeader`, `SiteFooter`, `Primitives`,
    globals.css, routes, sitemap/robots, `package.json`. Don't run global
    `tsc`/`build` (other files are being edited concurrently); lint only your
    own files if you want:
    `npx eslint src/app/<your files>`.

## Adding dictionary entries — example

```ts
// src/lib/i18n/domains/home.ts
import { defineDomain } from "../define";

export const home = defineDomain({
  en: {
    kicker: "Live now",
    heroTitle: "Every match, zero noise",
    stats: { matches: "Matches", goals: "Goals" }, // grouped sub-objects
    faqs: [{ q: "…", a: "…", }],                   // arrays stay parallel
    trackedLeagueCount: "{total} competitions tracked", // {token} placeholders
  },
  ar: {
    kicker: "مباشر الآن",
    heroTitle: "كل مباراة، بلا ضجيج",
    stats: { matches: "المباريات", goals: "الأهداف" },
    faqs: [{ q: "…", a: "…" }],
    trackedLeagueCount: "{total} مسابقة متابعة",
  },
});
```

Then in a client component:

```tsx
const { t, f } = useI18n();
<p className="kicker">{t.home.kicker}</p>
<h1>{t.home.heroTitle}</h1>
<span aria-label={f(t.home.trackedLeagueCount, { total: 76 })} />
```

And from a server page: `<T k="home.heroTitle" as="h1" />`.