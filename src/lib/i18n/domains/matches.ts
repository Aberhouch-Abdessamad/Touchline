import { defineDomain } from "../define";

/**
 * Match-day UI translations: the match-centre hero, filters, the fixture
 * board, date navigation and the shared scoreboard controls. Match state
 * words, favourites, share/remind and countdown vocabulary live in `common`
 * — read `t.common.*` instead of duplicating it here. Clocks ("45'+2"),
 * scores, seasons and competition/team names are data and never appear in
 * this file.
 */
export const matches = defineDomain({
  en: {
    hero: {
      eyebrow: "Match centre",
      calendar: "Calendar",
      backToToday: "Back to today",
      ariaLabel: "Match centre for {date}",
      /** sr-only tail of the h1 "<weekday> <date> fixtures". */
      fixturesSuffix: "fixtures",
    },
    lede: {
      loading: "Fixtures are loading for this date.",
      error:
        "The scoreboard feed did not respond. The date controls still work, so you can move to another day.",
      empty:
        "No fixtures are scheduled for this date. Try another day or browse the season calendar.",
      count:
        "{matches} fixtures across {competitions} competitions. Kick-offs are shown in your local time.",
      countOne:
        "{matches} fixtures across {competitions} competition. Kick-offs are shown in your local time.",
    },
    stats: {
      fixtures: "Fixtures",
      live: "Live now",
      goals: "Goals",
      competitions: "Competitions",
    },
    dateNav: {
      prev: "Previous day",
      next: "Next day",
      /** Week-strip link: "Fixtures for Saturday, 7 March 2026". */
      weekAria: "Fixtures for {date}",
      /** Native date-picker input. */
      jump: "Jump to a date",
    },
    filters: {
      ariaTabs: "Filter by match state",
      upcoming: "Upcoming",
      results: "Results",
      search: "Search fixtures",
      clearSearch: "Clear search",
      competitionAria: "Filter by competition",
      allCompetitions: "All competitions",
      reset: "Reset",
      clearFilters: "Clear filters",
    },
    statusline: {
      match: "match",
      matches: "matches",
      live: "{count} live",
      hint: "Kick-offs in your timezone",
    },
    liveBand: {
      title: "{count} in play",
      note: "Scores update on their own",
      all: "All live matches",
    },
    board: {
      fixtures: "Fixtures by competition",
      upcoming: "Upcoming by competition",
      results: "Results by competition",
      count: "{groups} competitions",
      countOne: "{groups} competition",
      liveAbove: "live games above",
    },
    groups: {
      link: "Table & fixtures",
      openCompetition: "Open competition",
      sub: "{n} fixtures",
      subOne: "{n} fixture",
      showAll: "Show all {n} fixtures",
      ariaShow: "Show {name} fixtures",
      ariaHide: "Hide {name} fixtures",
    },
    loadMore: {
      button: "Show more competitions",
      meta: "{visible} of {total} shown",
    },
    empty: {
      loadErrorTitle: "Fixtures could not be loaded",
      loadErrorDescription:
        "ESPN's scoreboard endpoint did not respond. This is usually temporary; the date controls still work.",
      loadErrorAction: "Try this date again",
      noFixturesTitle: "No fixtures on this date",
      noFixturesDescription:
        "Try the next day, jump to the calendar, or browse a competition for its full season schedule.",
      noFixturesAction: "Open the calendar",
      browseCompetitions: "Browse competitions",
      favTitle: "No favourite fixtures in this view",
      favDescription:
        "Star a competition, team or match to build a personal fixture list, then switch this filter on.",
      searchTitle: "No fixtures match that search",
      filteredDescription:
        "Try another competition or match state, move to a neighbouring day, or clear the filters.",
      noneTitle: "No matches in this view",
    },
    note: "Favourites live in this browser only — nothing is sent to a server.",
    pageNote:
      "Live scores refresh every 30 seconds while this tab is visible. {total} competitions are tracked; fixtures come from ESPN's public scoreboard.",
    card: {
      liveCoverage: "Live coverage",
    },
    /** Visible label of a starred/unstarred favourite toggle button. */
    favouriteToggle: { active: "Favourited", inactive: "Favourite" },
    share: {
      page: "Share this page",
      clipboardError:
        "Could not access the clipboard. Copy the address bar instead.",
    },
    remind: {
      titleAdd: "Alert me at kick-off",
      titleRemove: "Remove the kick-off reminder",
      titleStarted: "This match has already started",
      toastSaved: "Reminder saved for this browser.",
      toastFallback:
        "Reminder saved. Add a calendar event too — browser alerts need notification permission.",
    },
    addCalendar: {
      trigger: "Add to calendar",
      download: "Download .ics",
      google: "Google Calendar",
      outlook: "Outlook Calendar",
      note:
        "Times are exported in UTC so the fixture starts at the same moment everywhere.",
      toast: "Calendar file downloaded.",
    },
    aria: {
      /** Screen-reader line for a fixture row: "Home v Away, FT". */
      row: "{home} {vs} {away}, {status}",
      /** Screen-reader line for a scoreboard view: "Home 2, Away 1, LIVE". */
      scored: "{home} {homeScore}, {away} {awayScore}, {status}",
      /** Compact label stored with favourites: "Home v Away". */
      shortLabel: "{home} {vs} {away}",
      /** Composed favourite control label: "{name} — {label}". */
      favourite: "{name} — {label}",
    },
  },
  ar: {
    hero: {
      eyebrow: "مركز المباريات",
      calendar: "التقويم",
      backToToday: "العودة إلى اليوم",
      ariaLabel: "مركز المباريات لتاريخ {date}",
      fixturesSuffix: "مواعيد",
    },
    lede: {
      loading: "جارٍ تحميل مواعيد هذا اليوم.",
      error:
        "لم تستجب بوابة النتائج. لا تزال أدوات التاريخ تعمل، فيمكنك الانتقال إلى يوم آخر.",
      empty:
        "لا مواعيد مجدولة في هذا التاريخ. جرّب يومًا آخر أو تصفّح تقويم الموسم.",
      count:
        "{matches} موعدًا عبر {competitions} مسابقات. تُعرض أوقات البداية بتوقيتك المحلي.",
      countOne:
        "{matches} موعدًا عبر {competitions} مسابقة. تُعرض أوقات البداية بتوقيتك المحلي.",
    },
    stats: {
      fixtures: "المواعيد",
      live: "مباشر الآن",
      goals: "الأهداف",
      competitions: "المسابقات",
    },
    dateNav: {
      prev: "اليوم السابق",
      next: "اليوم التالي",
      weekAria: "مواعيد {date}",
      jump: "الانتقال إلى تاريخ",
    },
    filters: {
      ariaTabs: "تصفية حسب حالة المباراة",
      upcoming: "القادمة",
      results: "النتائج",
      search: "ابحث في المواعيد",
      clearSearch: "مسح البحث",
      competitionAria: "تصفية حسب المسابقة",
      allCompetitions: "جميع المسابقات",
      reset: "إعادة الضبط",
      clearFilters: "مسح عوامل التصفية",
    },
    statusline: {
      match: "مباراة",
      matches: "مباريات",
      live: "{count} مباشر",
      hint: "أوقات البداية بتوقيتك المحلي",
    },
    liveBand: {
      title: "{count} جارية الآن",
      note: "تتحدث النتائج تلقائيًا",
      all: "كل المباريات المباشرة",
    },
    board: {
      fixtures: "المواعيد حسب المسابقة",
      upcoming: "القادمة حسب المسابقة",
      results: "النتائج حسب المسابقة",
      count: "{groups} مسابقات",
      countOne: "{groups} مسابقة",
      liveAbove: "مباريات مباشرة أعلاه",
    },
    groups: {
      link: "الترتيب والمواعيد",
      openCompetition: "فتح المسابقة",
      sub: "{n} موعد",
      subOne: "{n} موعد",
      showAll: "إظهار جميع المواعيد ({n})",
      ariaShow: "إظهار مواعيد {name}",
      ariaHide: "إخفاء مواعيد {name}",
    },
    loadMore: {
      button: "عرض مسابقات أكثر",
      meta: "يُعرض {visible} من {total}",
    },
    empty: {
      loadErrorTitle: "تعذر تحميل المواعيد",
      loadErrorDescription:
        "لم تستجب بوابة النتائج في ESPN. عادةً ما يكون هذا مؤقتًا؛ ولا تزال أدوات التاريخ تعمل.",
      loadErrorAction: "أعد المحاولة لهذا التاريخ",
      noFixturesTitle: "لا مواعيد في هذا التاريخ",
      noFixturesDescription:
        "جرّب اليوم التالي، أو انتقل إلى التقويم، أو استعرض مسابقة لعرض جدول موسمها الكامل.",
      noFixturesAction: "افتح التقويم",
      browseCompetitions: "استعرض المسابقات",
      favTitle: "لا مواعيد مفضلة في هذا العرض",
      favDescription:
        "أنشئ قائمة مواعيدك الخاصة بإضافة مسابقة أو فريق أو مباراة إلى المفضلة، ثم فعّل عامل التصفية هذا.",
      searchTitle: "لا مواعيد تطابق هذا البحث",
      filteredDescription:
        "جرّب مسابقة أخرى أو حالة مباراة أخرى، أو انتقل إلى يوم مجاور، أو امسح عوامل التصفية.",
      noneTitle: "لا مباريات في هذا العرض",
    },
    note: "تبقى المفضلة في هذا المتصفح فقط — لا شيء يُرسل إلى أي خادم.",
    pageNote:
      "تتحدث النتائج المباشرة كل 30 ثانية طالما بقيت هذه الصفحة ظاهرة. تتم متابعة {total} مسابقة؛ وتأتي المواعيد من بوابة النتائج العامة في ESPN.",
    card: {
      liveCoverage: "تغطية مباشرة",
    },
    favouriteToggle: { active: "في المفضلة", inactive: "مفضلة" },
    share: {
      page: "مشاركة هذه الصفحة",
      clipboardError:
        "تعذّر الوصول إلى الحافظة. انسخ العنوان من شريط العنوان بدلًا من ذلك.",
    },
    remind: {
      titleAdd: "نبّهني عند بداية المباراة",
      titleRemove: "أزل تذكير بداية المباراة",
      titleStarted: "بدأت هذه المباراة بالفعل",
      toastSaved: "تم حفظ التذكير في هذا المتصفح.",
      toastFallback:
        "تم حفظ التذكير. أضف حدثًا إلى التقويم أيضًا، فتنبيهات المتصفح تتطلب إذن الإشعارات.",
    },
    addCalendar: {
      trigger: "أضف إلى التقويم",
      download: "تنزيل ملف .ics",
      google: "تقويم Google",
      outlook: "تقويم Outlook",
      note:
        "تُصدَّر الأوقات بتوقيت UTC حتى تبدأ المباراة في اللحظة نفسها أينما كنت.",
      toast: "تم تنزيل ملف التقويم.",
    },
    aria: {
      row: "{home} {vs} {away}، {status}",
      scored: "{home} {homeScore}، {away} {awayScore}، {status}",
      shortLabel: "{home} {vs} {away}",
      favourite: "{name} — {label}",
    },
  },
});
