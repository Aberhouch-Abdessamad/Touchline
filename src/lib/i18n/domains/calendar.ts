import { defineDomain } from "../define";

/**
 * Calendar page translations: month hero + grid, day panel, .ics exports and
 * the legend. Today/tomorrow labels live in `common`; match states reuse
 * `t.common.states` / `t.common.stateShort`.
 */
export const calendar = defineDomain({
  en: {
    month: {
      eyebrow: "Season calendar",
      tag: "ESPN fixtures",
      // Rendered before the isolated ".ics" token: "Month .ics".
      icsAction: "Month",
      ledeFailed:
        "The fixture feed did not answer for {month}. The grid still works, so you can move to another month or retry.",
      ledeEmpty:
        "No fixtures are listed for {month} yet. Try the next month, or jump back to today.",
      // {fixtures}/{days} receive the composed counts.* strings.
      ledeCount: "{fixtures} across {days}, loaded from ESPN's public scoreboard.",
      counts: {
        fixtureOne: "1 fixture",
        fixtureMany: "{n} fixtures",
        dayOne: "1 day",
        dayMany: "{n} days",
      },
      // Month names + abbreviations, January → December (nav + hero title).
      names: [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ],
      shorts: [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ],
      // Grid weekday header, Monday-first (Mon → Sun).
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      focusLabel: "Selected day",
      thisMonth: "This month",
      jumpToThisMonth: "Jump to this month",
      prevMonth: "Previous month",
      nextMonth: "Next month",
      monthsNav: "Months of the year",
      gridSub: "Pick a day to see its fixtures. Dots mark days with matches.",
      stats: {
        fixtures: "Fixtures",
        days: "Active days",
        live: "Live now",
        busiest: "Busiest day",
      },
      failedNote:
        "Feed unavailable — showing an empty grid. Pick another month or reload to try again.",
      limitedNote:
        "The provider caps a single response, so this month may show the first {n} fixtures. Daily views in the match centre stay complete.",
    },
    day: {
      eyebrow: "Selected day",
      liveBadge: "{n} live",
      none: "No fixtures",
      emptyTitle: "Nothing listed here",
      emptyNote:
        "No fixtures were returned for this day. Pick another date from the grid, or open the match centre for live coverage.",
      openMatchCentre: "Open the match centre",
      // Grid cell aria-labels; {date} carries the ISO date.
      cellOne: "{date}: 1 match",
      cellMany: "{date}: {n} matches",
      cellOneLive: "{date}: 1 match, live now",
      cellManyLive: "{date}: {n} matches, live now",
    },
    export: {
      eyebrow: "Export",
      title: "Take it with you",
      monthButton: "Export {month}",
      // Rendered after the isolated ".ics ·" token.
      monthHint: "every fixture this month",
      dayButton: "Export the selected day",
      note:
        "Files use UTC timestamps, so fixtures land at the right moment in every timezone. Google Calendar and Outlook both accept the same .ics file.",
      openInMatchCentre: "Open this day in the match centre",
    },
    legend: {
      fixtures: "Fixtures",
      live: "Live now",
      selected: "Selected day",
      matchCentre: "Match centre",
    },
    guide: {
      title: "How the calendar works",
      items: [
        "Months are loaded from ESPN's public scoreboard, the same feed that powers the match centre.",
        "A dot marks a day with fixtures; a red dot means at least one match is live.",
        "Exports include kick-off time, competition, round and venue where the provider supplies them.",
      ],
    },
  },
  ar: {
    month: {
      eyebrow: "تقويم الموسم",
      tag: "مواعيد ESPN",
      icsAction: "ملف الشهر",
      ledeFailed:
        "لم تستجب خدمة المواعيد لشهر {month}. لا تزال الشبكة تعمل، فيمكنك الانتقال إلى شهر آخر أو إعادة المحاولة.",
      ledeEmpty:
        "لا توجد مباريات مدرجة لشهر {month} بعد. جرّب الشهر التالي، أو عد إلى اليوم.",
      ledeCount: "{fixtures} على مدار {days}، محمّلة من لوحة النتائج العامة لدى ESPN.",
      counts: {
        fixtureOne: "مباراة واحدة",
        fixtureMany: "{n} مباراة",
        dayOne: "يوم واحد",
        dayMany: "{n} يوم",
      },
      names: [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
      ],
      shorts: [
        "ينا",
        "فبر",
        "مار",
        "أبر",
        "ماي",
        "يون",
        "يول",
        "أغس",
        "سبت",
        "أكت",
        "نوف",
        "ديس",
      ],
      // الاثنين الثلاثاء الأربعاء الخميس الجمعة السبت الأحد (Monday-first).
      weekdays: ["ن", "ث", "ر", "خ", "ج", "س", "ح"],
      focusLabel: "اليوم المحدد",
      thisMonth: "هذا الشهر",
      jumpToThisMonth: "الانتقال إلى هذا الشهر",
      prevMonth: "الشهر السابق",
      nextMonth: "الشهر التالي",
      monthsNav: "أشهر السنة",
      gridSub: "اختر يومًا لعرض مبارياته. النقاط تدل على أيام بها مباريات.",
      stats: {
        fixtures: "المباريات",
        days: "الأيام النشطة",
        live: "مباشر الآن",
        busiest: "أكثر يوم ازدحامًا",
      },
      failedNote:
        "الخدمة غير متاحة — تُعرض شبكة فارغة. اختر شهرًا آخر أو أعد تحميل الصفحة للمحاولة مجددًا.",
      limitedNote:
        "يحدّ المزوّد حجم الاستجابة الواحدة، لذا قد يعرض هذا الشهر أول {n} مباراة فقط. تبقى صفحات اليوم الواحد في مركز المباريات كاملة.",
    },
    day: {
      eyebrow: "اليوم المحدد",
      liveBadge: "{n} مباشر",
      none: "لا توجد مباريات",
      emptyTitle: "لا شيء مدرج هنا",
      emptyNote:
        "لم تُرجع الخدمة أي مباريات لهذا اليوم. اختر تاريخًا آخر من الشبكة، أو افتح مركز المباريات للمتابعة المباشرة.",
      openMatchCentre: "افتح مركز المباريات",
      cellOne: "{date}: مباراة واحدة",
      cellMany: "{date}: {n} مباراة",
      cellOneLive: "{date}: مباراة واحدة، مباشر الآن",
      cellManyLive: "{date}: {n} مباراة، مباشر الآن",
    },
    export: {
      eyebrow: "تصدير",
      title: "خذه معك",
      monthButton: "تصدير {month}",
      monthHint: "كل مباريات هذا الشهر",
      dayButton: "تصدير اليوم المحدد",
      note:
        "تستخدم الملفات طوابع زمنية بتوقيت UTC، فتظهر المباريات في موعدها الصحيح في كل منطقة زمنية. يقبل كل من Google Calendar وOutlook الملف نفسه.",
      openInMatchCentre: "افتح هذا اليوم في مركز المباريات",
    },
    legend: {
      fixtures: "المباريات",
      live: "مباشر الآن",
      selected: "اليوم المحدد",
      matchCentre: "مركز المباريات",
    },
    guide: {
      title: "كيف يعمل التقويم",
      items: [
        "تُحمَّل الأشهر من لوحة النتائج العامة لدى ESPN، وهي نفس الخدمة التي تغذي مركز المباريات.",
        "النقطة تدل على يوم به مباريات، والنقطة الحمراء تعني أن مباراة واحدة على الأقل مباشرة الآن.",
        "تتضمن ملفات التصدير وقت البداية والمسابقة والجولة والملعب حيثما يوفّرها المزوّد.",
      ],
    },
  },
});
