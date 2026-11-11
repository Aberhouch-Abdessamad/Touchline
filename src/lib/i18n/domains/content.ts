import { defineDomain } from "../define";

/**
 * Static content pages: about, FAQ, privacy, API docs, search, contact, 404
 * and the route-error screen. Long prose lives per page under one key.
 *
 * Inline conventions inside strings:
 * - `[label](/href)` renders as an internal `<Link>` (see `RichText`).
 * - `` `code` `` renders as a `<code>` run; code, paths and JSON stay verbatim
 *   in both languages.
 * - `{token}` placeholders are filled with `f()`.
 */
export const content = defineDomain({
  en: {
    about: {
      eyebrow: "About the project",
      title: "A quieter way to follow football",
      description:
        "Touchline is an independent, non-commercial football data project. The goal is simple: make the score, the table and the next fixture easy to find, without pop-ups, autoplay video or numbers that were never there.",
      actions: {
        todaysMatches: "Open today's matches",
      },
      onPage: "On this page",
      navAria: "About sections",
      badge: "{n} competitions",
      note: "A non-commercial project. No ads, no accounts, no tracking identifiers.",
      what: {
        heading: "What this site does",
        p1: "Touchline covers live and scheduled football across {n} competitions: domestic leagues, continental cups, international tournaments and qualifiers. Each competition page carries a live table, season leaderboards and the full fixture list. The match centre adds key events, team statistics, lineups, head-to-head records and recent form where the provider publishes them.",
        p2: "Beyond the match centre, you can browse any day or month, export fixtures to Google Calendar, Outlook or an `.ics` file, follow the official FIFA men's and women's world rankings, and star the teams and competitions you care about. Stars and reminders are stored locally, which is why there is no sign-in.",
      },
      how: {
        heading: "How the data flows",
        p1: "The browser never talks to ESPN or FIFA directly. Instead, every page reads from a same-origin route under `/api`. Those routes validate input, call the upstream provider, normalise the response into a stable shape, and cache the result for an appropriate number of seconds.",
        steps: [
          "A page requests fixtures, a table, a match summary or a ranking.",
          "The server route checks parameters and rejects anything malformed.",
          "The upstream payload is normalised — missing branches become empty arrays, not invented records.",
          "The response is cached so repeat views are cheap and the providers are not hammered.",
          "The page renders on the server; only interactive pieces such as filters, stars and reminders hydrate in the browser.",
        ],
      },
      sources: {
        heading: "Where the numbers come from",
        p1: "Match, table, fixture, team, news and search data come from ESPN's public soccer APIs. World rankings come from FIFA's public ranking API. Competition metadata — names, countries, crests and slugs — is generated once from ESPN's public core API and stored in the project so the catalogue is fast and stable.",
        p2: "Neither provider sponsors this project, and Touchline is not affiliated with either. Provider names appear only for attribution. If you are from a provider and want a change, [get in touch](/contact).",
      },
      limits: {
        heading: "Known limitations",
        items: [
          "Live data can lag the broadcast by seconds to minutes. Refreshing the page asks for the latest cached response.",
          "Cup competitions and early-season fixtures often have no table or scorer board. Those pages explain the gap rather than showing an empty table.",
          "Some leagues return no data for older seasons. The season selector reflects what the provider actually publishes.",
          "Browser notifications only fire while a Touchline tab is open. Calendar export is the dependable reminder.",
          "The public catalogue deliberately excludes competition slugs that failed validation, instead of shipping links that would 404.",
        ],
      },
      principles: {
        heading: "Principles",
        items: [
          {
            title: "Real data or nothing",
            body: "Every score, table row and ranking comes from a public provider response. When a field is missing, the page says so instead of filling the gap with a plausible guess.",
          },
          {
            title: "Fast by default",
            body: "Pages render on the server, shared responses are cached for seconds to hours depending on how often they change, and the browser only receives what it needs to render.",
          },
          {
            title: "No account, no profiling",
            body: "There is no registration, no newsletter and no advertising identifier. Preferences live in your browser's localStorage and never leave it.",
          },
          {
            title: "Respectful of upstreams",
            body: "We use documented, publicly reachable endpoints at modest rates. Where a site blocks non-browser clients, we document the limitation rather than working around it.",
          },
        ],
      },
      stack: {
        heading: "How it is built",
        p1: "Touchline runs on Next.js with the App Router, React server components and TypeScript. Styling is a hand-written design system — no UI kit, no template. Icons come from Lucide and the two typefaces are self-hosted variable fonts. Calendar files are generated on the server from real fixture data.",
        p2: "The visual language is deliberately editorial: warm paper, dark ink, one lime accent, tabular numerals for scores and a low-glare dark theme for evening use. It is an original design built for this project.",
      },
      next: {
        heading: "Where to go next",
        p: "Start with [today's matches](/matches), browse the [competition directory](/competitions), or read the [FAQ](/faq) if something looks off. The [API documentation](/api-docs) explains the public routes if you want to build on the same data.",
      },
    },
    faqs: {
      eyebrow: "Help centre",
      title: "Frequently asked questions",
      description:
        "Short, honest answers about where the data comes from, how favourites and reminders are stored, and what to do when a provider comes up short.",
      askQuestion: "Ask a question",
      onThisPage: "Jump to",
      navAria: "FAQ groups",
      apiDocsLink: "API documentation",
      privacyNoteLink: "Privacy note",
      searchSite: "Search the site",
      stillStuck:
        "Still stuck? The contact form composes a real email in your mail app.",
      groups: [
        {
          heading: "Data",
          items: [
            {
              q: "Where do the scores and tables come from?",
              a: "ESPN's public soccer APIs supply scores, fixtures, tables, team profiles, match summaries and news. FIFA's public ranking API supplies the men's and women's world rankings. Competition metadata is cached from ESPN's core API when the project is generated. Every page names its source.",
            },
            {
              q: "How fresh is live data?",
              a: "Fixture lists are cached for around 30 seconds, tables for two minutes and rankings for six hours. A page load asks for the latest cached response, so a live score can trail the broadcast by a short interval. Reloading is the way to force a fresh request once the cache window has passed.",
            },
            {
              q: "Why is a match, table or scorer list missing?",
              a: "The provider did not publish it. Pre-season fixtures often have no table, cup competitions frequently have no season-long scorer board, and very old matches fall out of the summary index. Touchline shows an explicit empty state with the reason instead of a blank panel or a made-up value.",
            },
            {
              q: "Why are some competitions absent?",
              a: "The catalogue only includes competition slugs that were verified against the live provider. A handful of ESPN slugs return errors for every season, so they are left out rather than shipped as dead links. Coverage currently stands at 76 competitions across six confederations.",
            },
            {
              q: "Do you cover women's football?",
              a: "Yes. The competition directory can be filtered to women's competitions, several women's leagues are in the catalogue, and the rankings page has a dedicated women's board.",
            },
          ],
        },
        {
          heading: "Using the site",
          items: [
            {
              q: "Do I need an account?",
              a: "No. There is no registration, sign-in or newsletter. Favourites, reminders and display preferences are stored in your browser's localStorage. Use [Settings](/settings) to export them as JSON if you want a backup.",
            },
            {
              q: "How do favourites work?",
              a: "The star button appears on match, team and competition pages. On the [match centre](/matches), the favourites filter narrows the day's fixtures to the teams and matches you starred. On [Competitions](/competitions), starred competitions can be isolated with the favourites toggle. Manage the whole list in [Settings](/settings).",
            },
            {
              q: "Which time zone are kick-off times shown in?",
              a: "By default, the zone your browser reports. You can override it in [Settings](/settings); the choice applies to match rows, the scoreboard, calendar exports and reminder labels. Calendar files themselves use UTC timestamps so they land correctly anywhere.",
            },
            {
              q: "How do reminders work?",
              a: "The bell button on a match saves a reminder locally and asks the browser for notification permission. While a Touchline tab is open, the app checks pending reminders every 30 seconds and alerts you within ten minutes of kick-off. Browsers throttle background tabs, so add the match to your calendar as well if the alert matters.",
            },
            {
              q: "How do I export fixtures to my calendar?",
              a: "On a match page, open the calendar menu for Google Calendar, Outlook or a downloaded `.ics` file. The [calendar page](/calendar) exports a whole month or a single day. Exports contain the kick-off time, competition, round and venue when the provider supplies them.",
            },
            {
              q: "Does search cover every team?",
              a: "Search matches competition names from the local catalogue and asks ESPN for teams. If the team endpoint is unavailable, the results explain that only competitions are shown. Very small or defunct clubs may not be indexed upstream.",
            },
          ],
        },
        {
          heading: "Privacy & technical",
          items: [
            {
              q: "What is stored in my browser?",
              a: "Three keys: your theme choice, your preferences object (time zone, notification choice, favourites, reminders), and nothing else. There are no analytics cookies. The [privacy note](/privacy) lists the exact fields.",
            },
            {
              q: "Can I move my preferences to another device?",
              a: "Yes. Export the JSON file from [Settings](/settings) and import it on the other device. Unknown or malformed fields are discarded, so an edited file will not corrupt the stored state.",
            },
            {
              q: "Is there a public API?",
              a: "The same-origin routes the site uses are documented at [API documentation](/api-docs). They return normalised JSON with cache metadata. They are intended for this site's front end; there is no API key or commercial SLA.",
            },
            {
              q: "Why does the site sometimes say data is unavailable?",
              a: "Upstream providers occasionally rate-limit or time out. Touchline reports the failure and offers a retry link rather than showing stale numbers as if they were live. The `/api/health` route reports the same state programmatically.",
            },
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "Privacy",
      title: "Your data stays in your browser",
      description:
        "Touchline has no accounts, no analytics cookies and no server-side profile. This page lists every piece of information the site stores and how to remove it.",
      onThisPage: "On this page",
      navAria: "Privacy sections",
      summary: {
        heading: "The short version",
        quote:
          "There is no sign-up, no tracking script, no advertising network and no database of visitors. Preferences are kept in your browser's localStorage. Clearing site data deletes them permanently.",
      },
      stored: {
        heading: "What is stored locally",
        intro:
          "The site writes only the following keys. They are scoped to the Touchline origin and are not readable by other websites.",
        caption: "Local storage keys and their contents",
        cols: { key: "Key", contents: "Contents", why: "Why" },
        rows: [
          {
            fields: "One of light, dark or system.",
            purpose: "Applies your theme before the page paints, avoiding a flash.",
          },
          {
            fields:
              "Theme, time zone, notification choice, favourite teams, favourite competitions, favourite matches, match reminders.",
            purpose:
              "Personalises match filters, competition pins, kick-off times and reminder alerts.",
          },
        ],
        extra: {
          keyNote: "(none currently)",
          fields: "No analytics, advertising or session identifiers are written.",
          purpose: "The project does not include a tracking script.",
        },
      },
      notCollected: {
        heading: "What is not collected",
        items: [
          "No name, address, phone number or account credentials.",
          "No email address, unless you choose to send one by email.",
          "No analytics identifier, fingerprint, session recording or cross-site tracker.",
          "No advertising cookies. The site does not embed ad networks or social pixels.",
          "No server-side history of which matches you viewed. Pages are rendered per request and are not tied to a user identity.",
        ],
      },
      requests: {
        heading: "Requests to other servers",
        p1: "Pages and API routes call ESPN's public soccer APIs and FIFA's public rankings API. Those requests originate from the Touchline server, not from your browser, so your IP address is not shared with the providers for page rendering.",
        p2: "Two things do reach third-party servers from your browser: team and competition crests are loaded from the provider's image CDN, and following an attribution link opens the provider's site under their own privacy policy. Fonts are self-hosted, so no font CDN is contacted.",
      },
      email: {
        heading: "If you send an email",
        p: "The [contact form](/contact) validates your message in the browser and opens it in your mail app. Nothing is transmitted to Touchline's server, and no copy is stored. What happens next depends on your email provider and ours.",
      },
      control: {
        heading: "Exporting and deleting",
        p: "Open [Settings](/settings) to download a JSON copy of your preferences, import them on another device, or reset everything. You can also clear the site's data from your browser settings; Touchline will simply start from its defaults next time.",
        exportReset: "Export or reset preferences",
        readFaq: "Read the FAQ",
      },
      children: {
        heading: "Children",
        p: "The site is a general-audience sports reference and does not knowingly collect personal information from anyone, including children. There is nothing to sign up for.",
      },
      changes: {
        heading: "Changes to this note",
        p: "If the site ever adds a feature that changes what is stored, this page will be updated before that feature ships. The current version stores only the two localStorage keys listed above.",
      },
      contact: {
        heading: "Contact",
        p: "Questions about this note can go through the [contact form](/contact). Because there is no visitor database, a deletion request is best handled by clearing site data in your browser — there is no server-side record to remove.",
      },
      finalNote:
        "Remember: clearing browser storage also removes saved favourites and reminders. Export a backup first if you want to keep them.",
    },
    apiDocs: {
      eyebrow: "Developers",
      title: "Public JSON routes",
      description:
        "Touchline's front end reads from the same routes documented here. They validate input, normalise upstream payloads and return cache metadata. There is no API key and no commercial SLA.",
      onThisPage: "On this page",
      navAria: "API documentation sections",
      healthCheck: "Health check",
      tryIt: "Try it",
      exampleLabel: "Example:",
      paramsTable: {
        parameter: "Parameter",
        type: "Type",
        description: "Description",
      },
      endpointsHeading: "Endpoints",
      basics: {
        heading: "Basics",
        p1: "Routes are read with `GET` and relative to the site origin; the AI analysis and live-in-play routes additionally accept `POST` to spend an AI call (rate-limited per client). Successful JSON responses use a `{ data, meta }` envelope. Failures use `{ error: { message, status, code } }` with an appropriate HTTP status.",
        cacheP:
          "`Cache-Control` is set per route using `s-maxage` plus `stale-while-revalidate`, and the `X-Data-Source` response header names the provider. The calendar route is the only endpoint that does not return JSON.",
      },
      errors: {
        heading: "Errors and limits",
        items: [
          {
            code: "400",
            text: "a parameter failed validation, such as a malformed date, month or search term.",
          },
          {
            code: "404",
            text: "an unknown competition slug, invalid team or match id, or no upstream profile for that id.",
          },
          {
            code: "502",
            text: "the provider returned an error. `{ error: { code: \"upstream_error\" } }`",
          },
          {
            code: "504",
            text: "the provider timed out. Retry after a short delay.",
          },
        ],
        meteredP:
          "Routes are metered by caching rather than by keys. Please keep automated traffic modest; the upstream providers are public services, not capacity for a third-party product. If you need bulk history, query the providers directly under their own terms.",
      },
      terms: {
        heading: "Attribution and responsible use",
        p1: "Match, table, fixture, team, news and search data belong to ESPN. Rankings belong to FIFA. Competition metadata is derived from ESPN's public core API. Any reuse must keep the provider attribution shown in the `meta.attribution` field and comply with the provider's terms.",
        p2: "Touchline does not proxy private endpoints, bypass access controls or scrape sites that block automated clients. Documented limitations are listed in the project README.",
      },
      catalogue: {
        heading: "Competition slugs",
        p: "Each of the {n} competitions has a stable slug used in paths, such as `eng.1`, `esp.1` or `uefa.champions`. You can list them all with [/api/leagues](/api/leagues), or browse the [competition directory](/competitions). Slugs that failed live validation are not published.",
      },
      endpoints: {
        matches: {
          summary:
            "Fixtures for one calendar day, or a month when `month` is supplied instead of `date`. Defaults to today in UTC.",
          cache: "30 s for a day · 120 s for a month",
          params: [
            "A real calendar date. Invalid dates return 400.",
            "Month fixture list. Ignored when `date` is present. `limited: true` means the provider capped the response.",
          ],
          notes:
            "The month variant may return fewer fixtures than exist because the upstream scoreboard caps a single response. Daily requests are complete.",
        },
        leagues: {
          summary:
            "The verified competition catalogue. Served from cached project metadata, so it never calls upstream.",
          cache: "3600 s",
          params: [
            "Matches name, country, abbreviation or alias.",
            "Exact region, e.g. Europe.",
            "Club or national-team competition.",
            "Competition gender.",
            "Competition format.",
            "Only featured, or only non-featured, competitions.",
          ],
        },
        standings: {
          summary:
            "Live league table for one competition and season, grouped when the provider splits the table.",
          cache: "120 s",
          params: [
            "Catalogue slug, e.g. eng.1.",
            "Season year. Defaults to the competition's current season.",
          ],
          notes:
            "`available: false` means the provider publishes no table for that season; `reason` explains why. A missing slug returns 404.",
        },
        scorers: {
          summary: "Top scorers and assist leaders for a competition season.",
          cache: "120 s",
          params: ["Catalogue slug.", "Season year."],
          notes:
            "Cup competitions frequently return `available: false`. The two boards are independent arrays and may differ in length.",
        },
        fixtures: {
          summary:
            "Every fixture the provider lists for a competition season, ordered by date.",
          cache: "120 s",
          params: ["Catalogue slug.", "Season year."],
        },
        match: {
          summary:
            "Full match summary: scoreboard, key events, statistics, lineups, head-to-head record, recent form, venue, broadcasters and related news.",
          cache: "30 s",
          params: ["Numeric ESPN event id."],
          notes:
            "Optional blocks are omitted or empty when the provider has not published them. That is normal before kick-off.",
        },
        analysis: {
          summary:
            "AI match analysis by Touchline AI over facts assembled in code from ESPN data: win/draw probabilities, predicted score, expected goals, markets and tactical notes. `kind=past` addresses the retrospective of a finished match.",
          cache: "stored document; refreshed only by POST",
          params: [
            "Numeric ESPN event id.",
            "`upcoming` (default) or `past`.",
            "POST only: force a fresh generation.",
            "When `ar`, request the Arabic mirror of the report.",
          ],
          notes:
            "`GET` returns the stored document without spending an AI call; `POST` triggers a rate-limited generation. Anything the provider has not published is labelled as unavailable rather than estimated.",
        },
        live: {
          summary:
            "In-play AI analysis: minute-aware overview, who is dominating, live win probabilities, the next-goal estimate, momentum and the automatic final report after the final whistle.",
          cache: "stored snapshots; refreshed only by POST",
          params: [
            "Numeric ESPN event id.",
            "POST only: force a capture outside the configured interval.",
            "When `ar`, generate the Arabic mirror of the latest snapshot.",
          ],
          notes:
            "`GET` returns every stored capture and, once the match is over, the deterministic final report. `POST` captures on real triggers (score, events, statistics, interval) and appends, never overwrites. Any non-live match answers 409.",
        },
        team: {
          summary:
            "Team profile with its competition, a season fixture list and provider-supplied record summaries.",
          cache: "300 s",
          params: ["Numeric ESPN team id.", "Season year for the schedule."],
          notes: "Returns 404 when ESPN has no profile for that id.",
        },
        rankings: {
          summary:
            "Official FIFA world rankings, with rank, previous rank, movement, points and confederation.",
          cache: "21600 s (6 hours)",
          params: [
            "Ranking board. Defaults to men.",
            "Exact confederation name, e.g. UEFA, CONMEBOL, CAF.",
            "Maximum entries returned. Defaults to 211.",
          ],
        },
        news: {
          summary: "Football news headlines from ESPN's public news feed.",
          cache: "300 s",
          params: ["Article count. Defaults to 12."],
        },
        search: {
          summary:
            "Case-insensitive competition search across the local catalogue plus team results from ESPN search.",
          cache: "120 s",
          params: [
            "At least two characters, maximum 80 after cleaning.",
          ],
          notes:
            "`teamsAvailable: false` means the upstream team search failed; competition results are still returned.",
        },
        calendar: {
          summary:
            "Downloadable iCalendar export for a day or a month. Returns `text/calendar`, not the JSON envelope.",
          cache: "120 s at the CDN",
          params: ["Export a single day.", "Export a whole month."],
          notes:
            "Timestamps are UTC. Fixtures without a confirmed kick-off are omitted rather than guessed.",
        },
        health: {
          summary:
            "Liveness probe. Reports the catalogue size and whether the upstream fixture feed answered, with latency.",
          cache: "no-store",
          notes:
            "A degraded status still returns HTTP 200 so monitoring can tell an app failure from an upstream failure.",
        },
      },
      aside: {
        cards: [
          {
            title: "Cache-first",
            body: "Every route sets an explicit shared-cache window. Repeated reads do not multiply upstream calls.",
          },
          {
            title: "No key required",
            body: "Same-origin routes are open for inspection. There is no secret to leak and no token to rotate.",
          },
          {
            title: "Provider terms apply",
            body: "This documentation is not a licence to redistribute provider data.",
          },
        ],
      },
    },
    search: {
      hero: {
        kicker: "Find anything",
        title: "Search the football world",
        sub: "Competitions from Touchline's verified catalogue and teams from ESPN's public search. Press enter to run a search.",
        searchLabel: "Search competitions and teams",
        placeholder: "Team, competition or country",
        submit: "Search",
        tryLabel: "Try",
      },
      popular: {
        kicker: "Start somewhere",
        title: "Popular competitions",
        action: "All competitions",
      },
      kinds: {
        formats: {
          league: "League",
          cup: "Cup",
          qualifier: "Qualifier",
          friendly: "Friendly",
        },
        gender: { men: "Men", women: "Women" },
      },
      teamFallback: "Club or national team",
      results: {
        kicker: "Results",
        titleSingle: "{n} result for “{query}”",
        titlePlural: "{n} results for “{query}”",
        descriptionOk:
          "Competitions come from Touchline's verified catalogue; teams come from ESPN's public search.",
        descriptionNoTeams:
          "ESPN's team search did not respond, so only competition matches are shown.",
        empty: {
          title: "Nothing matched that search",
          description:
            "Check the spelling, try a shorter name, or browse the competition directory.",
          action: "Browse competitions",
          todaysMatches: "Today's matches",
        },
        competitionsHeading: "Competitions",
        teamsHeading: "Teams",
      },
    },
    contact: {
      eyebrow: "Contact",
      title: "Tell us what is broken or missing",
      description:
        "Touchline is maintained as an independent project. Data corrections, accessibility feedback and competition requests are all welcome.",
      guidesHeading: "What to include",
      guides: [
        {
          title: "Data corrections",
          body: "Include the competition, the date and a link to the page. If a score is wrong, say what it should be and where that comes from if you can.",
        },
        {
          title: "Bug reports",
          body: "Describe what you expected, what happened, and which browser and device you used. A screenshot is welcome but not required.",
        },
        {
          title: "Timing questions",
          body: "Kick-off times follow the time zone saved in Settings. Check that first — most time complaints are a zone mismatch, not missing data.",
        },
      ],
      privacyHeading: "Privacy",
      privacyBody:
        "The form never posts to a server. Your message is composed in your mail app and sent from your own address. The [privacy note](/privacy) explains what the site stores locally.",
      providersHeading: "Provider issues",
      providersBody:
        "Some problems belong upstream. If a whole competition is missing from ESPN's public data, the provider's own feedback channel is the right place.",
      espnSoccer: "ESPN Soccer",
      fifaRankings: "FIFA rankings",
      form: {
        nameLabel: "Your name",
        emailLabel: "Email address",
        topicLabel: "Topic",
        referenceLabel: "Match or competition",
        optional: "(optional)",
        referencePlaceholder: "e.g. Premier League table, 1 Nov",
        referenceHint: "A link or page name helps us find the exact data.",
        messageLabel: "Message",
        messageCounter: "{count}/1500",
        messageCounterMin: "characters · at least 20",
        topics: [
          "Data question",
          "Bug report",
          "Competition request",
          "Accessibility feedback",
          "Privacy request",
          "Something else",
        ],
        nameShort: "Please enter at least two characters.",
        nameLong: "Please keep your name under 80 characters.",
        emailInvalid: "Enter a valid email address so a reply is possible.",
        topicInvalid: "Choose one of the listed topics.",
        referenceLong: "Keep the reference under 200 characters.",
        messageShort: "Add a little more detail — at least 20 characters.",
        messageLong: "Please keep the message under 1500 characters.",
        submit: "Open in mail app",
        copyAddress: "Copy address",
        addressCopied: "Address copied",
        toastValidation: "Check the highlighted fields before sending.",
        toastNoAddress: "No contact address is configured for this deployment.",
        toastCopied: "Contact address copied.",
        toastClipboardFailed:
          "Could not access the clipboard. Select the address manually.",
        composedStatus:
          "Your mail app should have opened with the message ready to send. If nothing happened, copy the address above and send it manually — this page never sends or stores the message itself.",
        infoStatus:
          "This form does not submit to a server. It validates your message and opens it in your own email client, addressed to {email}.",
        mailFooter: "Sent from the Touchline contact form",
        notConfigured: {
          title: "Contact is not configured",
          body: "This deployment has no contact address, so the form cannot compose a message. The site owner can enable it by setting `NEXT_PUBLIC_CONTACT_EMAIL` and restarting the app.",
          note: "The form is intentionally not a fake submission endpoint: nothing is stored on a server, and no email is sent from this page.",
        },
      },
    },
    notFound: {
      code: "404",
      title: "That page is off the pitch",
      body: "The address may be mistyped, or the competition, team or match you were looking for is not in the provider's index. Try the directory, a search, or today's fixtures.",
      actions: { todays: "Today's matches" },
    },
    error: {
      oops: "Oops",
      title: "Something went wrong on this page",
      body: "A data request or a component failed while rendering. Nothing you saved was lost — favourites and settings stay in this browser. Try the page again, or head somewhere that is definitely working.",
      reference: "Reference:",
      actions: { todays: "Today's matches" },
    },
  },
  ar: {
    about: {
      eyebrow: "حول المشروع",
      title: "طريقة أهدأ لمتابعة كرة القدم",
      description:
        "تاتشلاين مشروع مستقل وغير ربحي لبيانات كرة القدم. الهدف بسيط: جعل النتيجة والجدول والمباراة القادمة سهلة الوصول، دون نوافذ منبثقة أو فيديو يعمل تلقائيًا أو أرقام لم تكن موجودة أصلًا.",
      actions: {
        todaysMatches: "افتح مباريات اليوم",
      },
      onPage: "في هذه الصفحة",
      navAria: "أقسام صفحة حول المشروع",
      badge: "{n} مسابقة",
      note: "مشروع غير ربحي. بلا إعلانات، بلا حسابات، بلا معرّفات تتبّع.",
      what: {
        heading: "ماذا يفعل هذا الموقع",
        p1: "يغطي تاتشلاين كرة القدم المباشرة والمجدولة عبر {n} مسابقة: الدوريات المحلية والكؤوس القارية والبطولات الدولية والتصفيات. وتحمل كل صفحة مسابقة جدول ترتيب مباشر وقوائم صدارة الموسم وقائمة المواعيد كاملة. ويضيف مركز المباراة الأحداث الرئيسية وإحصاءات الفريقين والتشكيلات وسجل المواجهات المباشرة وآخر الأداء متى ما نشرها المزوّد.",
        p2: "إلى جانب مركز المباراة، يمكنك تصفح أي يوم أو شهر، وتصدير المواعيد إلى تقويم Google أو Outlook أو ملف `.ics`، ومتابعة تصنيفات الفيفا العالمية الرسمية للرجال والسيدات، وتمييز الفرق والمسابقات التي تهمك بنجمة. وتُحفظ النجوم والتذكيرات محليًا، ولهذا لا يوجد أي تسجيل دخول.",
      },
      how: {
        heading: "كيف تسير البيانات",
        p1: "لا يتخاطب المتصفح مع ESPN أو FIFA مباشرةً قط. بل تقرأ كل صفحة من مسار داخل المصدر نفسه تحت `/api`. وتتحقق هذه المسارات من المدخلات، وتستدعي المزوّد الأصلي، وتوحّد بنية الاستجابة في هيئة ثابتة، وتخزّن النتيجة مؤقتًا لعدد من الثواني يناسبها.",
        steps: [
          "تطلب الصفحة مواعيد، أو جدول ترتيب، أو ملخص مباراة، أو تصنيفًا.",
          "يتحقق مسار الخادم من المعاملات ويرفض أي شيء مشوّه.",
          "توحّد بنية البيانات الواردة من المزوّد — فالفروع الناقصة تصبح مصفوفات فارغة، لا سجلات مختلَقة.",
          "تُخزَّن الاستجابة مؤقتًا فتكون المشاهدات المتكررة خفيفة ولا تُثقل المزوّدين بالطلبات.",
          "تُعرض الصفحة على الخادم؛ ولا تُهيَّأ في المتصفح سوى الأجزاء التفاعلية كالفلاتر والنجوم والتذكيرات.",
        ],
      },
      sources: {
        heading: "من أين تأتي الأرقام",
        p1: "بيانات المباريات والجداول والمواعيد والفرق والأخبار والبحث تأتي من واجهات ESPN العامة لكرة القدم. وتأتي التصنيفات العالمية من واجهة تصنيفات FIFA العامة. أما بيانات المسابقات الوصفية — الأسماء والدول والشعارات والمعرّفات — فتُولَّد مرة واحدة من واجهة ESPN الأساسية العامة وتُخزَّن في المشروع ليبقى الدليل سريعًا وثابتًا.",
        p2: "لا يرعى هذا المشروع أيٌّ من المزوّدين، وتاتشلاين غير تابع لأي منهما. وتظهر أسماء المزوّدين لغرض نسبة البيانات إليها فقط. وإذا كنت تعمل لدى أحد المزوّدين وترغب في تغيير ما، [فواصل معنا](/contact).",
      },
      limits: {
        heading: "القيود المعروفة",
        items: [
          "قد تتأخر البيانات المباشرة عن البث بمقدار ثوانٍ إلى دقائق. ويطلب تحديث الصفحة أحدث استجابة مخزّنة مؤقتًا.",
          "كثيرًا ما تخلو مسابقات الكؤوس ومواعيد مطلع الموسم من جدول ترتيب أو لوحة هدّافين. وتشرح تلك الصفحات سبب غيابهما بدلًا من عرض جدول فارغ.",
          "بعض الدوريات لا تُعيد بيانات للمواسم الأقدم. ويعكس محدد المواسم ما ينشره المزوّد فعلًا.",
          "لا تعمل إشعارات المتصفح إلا ما دام تبويب تاتشلاين مفتوحًا. وتصدير التقويم هو التذكير الذي يمكن الاعتماد عليه.",
          "يستبعد الدليل العام عمدًا معرّفات المسابقات التي رسبت في التحقق، بدلًا من نشر روابط تنتهي بخطأ 404.",
        ],
      },
      principles: {
        heading: "المبادئ",
        items: [
          {
            title: "بيانات حقيقية أو لا شيء",
            body: "كل نتيجة وكل صف في الجدول وكل تصنيف تأتي من استجابة مزوّد عام. وإذا غاب حقل ما، تقول الصفحة ذلك صراحةً بدلًا من سدّ الفراغ بتخمين محتمل.",
          },
          {
            title: "السرعة هي الوضع الافتراضي",
            body: "تُعرض الصفحات على الخادم، وتُخزَّن الاستجابات المشتركة مؤقتًا مدةً تتراوح بين ثوانٍ وساعات بحسب وتيرة تغيّرها، ولا يتلقى المتصفح إلا ما يحتاجه للعرض.",
          },
          {
            title: "بلا حساب وبلا بناء ملفات تعريف",
            body: "لا يوجد تسجيل ولا نشرة بريدية ولا معرّف إعلاني. وتعيش التفضيلات في ذاكرة localStorage بمتصفحك ولا تغادرها أبدًا.",
          },
          {
            title: "احترام للمصادر الأصلية",
            body: "نستخدم نقاط توصل موثقة ومتاحة للعامة بمعدلات معتدلة. وإذا حجب موقعًا ما العملاء غير التصفحية، نوثّق ذلك القيد بدلًا من التحايل عليه.",
          },
        ],
      },
      stack: {
        heading: "كيف بُني الموقع",
        p1: "يعمل تاتشلاين على Next.js بمكوّنات React الخادمية وTypeScript عبر App Router. والتنسيق نظام تصميم مكتوب يدويًا — بلا حزمة واجهات ولا قالب. والأيقونات من Lucide، وخطّا الموقع خطّان متغيّران مستضافان ذاتيًا. أما ملفات التقويم فتُولَّد على الخادم من بيانات مواعيد حقيقية.",
        p2: "اللغة البصرية عمدًا من طراز المطبوعات: ورق دافئ، وحبر داكن، ولون لاوني واحد للإبراز، وأرقام جدولية للنتائج، ومظهر داكن خفيف الوهج للاستعمال الليلي. إنه تصميم أصلي صُمّم لهذا المشروع.",
      },
      next: {
        heading: "إلى أين تتجه بعد ذلك",
        p: "ابدأ من [مباريات اليوم](/matches)، وتصفح [دليل المسابقات](/competitions)، أو اقرأ [الأسئلة الشائعة](/faq) إن بدى لك أمرٌ ما غير سليم. وتشرح [وثائق الواجهة](/api-docs) المسارات العامة إن أردت البناء على البيانات نفسها.",
      },
    },
    faqs: {
      eyebrow: "مركز المساعدة",
      title: "الأسئلة الشائعة",
      description:
        "إجابات وجيزة وصادقة عن مصدر البيانات، وكيفية تخزين المفضلة والتذكيرات، وماذا تفعل حين يكون المزوّد مقصّرًا.",
      askQuestion: "اطرح سؤالًا",
      onThisPage: "الانتقال إلى",
      navAria: "مجموعات الأسئلة الشائعة",
      apiDocsLink: "وثائق الواجهة",
      privacyNoteLink: "ملاحظة الخصوصية",
      searchSite: "ابحث في الموقع",
      stillStuck: "ما زلت حائرًا؟ نموذج التواصل يصوغ رسالة حقيقية في تطبيق بريدك.",
      groups: [
        {
          heading: "البيانات",
          items: [
            {
              q: "من أين تأتي النتائج والجداول؟",
              a: "تزوّد واجهات ESPN العامة لكرة القدم النتائج والمواعيد والجداول وملفات الفرق وملخصات المباريات والأخبار. وتزوّد واجهة تصنيفات FIFA العامة التصنيفين العالميين للرجال والسيدات. وتُخزَّن بيانات المسابقات الوصفية مؤقتًا من واجهة ESPN الأساسية عند توليد المشروع. وكل صفحة تذكر مصدرها.",
            },
            {
              q: "ما مدى حداثة البيانات المباشرة؟",
              a: "تُخزَّن قوائم المواعيد مؤقتًا لنحو 30 ثانية، والجداول لدقيقتين، والتصنيفات لست ساعات. وطلب تحميل الصفحة يجلب أحدث استجابة مخزّنة، فقد تتأخر النتيجة المباشرة عن البث بفاصل وجيز. وإعادة التحميل هي وسيلة فرض طلب جديد بعد انقضاء مدة التخزين.",
            },
            {
              q: "لماذا تختفي مباراة أو جدول أو قائمة هدّافين؟",
              a: "لأن المزوّد لم ينشرها. فمواعيد ما قبل الموسم كثيرًا ما تخلو من جدول، ومسابقات الكؤوس كثيرًا ما تخلو من لوحة هدّافين للموسم كله، والمباريات القديمة جدًا تسقط من فهرس الملخصات. ويعرض تاتشلاين حالة فراغ واضحة مع السبب بدلًا من لوحة خالية أو قيمة مختلَقة.",
            },
            {
              q: "لماذا تغيب بعض المسابقات؟",
              a: "لأن الدليل لا يضم سوى معرّفات المسابقات التي جرى التحقق منها لدى المزوّد المباشر. إذ يعيد عدد من معرّفات ESPN أخطاء في كل موسم، فتُستبعد بدلًا من نشرها روابط ميتة. ويبلغ تغطيتنا حاليًا 76 مسابقة عبر ست اتحادات قارية.",
            },
            {
              q: "هل تغطون كرة القدم النسائية؟",
              a: "نعم. يمكن فلترة دليل المسابقات لتظهر المسابقات النسائية وحدها، وتضم الدليل عدة دوريات نسائية، ولصفحة التصنيفات لوحة مخصصة للسيدات.",
            },
          ],
        },
        {
          heading: "استخدام الموقع",
          items: [
            {
              q: "هل أحتاج إلى حساب؟",
              a: "لا. لا يوجد تسجيل ولا تسجيل دخول ولا نشرة بريدية. وتُخزَّن المفضلة والتذكيرات وتفضيلات العرض في ذاكرة localStorage بمتصفحك. واستخدم [الإعدادات](/settings) لتصديرها بصيغة JSON إن أردت نسخة احتياطية.",
            },
            {
              q: "كيف تعمل المفضلة؟",
              a: "يظهر زر النجمة في صفحات المباراة والفريق والمسابقة. وفي [مركز المباراة](/matches) تضيّق فلترة المفضلة مواعيد اليوم إلى الفرق والمباريات التي ميزتَها بنجمة. وفي [المسابقات](/competitions) يمكن عزل المسابقات المميزة بمفتاح المفضلة. وأدر القائمة كاملة من [الإعدادات](/settings).",
            },
            {
              q: "بأي منطقة زمنية تُعرض مواقيت بداية المباريات؟",
              a: "افتراضيًا، المنطقة التي يبلّغ عنها متصفحك. ويمكنك تغييرها من [الإعدادات](/settings)؛ وينطبق الخيار على صفوف المباريات ولوحة النتائج وتصديرات التقويم وتسميات التذكيرات. أما ملفات التقويم نفسها فتستخدم قيم توقيت UTC لتستقر في موعدها حيثما كنت.",
            },
            {
              q: "كيف تعمل التذكيرات؟",
              a: "يحفظ زر الجرس في صفحة المباراة تذكيرًا محليًا ويطلب من المتصفح إذن الإشعارات. وطالما بقي تبويب تاتشلاين مفتوحًا، يفحص التطبيق التذكيرات المعلقة كل 30 ثانية وينبهك خلال عشر دقائق قبل بداية المباراة. والمتصفحات تُبطئ التبويبات الخلفية، فأضف المباراة إلى تقويمك أيضًا إن كان التنبيه مهمًا لك.",
            },
            {
              q: "كيف أصدّر المواعيد إلى تقويمي؟",
              a: "في صفحة المباراة، افتح قائمة التقويم لتقويم Google أو Outlook أو ملف `.ics` قابل للتنزيل. وتصدّر [صفحة التقويم](/calendar) شهرًا كاملًا أو يومًا واحدًا. وتتضمن التصديرات وقت البداية والمسابقة والدور والملعب متى ما وفرها المزوّد.",
            },
            {
              q: "هل يشمل البحث كل الفرق؟",
              a: "يطابق البحث أسماء المسابقات من الدليل المحلي ويطلب الفرق من ESPN. وإذا لم تستجب نقطة توصل الفرق، توضّح النتائج أن مطابقات المسابقات وحدها معروضة. وقد لا تُفهرس الأندية الصغيرة جدًا أو المنقرضة لدى المزوّد الأصلي.",
            },
          ],
        },
        {
          heading: "الخصوصية والجانب التقني",
          items: [
            {
              q: "ما الذي يُخزَّن في متصفحي؟",
              a: "ثلاثة مفاتيح: خيار مظهرك، وكائن تفضيلاتك (المنطقة الزمنية، خيار الإشعارات، المفضلة، التذكيرات)، ولا شيء سواه. ولا توجد أي ملفات تعريف ارتباط تحليلية. وتعرض [ملاحظة الخصوصية](/privacy) الحقول بدقة.",
            },
            {
              q: "هل يمكنني نقل تفضيلاتي إلى جهاز آخر؟",
              a: "نعم. صدّر ملف JSON من [الإعدادات](/settings) واستورده على الجهاز الآخر. وتُهمَل الحقول المجهولة أو المشوّهة، فلن يُفسد ملفٌ معدّلٌ الحالة المخزنة.",
            },
            {
              q: "هل توجد واجهة برمجية عامة؟",
              a: "المسارات داخل المصدر نفسه التي يستخدمها الموقع موثقة في [وثائق الواجهة](/api-docs). وتعيد JSON موحد البنية مع بيانات وصفية للتخزين المؤقت. وهي مخصصة لواجهة هذا الموقع الأمامية؛ ولا يوجد مفتاح واجهة ولا اتفاق مستوى خدمة تجاري.",
            },
            {
              q: "لماذا يقول الموقع أحيانًا إن البيانات غير متاحة؟",
              a: "يتعذر على المزوّدين الأصليين أحيانًا أقبال الطلبات أو تنقضي مهلة الاستجابة. فيبلّغ تاتشلاين عن الإخفاق ويوفر رابط إعادة محاولة بدلًا من عرض أرقام قديمة وكأنها مباشرة. ومسار `/api/health` يبلّغ عن الحالة نفسها برمجيًا.",
            },
          ],
        },
      ],
    },
    privacy: {
      eyebrow: "الخصوصية",
      title: "بياناتك تبقى في متصفحك",
      description:
        "لا حسابات ولا ملفات تعريف ارتباط تحليلية ولا ملفات تعريف على الخادم في تاتشلاين. تعرض هذه الصفحة كل معلومة يخزنها الموقع وكيفية إزالتها.",
      onThisPage: "في هذه الصفحة",
      navAria: "أقسام صفحة الخصوصية",
      summary: {
        heading: "الخلاصة",
        quote:
          "لا يوجد اشتراك ولا نص تتبّع ولا شبكة إعلانية ولا قاعدة بيانات للزوار. تُحفظ التفضيلات في ذاكرة localStorage بمتصفحك. ومسح بيانات الموقع يحذفها نهائيًا.",
      },
      stored: {
        heading: "ما الذي يُخزَّن محليًا",
        intro:
          "لا يكتب الموقع سوى المفاتيح التالية. وهي محصورة بأصل تاتشلاين ولا تستطيع مواقع أخرى قراءتها.",
        caption: "مفاتيح التخزين المحلي ومحتواها",
        cols: { key: "المفتاح", contents: "المحتوى", why: "السبب" },
        rows: [
          {
            fields: "واحد من: فاتح أو داكن أو النظام.",
            purpose: "يطبّق مظهرك قبل رسم الصفحة فتجنب وميضها.",
          },
          {
            fields:
              "المظهر، المنطقة الزمنية، خيار الإشعارات، الفرق المفضلة، المسابقات المفضلة، المباريات المفضلة، تذكيرات المباريات.",
            purpose:
              "يخصص فلاتر المباريات وتثبيت المسابقات ومواقيت البداية وتنبيهات التذكير.",
          },
        ],
        extra: {
          keyNote: "(لا شيء حاليًا)",
          fields: "لا تُكتب معرّفات تحليلية أو إعلانية أو معرّفات جلسات.",
          purpose: "لا يتضمن المشروع نص تتبّع.",
        },
      },
      notCollected: {
        heading: "ما الذي لا يُجمع",
        items: [
          "لا اسم ولا عنوان ولا رقم هاتف ولا بيانات اعتماد حساب.",
          "لا عنوان بريد إلكتروني، إلا إن اخترت إرساله بنفسك بالبريد.",
          "لا معرّف تحليلي ولا بصمة ولا تسجيل جلسات ولا متتبّع بين المواقع.",
          "لا ملفات ارتباط إعلانية. ولا يدمج الموقع شبكات إعلانية أو بكسلات اجتماعية.",
          "لا سجل على الخادم للمباريات التي شاهدتها. تُعرض الصفحات عند كل طلب ولا تُربط بهوية مستخدم.",
        ],
      },
      requests: {
        heading: "الطلبات إلى خوادم أخرى",
        p1: "تستدعي الصفحات ومسارات الواجهة واجهات ESPN العامة لكرة القدم وواجهة تصنيفات FIFA العامة. وتنبع تلك الطلبات من خادم تاتشلاين لا من متصفحك، فلن يُشارك عنوان IP الخاص بك مع المزوّدين عند عرض الصفحات.",
        p2: "يصل أمران إلى خوادم الغير من متصفحك: فشعارات الفرق والمسابقات تُحمَّل من شبكة توصيل المحتوى الخاصة بالمزوّد، وفتح رابط نسبة البيانات ينقلك إلى موقع المزوّد وفق سياسة خصوصيته الخاصة. والخطوط مستضافة ذاتيًا، فلا يُراجَع أي شبكة توصيل خطوط.",
      },
      email: {
        heading: "إذا أرسلت بريدًا إلكترونيًا",
        p: "يتحقق [نموذج التواصل](/contact) من رسالتك في المتصفح ويفتحها في تطبيق بريدك. ولا يمر شيء إلى خادم تاتشلاين ولا تُخزَّن أي نسخة. وما يحدث لاحقًا يعتمد على مزوّد بريدك ومزوّدنا.",
      },
      control: {
        heading: "التصدير والحذف",
        p: "افتح [الإعدادات](/settings) لتنزيل نسخة JSON من تفضيلاتك، أو استيرادها على جهاز آخر، أو إعادة ضبط كل شيء. ويمكنك أيضًا مسح بيانات الموقع من إعدادات متصفحك؛ وسيعمل تاتشلاين من إعداداته الافتراضية في المرة التالية.",
        exportReset: "تصدير التفضيلات أو إعادة ضبطها",
        readFaq: "اقرأ الأسئلة الشائعة",
      },
      children: {
        heading: "الأطفال",
        p: "الموقع مرجع رياضي موجه لجمهور عام ولا يجمع بيانات شخصية عن أي أحد وعيًا، بمن فيهم الأطفال. ولا يوجد ما يمكن الاشتراك فيه أصلًا.",
      },
      changes: {
        heading: "التغييرات على هذه الملاحظة",
        p: "إذا أضاف الموقع يومًا ميزة تغيّر ما يُخزَّن، ستُحدَّث هذه الصفحة قبل إطلاق تلك الميزة. وتخزّن النسخة الحالية المفتاحين المذكورين أعلاه في localStorage وحدهما.",
      },
      contact: {
        heading: "تواصل",
        p: "تُطرح أسئلة هذه الملاحظة عبر [نموذج التواصل](/contact). وفي غياب قاعدة بيانات للزوار، يعالَج طلب الحذف على أفضل وجه بمسح بيانات الموقع من متصفحك — إذ لا يوجد سجل على الخادم يُزال.",
      },
      finalNote:
        "تذكّر: مسح تخزين المتصفح يزيل أيضًا المفضلة والتذكيرات المحفوظة. صدّر نسخة احتياطية أولًا إن أردت الإبقاء عليها.",
    },
    apiDocs: {
      eyebrow: "المطورون",
      title: "مسارات JSON العامة",
      description:
        "تقرأ واجهة تاتشلاين الأمامية من المسارات نفسها الموثقة هنا. تتحقق هذه المسارات من المدخلات، وتوحّد بنية البيانات الواردة من المزوّد، وتعيد بيانات التخزين المؤقت الوصفية. ولا يوجد مفتاح واجهة ولا اتفاق مستوى خدمة تجاري.",
      onThisPage: "في هذه الصفحة",
      navAria: "أقسام وثائق الواجهة",
      healthCheck: "فحص الحالة",
      tryIt: "جرّبها",
      exampleLabel: "مثال:",
      paramsTable: {
        parameter: "المعامل",
        type: "النوع",
        description: "الوصف",
      },
      endpointsHeading: "نقاط النهاية",
      basics: {
        heading: "الأساسيات",
        p1: "تتم القراءة عبر `GET` وتكون المسارات نسبية إلى أصل الموقع؛ وتقبل مسارات التحليل بالذكاء الاصطناعي والتحليل المباشر أثناء اللعب `POST` أيضًا لاستهلاك استدعاء ذكاء اصطناعي (بحد معدل لكل عميل). وتستخدم استجابات JSON الناجحة غلاف `{ data, meta }`. أما الإخفاقات فتُعاد في `{ error: { message, status, code } }` مع رمز HTTP مناسب.",
        cacheP:
          "تُضبط ترويسة `Cache-Control` عند كل مسار باستخدام `s-maxage` مع `stale-while-revalidate`، وتُسمّي ترويسة الاستجابة `X-Data-Source` مزوّد البيانات. ومسار التقويم هو نقطة النهاية الوحيدة التي لا تعيد JSON.",
      },
      errors: {
        heading: "الأخطاء والحدود",
        items: [
          {
            code: "400",
            text: "فشل أحد المعاملات في التحقق، كتاريخ أو شهر أو عبارة بحث مشوّهة.",
          },
          {
            code: "404",
            text: "معرّف مسابقة مجهول، أو معرّف فريق أو مباراة غير صالح، أو غياب ملف لذلك المعرّف لدى المزوّد.",
          },
          {
            code: "502",
            text: "أعاد المزوّد خطأً. `{ error: { code: \"upstream_error\" } }`",
          },
          {
            code: "504",
            text: "انقضت مهلة المزوّد. أعد المحاولة بعد انتظار وجيز.",
          },
        ],
        meteredP:
          "تُضبط سقف المسارات بالتخزين المؤقت لا بالمفاتيح. نرجو إبقاء حركة التشغيل الآلي معتدلة؛ فالمزوّدون الأصليون خدمات عامة وليست سعة لمنتج طرف ثالث. وإذا احتجت سجلًا تاريخيًا بوافر، فاستعلم المزوّدين مباشرةً وفق شروطهما.",
      },
      terms: {
        heading: "نسبة البيانات والاستخدام المسؤول",
        p1: "تبقى بيانات المباريات والجداول والمواعيد والفرق والأخبار والبحث ملكية ESPN، والتصنيفات ملكية FIFA. وبيانات المسابقات الوصفية مشتقة من واجهة ESPN الأساسية العامة. ويجب أن تحفظ أي إعادة استخدام نسبة البيانات إلى المزوّد الظاهرة في حقل `meta.attribution`، وأن تلتزم بشروط المزوّد.",
        p2: "لا يمرر تاتشلاين نقاط توصل خاصة، ولا يتجاوز ضوابط الوصول، ولا يكشط المواقع التي تحجب العملاء الآليين. والقيود الموثقة مذكورة في ملف README بالمشروع.",
      },
      catalogue: {
        heading: "معرّفات المسابقات",
        p: "لكل مسابقة من {n} مسابقة معرّف ثابت يُستخدم في المسارات، مثل `eng.1` و`esp.1` و`uefa.champions`. ويمكنك سردها جميعًا عبر [/api/leagues](/api/leagues)، أو تصفح [دليل المسابقات](/competitions). ولا تُنشر المعرّفات التي رسبت في التحقق المباشر.",
      },
      endpoints: {
        matches: {
          summary:
            "مواعيد يوم تقويمي واحد، أو شهر عند تمرير `month` بدلًا من `date`. والافتراضي هو اليوم بتوقيت UTC.",
          cache: "30 ثانية لليوم · 120 ثانية للشهر",
          params: [
            "تاريخ تقويمي حقيقي. والتواريخ غير الصالحة تعيد 400.",
            "قائمة مواعيد الشهر. وتُهمل عند وجود `date`. وقيمة `limited: true` تعني أن المزوّد حصر حجم الاستجابة.",
          ],
          notes:
            "قد يعيد متغير الشهر مواعيد أقل من الموجودة لأن لوحة النتائج لدى المزوّد الأصلي تحصر الاستجابة الواحدة. أما طلبات اليوم فكاملة.",
        },
        leagues: {
          summary:
            "دليل المسابقات الذي جرى التحقق منه. يُقدَّم من بيانات المشروع الوصفية المخزنة مؤقتًا، فلا يستدعي المزوّد الأصلي أبدًا.",
          cache: "3600 ثانية",
          params: [
            "يطابق الاسم أو الدولة أو الاختصار أو الاسم المستعار.",
            "المنطقة الكاملة، مثل Europe.",
            "مسابقة أندية أو منتخبات وطنية.",
            "فئة المسابقة.",
            "صيغة المسابقة.",
            "المسابقات المميزة وحدها أو غير المميزة وحدها.",
          ],
        },
        standings: {
          summary:
            "جدول دوري مباشر لمسابقة وموسم، مع تجميع عندما يقسم المزوّد الجدول.",
          cache: "120 ثانية",
          params: [
            "معرّف الدليل، مثل eng.1.",
            "سنة الموسم. والافتراضي هو موسم المسابقة الحالي.",
          ],
          notes:
            "قيمة `available: false` تعني أن المزوّد لا ينشر جدولًا لذلك الموسم؛ و`reason` يشرح السبب. وأي معرّف غير موجود يعيد 404.",
        },
        scorers: {
          summary: "الهدافون وقادة الصناعة لموسم مسابقة.",
          cache: "120 ثانية",
          params: ["معرّف الدليل.", "سنة الموسم."],
          notes:
            "كثيرًا ما تعيد مسابقات الكؤوس `available: false`. واللوحتان مصفوفتان مستقلتان وقد يختلف طولهما.",
        },
        fixtures: {
          summary:
            "كل موعد يسرده المزوّد لموسم المسابقة، مرتبًا حسب التاريخ.",
          cache: "120 ثانية",
          params: ["معرّف الدليل.", "سنة الموسم."],
        },
        match: {
          summary:
            "ملخص مباراة كامل: لوحة النتيجة، الأحداث الرئيسية، الإحصاءات، التشكيلات، سجل المواجهات المباشرة، آخر الأداء، الملعب، والمذيعون، والأخبار ذات الصلة.",
          cache: "30 ثانية",
          params: ["معرّف حدث ESPN رقمي."],
          notes:
            "تُهمل الأقسام الاختيارية أو تظهر فارغة حين لم ينشرها المزوّد بعد. وهذا أمر طبيعي قبل بداية المباراة.",
        },
        analysis: {
          summary:
            "تحليل مباريات بالذكاء الاصطناعي من Touchline AI فوق وقائع تُجمَّع برمجيًا من بيانات ESPN: احتمالات الفوز والتعادل، النتيجة المتوقعة، الأهداف المتوقعة، الأسواق والملاحظات التكتيكية. ويعنون `kind=past` التحليل بأثر رجعي لمباراة منتهية.",
          cache: "مستند مخزَّن؛ لا يُحدَّث إلا عبر POST",
          params: [
            "معرّف حدث ESPN رقمي.",
            "‏`upcoming` (الافتراضي) أو `past`.",
            "‏POST فقط: فرض توليد جديد.",
            "عند القيمة `ar` يُطلب المرآة العربية للتقرير.",
          ],
          notes:
            "يعيد `GET` المستند المخزَّن دون استهلاك استدعاء ذكاء اصطناعي؛ ويشغّل `POST` توليدًا خاضعًا لحد المعدل. وما لم يُنشره المزوّد يُوسَم بأنه غير متوفر بدلًا من تقديره.",
        },
        live: {
          summary:
            "تحليل مباشر أثناء اللعب: نظرة عامة تراعي دقائق المباراة، من يفرض سيطرته، احتمالات الفوز اللحظية، تقدير الهدف التالي، الزخم، والتقرير النهائي التلقائي بعد صافرة النهاية.",
          cache: "لقطات مخزَّنة؛ لا تُحدَّث إلا عبر POST",
          params: [
            "معرّف حدث ESPN رقمي.",
            "‏POST فقط: فرض التقاط خارج الفاصل الزمني المهيأ.",
            "عند القيمة `ar` تُولَّد المرآة العربية لآخر لقطة.",
          ],
          notes:
            "يعيد `GET` كل اللقطات المخزّنة، وبعد انتهاء المباراة يحسب التقرير النهائي الحتمي أيضًا. ويلتقط `POST` عند محفزات حقيقية (النتيجة، الأحداث، الإحصاءات، الفاصل الزمني) ويضيف لقطة جديدة دون الكتابة فوق الموجودة. وأي مباراة غير حية تعيد 409.",
        },
        team: {
          summary:
            "ملف الفريق مع مسابقته وقائمة مواعيد موسم وملخصات سجلات يوفرها المزوّد.",
          cache: "300 ثانية",
          params: ["معرّف فريق ESPN رقمي.", "سنة الموسم لجدول المواعيد."],
          notes: "تعيد 404 عندما لا يكون لدى ESPN ملف لذلك المعرّف.",
        },
        rankings: {
          summary:
            "التصنيف العالمي الرسمي من FIFA، بالترتيب والترتيب السابق والتحرك والنقاط والاتحاد القاري.",
          cache: "21600 ثانية (6 ساعات)",
          params: [
            "لوحة التصنيف. والافتراضي الرجال.",
            "اسم الاتحاد القاري كاملًا، مثل UEFA أو CONMEBOL أو CAF.",
            "أقصى عدد مدخلات معادة. والافتراضي 211.",
          ],
        },
        news: {
          summary: "عناوين أخبار كرة القدم من ملف الأخبار العام لدى ESPN.",
          cache: "300 ثانية",
          params: ["عدد المقالات. والافتراضي 12."],
        },
        search: {
          summary:
            "بحث في المسابقات غير حساس لحالة الأحرف عبر الدليل المحلي، مع نتائج فرق من بحث ESPN.",
          cache: "120 ثانية",
          params: ["حرفان على الأقل، و80 على الأكثر بعد التنقيح."],
          notes:
            "قيمة `teamsAvailable: false` تعني أن فشل بحث الفرق لدى المزوّد الأصلي؛ وتُعاد نتائج المسابقات مع ذلك.",
        },
        calendar: {
          summary:
            "تصدير iCalendar قابل للتنزيل ليوم أو شهر. تعيد `text/calendar`، لا غلاف JSON.",
          cache: "120 ثانية عبر شبكة توصيل المحتوى",
          params: ["تصدير يوم واحد.", "تصدير شهر كامل."],
          notes:
            "قيم التوقيت بتوقيت UTC. وتُهمل المواعيد التي لم يُؤكد وقت بدايتها بدلًا من تخمينها.",
        },
        health: {
          summary:
            "فحص حيوية يبلّغ عن حجم الدليل وعما إذا كانت ملف مواعيد المزوّد قد استجاب، مع زمن الاستجابة.",
          cache: "no-store",
          notes:
            "تعيد الحالة المتدهورة HTTP 200 أيضًا حتى يميز الرصد بين إخفاق التطبيق وإخفاق المزوّد.",
        },
      },
      aside: {
        cards: [
          {
            title: "التخزين المؤقت أولًا",
            body: "يضبط كل مسار نافذة تخزين مؤقت مشتركة صريحة. والقراءات المتكررة لا تضاعف الاستدعاءات لدى المزوّد.",
          },
          {
            title: "لا حاجة إلى مفتاح",
            body: "المسارات داخل المصدر نفسه مفتوحة للتفتيش. لا سرّ يُسرَّب ولا رمز يُدوَّر.",
          },
          {
            title: "شروط المزوّدين سارية",
            body: "هذه الوثائق ليست رخصة لإعادة توزيع بيانات المزوّدين.",
          },
        ],
      },
    },
    search: {
      hero: {
        kicker: "اعثر على أي شيء",
        title: "ابحث في عالم كرة القدم",
        sub: "مسابقات من دليل تاتشلاين الموثّق وفرق من بحث ESPN العام. واضغط Enter لتشغيل البحث.",
        searchLabel: "ابحث في المسابقات والفرق",
        placeholder: "فريق أو مسابقة أو دولة",
        submit: "ابحث",
        tryLabel: "جرّب",
      },
      popular: {
        kicker: "ابدأ من هنا",
        title: "مسابقات شائعة",
        action: "كل المسابقات",
      },
      kinds: {
        formats: {
          league: "دوري",
          cup: "كأس",
          qualifier: "تصفيّات",
          friendly: "ودية",
        },
        gender: { men: "الرجال", women: "السيدات" },
      },
      teamFallback: "نادٍ أو منتخب وطني",
      results: {
        kicker: "نتائج",
        titleSingle: "{n} نتيجة عن «{query}»",
        titlePlural: "{n} نتيجة عن «{query}»",
        descriptionOk: "المسابقات من دليل تاتشلاين الموثّق؛ والفرق من بحث ESPN العام.",
        descriptionNoTeams:
          "لم تستجب خدمة بحث الفرق لدى ESPN، لذا تُعرض مطابقات المسابقات وحدها.",
        empty: {
          title: "لا شيء يطابق هذا البحث",
          description: "راجع الإملاء، أو جرّب اسمًا أقصر، أو تصفح دليل المسابقات.",
          action: "تصفح المسابقات",
          todaysMatches: "مباريات اليوم",
        },
        competitionsHeading: "المسابقات",
        teamsHeading: "الفرق",
      },
    },
    contact: {
      eyebrow: "تواصل",
      title: "أخبرنا عمّا انكسر أو غاب",
      description:
        "يُدار تاتشلاين بصفة مشروع مستقل. وتُرحَّب بتصحيحات البيانات وملاحظات إمكانية الوصول وطلبات إضافة المسابقات على السواء.",
      guidesHeading: "ماذا تُضمّن",
      guides: [
        {
          title: "تصحيحات البيانات",
          body: "أرفق المسابقة والتاريخ ورابطًا إلى الصفحة. وإذا كانت نتيجة ما خاطئة، فاذكر قيمتها الصحيحة ومصدرها إن استطعت.",
        },
        {
          title: "بلاغات الأخطاء",
          body: "اشرح ما كنت تتوقعه وما حدث فعليًا، والمتصفح والجهاز الذي استخدمته. وتُرحَّب بلقطة شاشة دون أن تُشترط.",
        },
        {
          title: "أسئلة التوقيت",
          body: "تتبع مواقيت البداية المنطقة الزمنية المحفوظة في الإعدادات. تحقق من ذلك أولًا — فمعظم شكاوى التوقيت سببها اختلاف المنطقة وليس نقص البيانات.",
        },
      ],
      privacyHeading: "الخصوصية",
      privacyBody:
        "لا يرسل النموذج شيئًا إلى أي خادم قط. تُصوغ رسالتك في تطبيق بريدك وتُرسل من عنوانك أنت. وتشرح [ملاحظة الخصوصية](/privacy) ما يخزّنه الموقع محليًا.",
      providersHeading: "مشكلات المزوّدين",
      providersBody:
        "بعض المشكلات تعود إلى المزوّد الأصلي. وإذا كانت مسابقة كاملة غائبة عن بيانات ESPN العامة، فالقناة التي يوفرها مزوّدها للملاحظات هي المكان الأنسب.",
      espnSoccer: "كرة قدم ESPN",
      fifaRankings: "تصنيف الفيفا",
      form: {
        nameLabel: "اسمك",
        emailLabel: "عنوان البريد الإلكتروني",
        topicLabel: "الموضوع",
        referenceLabel: "مباراة أو مسابقة",
        optional: "(اختياري)",
        referencePlaceholder: "مثل: جدول Premier League، 1 نوفمبر",
        referenceHint: "يساعدنا رابط أو اسم الصفحة على العثور على البيانات المحددة.",
        messageLabel: "الرسالة",
        messageCounter: "{count}/1500",
        messageCounterMin: "حرفًا · 20 على الأقل",
        topics: [
          "سؤال عن البيانات",
          "بلاغ عن خطأ",
          "طلب إضافة مسابقة",
          "ملاحظة إمكانية الوصول",
          "طلب يتعلق بالخصوصية",
          "شيء آخر",
        ],
        nameShort: "أدخل حرفين على الأقل.",
        nameLong: "احفظ اسمك تحت 80 حرفًا.",
        emailInvalid: "أدخل عنوان بريد إلكتروني صالحًا حتى يمكن الرد عليك.",
        topicInvalid: "اختر أحد المواضيع المدرجة.",
        referenceLong: "احفظ الإحالة تحت 200 حرف.",
        messageShort: "زد قليلًا من التفصيل — 20 حرفًا على الأقل.",
        messageLong: "احفظ الرسالة تحت 1500 حرف.",
        submit: "افتح في تطبيق البريد",
        copyAddress: "نسخ العنوان",
        addressCopied: "تم نسخ العنوان",
        toastValidation: "راجع الحقول المحددة قبل الإرسال.",
        toastNoAddress: "لا يوجد عنوان تواصل مضبوط لهذه النسخة المنشورة.",
        toastCopied: "تم نسخ عنوان التواصل.",
        toastClipboardFailed: "تعذّر الوصول إلى الحافظة. حدّد العنوان يدويًا.",
        composedStatus:
          "ينبغي أن يكون تطبيق بريدك قد فتح والرسالة جاهزة للإرسال. وإن لم يحدث شيء، فانسخ العنوان أعلاه وأرسل يدويًا — فهذه الصفحة لا ترسل الرسالة ولا تخزّنها أبدًا.",
        infoStatus:
          "لا يرسل هذا النموذج إلى أي خادم. بل يتحقق من رسالتك ويفتحها في عميل بريدك الإلكتروني الخاص، موجهة إلى {email}.",
        mailFooter: "أُرسل من نموذج التواصل في تاتشلاين",
        notConfigured: {
          title: "التواصل غير مُهيّأ",
          body: "لا يوجد لهذه النسخة المنشورة عنوان تواصل، فلا يستطيع النموذج صياغة رسالة. ويمكن لمالك الموقع تفعيله بضبط `NEXT_PUBLIC_CONTACT_EMAIL` ثم إعادة تشغيل التطبيق.",
          note: "النموذج عمدًا ليس نقطة استقبال زائفة: لا يُخزَّن شيء على خادم، ولا يُرسَل بريد إلكتروني من هذه الصفحة.",
        },
      },
    },
    notFound: {
      code: "404",
      title: "هذه الصفحة خارج أرض الملعب",
      body: "قد يكون العنوان مكتوبًا على خطأ، أو أن المسابقة أو الفريق أو المباراة التي تبحث عنها غير موجودة في فهرس المزوّد. جرّب الدليل أو البحث أو مواعيد اليوم.",
      actions: { todays: "مباريات اليوم" },
    },
    error: {
      oops: "عفوًا",
      title: "حدث خطأ ما في هذه الصفحة",
      body: "تعذّر طلبُ بياناتٍ أو أداءُ مكوّنٍ أثناء العرض. لم تفقدك أي شيء حفظته — فالمفضلة والإعدادات تبقى في هذا المتصفح. أعد الصفحة من جديد، أو اتجه إلى مكان يعمل بلا شك.",
      reference: "المرجع:",
      actions: { todays: "مباريات اليوم" },
    },
  },
});
