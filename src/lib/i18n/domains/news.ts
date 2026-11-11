import { defineDomain } from "../define";

/**
 * News hub chrome: hero, lead-story rail, attribution and wire sections plus
 * empty/error states. Headlines, descriptions, sections and bylines are raw
 * ESPN data and stay untranslated at render time.
 */
export const news = defineDomain({
  en: {
    kicker: "The wire",
    deskTag: "ESPN football desk",
    todaysMatches: "Today's matches",
    titleTop: "The stories",
    titleMain: "behind the scores",
    ledeFailed:
      "The ESPN news feed did not answer. The rest of Touchline is unaffected, so scores and fixtures stay live while you retry.",
    ledeCountOne:
      "{n} story from ESPN's football desk, refreshed every five minutes. Every headline opens the original publisher.",
    ledeCount:
      "{n} stories from ESPN's football desk, refreshed every five minutes. Every headline opens the original publisher.",
    note: "Curated by ESPN's football desk · links open the publisher in a new tab",
    topAria: "Leading story",
    topLabel: "Leading story",
    /** Fallback shown when a story carries no section tag from ESPN. */
    sectionFallback: "Football",
    timeFallback: "Time unavailable",
    dateFallback: "Date unavailable",
    readAtEspn: "Read at ESPN",
    noExternalLink: "No external link published",
    topEmptyFailed: "The lead story is temporarily unavailable.",
    topEmptyNone: "No lead story has been published yet.",
    latest: {
      eyebrow: "Just moved",
      title: "Latest headlines",
    },
    stats: {
      stories: "Stories",
      bylines: "Bylines",
      topics: "Topics",
      latestUpdate: "Latest update",
      zoneNote: "your time zone",
    },
    frontAria: "Top stories",
    wire: {
      eyebrow: "Across the game",
      title: "More from the wire",
      sub: "Transfers, match reports, injury updates and competition news from ESPN's football desk.",
      countOne: "{n} story",
      countMany: "{n} stories",
    },
    about: {
      eyebrow: "Attribution",
      title: "About this feed",
      body: "Headlines and summaries come from ESPN's public news API. Touchline does not rewrite articles: every card opens the original publisher in a new tab, where their terms and privacy policy apply.",
      looking: "Looking for a specific fixture instead?",
      matchCentre: "Open the match centre",
      or: "or",
      search: "search teams and competitions",
      espnSoccer: "ESPN Soccer",
    },
    feedError: {
      title: "The news feed is unavailable",
      description:
        "ESPN's public news endpoint did not respond. Scores, tables and fixtures are unaffected — try again in a moment.",
      reload: "Reload the feed",
    },
    empty: {
      title: "No stories published right now",
      description:
        "The feed returned an empty list. Headlines usually appear again within the hour.",
      action: "Browse today's fixtures",
    },
  },
  ar: {
    kicker: "شريط الأخبار",
    deskTag: "مكتب كرة القدم في ESPN",
    todaysMatches: "مباريات اليوم",
    titleTop: "القصص",
    titleMain: "خلف النتائج",
    ledeFailed:
      "لم تستجب شريط أخبار ESPN. بقية تاتشلاين لا تتأثر، فتبقى النتائج والمواعيد حية أثناء إعادة المحاولة.",
    ledeCountOne:
      "{n} خبر من مكتب كرة القدم في ESPN، يتحدث كل خمس دقائق. يفتح كل عنوان المصدر الأصلي.",
    ledeCount:
      "{n} من أخبار مكتب كرة القدم في ESPN، تتحدث كل خمس دقائق. يفتح كل عنوان المصدر الأصلي.",
    note:
      "من إعداد مكتب كرة القدم في ESPN · الروابط تفتح الموقع الناشر في تبويب جديد",
    topAria: "القصة الرئيسية",
    topLabel: "القصة الرئيسية",
    /** بديل يظهر حين يصل الخبر بلا تصنيف من ESPN. */
    sectionFallback: "كرة القدم",
    timeFallback: "الوقت غير متاح",
    dateFallback: "التاريخ غير متاح",
    readAtEspn: "اقرأ على ESPN",
    noExternalLink: "لا يوجد رابط خارجي منشور",
    topEmptyFailed: "القصة الرئيسية غير متاحة مؤقتا.",
    topEmptyNone: "لم تنشر قصة رئيسية بعد.",
    latest: {
      eyebrow: "جديد الأخبار",
      title: "أحدث العناوين",
    },
    stats: {
      stories: "القصص",
      bylines: "المؤلفون",
      topics: "الموضوعات",
      latestUpdate: "آخر تحديث",
      zoneNote: "بحسب منطقتك الزمنية",
    },
    frontAria: "أهم القصص",
    wire: {
      eyebrow: "حول اللعبة",
      title: "المزيد من الشريط",
      sub:
        "انتقالات وتقارير مباريات وتطورات الإصابات وأخبار المسابقات من مكتب كرة القدم في ESPN.",
      countOne: "{n} خبر",
      countMany: "{n} من الأخبار",
    },
    about: {
      eyebrow: "المصادر",
      title: "حول هذا الشريط",
      body:
        "تأتي العناوين والملخصات من واجهة الأخبار العامة في ESPN. لا تعيد تاتشلاين كتابة المقالات: كل بطاقة تفتح الناشر الأصلي في تبويب جديد، حيث تسري شروطه وسياسة الخصوصية الخاصة به.",
      looking: "تبحث عن مباراة محددة بدلا من ذلك؟",
      matchCentre: "افتح مركز المباريات",
      or: "أو",
      search: "ابحث عن فرق ومسابقات",
      espnSoccer: "كرة قدم ESPN",
    },
    feedError: {
      title: "شريط الأخبار غير متاح",
      description:
        "لم تستجب نقطة النهاية العامة لأخبار ESPN. النتائج والجداول والمواعيد لا تتأثر — أعد المحاولة بعد قليل.",
      reload: "إعادة تحميل الشريط",
    },
    empty: {
      title: "لا توجد قصص منشورة الآن",
      description: "أرجع الشريط قائمة فارغة. تعود العناوين عادة خلال الساعة.",
      action: "تصفح مواعيد اليوم",
    },
  },
});
