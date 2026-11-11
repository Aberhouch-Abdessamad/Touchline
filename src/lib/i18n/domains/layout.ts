import { defineDomain } from "../define";

/**
 * App shell strings: primary navigation, header actions and footer.
 * Hrefs live in `@/lib/site` — only wording belongs here.
 */
export const layout = defineDomain({
  en: {
    nav: {
      matches: "Matches",
      competitions: "Competitions",
      news: "News",
      rankings: "Rankings",
      calendar: "Calendar",
      search: "Search",
    },
    ariaNavPrimary: "Primary",
    ariaNavMobile: "Mobile",
    brandTag: "Football, without the noise",
    home: "home",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    settingsLabel: "Settings",
    settingsTitle: "Settings and favourites",
    settingsAria: "Settings{saved}",
    settingsAriaSaved: ", {n} favourites saved",
    mobileSettings: "Settings & favourites",
    mobileNote:
      "All times follow your saved timezone. Preferences stay in this browser.",
    footer: {
      blurb:
        "Scores, tables, fixtures and rankings from public sports APIs — presented without pop-ups, autoplay or invented numbers.",
      status: "Live data via ESPN & FIFA",
      groups: {
        explore: "Explore",
        project: "Project",
        legal: "Legal",
      },
      labels: {
        matches: "Matches",
        competitions: "Competitions",
        news: "News",
        rankings: "FIFA rankings",
        calendar: "Calendar",
        about: "About",
        apiDocs: "API docs",
        faqs: "FAQ",
        contact: "Contact",
        privacy: "Privacy",
        settings: "Settings",
      },
      espnSoccer: "ESPN Soccer",
      fifaRankings: "FIFA rankings",
      independent: "An independent, non-commercial football data project.",
      attribution:
        "Match, table and fixture data from ESPN's public APIs. Rankings from FIFA. Touchline is an independent project and is not affiliated with either provider.",
    },
  },
  ar: {
    nav: {
      matches: "المباريات",
      competitions: "المسابقات",
      news: "الأخبار",
      rankings: "التصنيفات",
      calendar: "التقويم",
      search: "البحث",
    },
    ariaNavPrimary: "التنقل الرئيسي",
    ariaNavMobile: "قائمة الجوال",
    brandTag: "كرة القدم، بلا ضجيج",
    home: "الصفحة الرئيسية",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    settingsLabel: "الإعدادات",
    settingsTitle: "الإعدادات والمفضلة",
    settingsAria: "الإعدادات{saved}",
    settingsAriaSaved: "، {n} مفضلة محفوظة",
    mobileSettings: "الإعدادات والمفضلة",
    mobileNote:
      "جميع الأوقات تتبع المنطقة الزمنية المحفوظة لديك. تبقى التفضيلات في هذا المتصفح.",
    footer: {
      blurb:
        "النتائج والجداول والمواعيد والتصنيفات من مصادر رياضية عامة — دون نوافذ منبثقة أو تشغيل تلقائي أو أرقام مختلقة.",
      status: "بيانات مباشرة عبر ESPN وFIFA",
      groups: {
        explore: "استكشف",
        project: "المشروع",
        legal: "قانوني",
      },
      labels: {
        matches: "المباريات",
        competitions: "المسابقات",
        news: "الأخبار",
        rankings: "تصنيف الفيفا",
        calendar: "التقويم",
        about: "حول المشروع",
        apiDocs: "وثائق الواجهة",
        faqs: "الأسئلة الشائعة",
        contact: "تواصل معنا",
        privacy: "الخصوصية",
        settings: "الإعدادات",
      },
      espnSoccer: "كرة قدم ESPN",
      fifaRankings: "تصنيف الفيفا",
      independent: "مشروع مستقل وغير ربحي لبيانات كرة القدم.",
      attribution:
        "بيانات المباريات والجداول والمواعيد من واجهات ESPN العامة، وتصنيفات الفيفا من FIFA. تاتشلاين مشروع مستقل وغير تابع لأي من المزوّدين.",
    },
  },
});
