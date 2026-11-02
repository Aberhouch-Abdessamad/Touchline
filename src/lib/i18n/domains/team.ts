import { defineDomain } from "../define";

/**
 * Team page translations: header hero, season summary strip, fixtures
 * sections and the follow-the-competition block. Team names, competition
 * names and season labels from data stay raw.
 */
export const team = defineDomain({
  en: {
    errors: {
      loadTitle: "This team could not be loaded",
      loadDescription:
        "ESPN's team endpoint did not respond, or this team is not indexed. Try again in a moment.",
      searchTeam: "Search for a team",
    },
    hero: {
      kicker: "Team profile",
    },
    summary: {
      fixturesThisSeason: "Fixtures this season",
      played: "Played",
      stillToCome: "Still to come",
      selectedSeason: "Selected season",
    },
    toolbar: {
      leagueTable: "{abbr} table",
      matchCentre: "Match centre",
      source: "Source: ESPN team schedule",
    },
    fixtures: {
      upcoming: "Upcoming fixtures",
      results: "Results",
      upcomingEmpty: "No upcoming fixtures are listed for this season.",
      resultsEmpty: "No results are listed for this season.",
      noneTitle: "No fixtures published for this season",
      noneDescription:
        "ESPN does not list a schedule for this team in the selected season. Try another season above, or search for the competition.",
      browseCompetitions: "Browse competitions",
    },
    explore: {
      kicker: "Keep exploring",
      title: "Follow the competition",
      description:
        "A team's season only makes sense next to its table, its rivals and the fixture list.",
      leagueTable: "League table",
      fullSeason: "Full season",
      topScorers: "Top scorers",
      allCompetitions: "All competitions",
    },
    footnote:
      "Team names, crests and season records come from ESPN's public team profile. Where a field is missing, Touchline leaves it out rather than guessing.",
  },
  ar: {
    errors: {
      loadTitle: "تعذر تحميل هذا الفريق",
      loadDescription:
        "لم تستجب واجهة الفريق لدى ESPN، أو أن هذا الفريق غير مفهرس. أعد المحاولة بعد قليل.",
      searchTeam: "ابحث عن فريق",
    },
    hero: {
      kicker: "ملف الفريق",
    },
    summary: {
      fixturesThisSeason: "مباريات هذا الموسم",
      played: "ملعوبة",
      stillToCome: "المتبقية",
      selectedSeason: "الموسم المختار",
    },
    toolbar: {
      leagueTable: "جدول {abbr}",
      matchCentre: "مركز المباريات",
      source: "المصدر: برنامج مباريات الفريق من ESPN",
    },
    fixtures: {
      upcoming: "المباريات القادمة",
      results: "النتائج",
      upcomingEmpty: "لا مواجهات قادمة مدرجة لهذا الموسم.",
      resultsEmpty: "لا نتائج مدرجة لهذا الموسم.",
      noneTitle: "لا مواجهات منشورة لهذا الموسم",
      noneDescription:
        "لا يسرّد ESPN برنامج مباريات لهذا الفريق في الموسم المختار. جرّب موسما آخر أعلاه، أو ابحث عن المسابقة.",
      browseCompetitions: "استعرض المسابقات",
    },
    explore: {
      kicker: "واصل الاستكشاف",
      title: "تابع المسابقة",
      description:
        "لا يكتمل موسم الفريق إلا بجدول ترتيبه ومنافسيه وقائمة مبارياته.",
      leagueTable: "جدول الترتيب",
      fullSeason: "الموسم الكامل",
      topScorers: "الهدافون",
      allCompetitions: "كل المسابقات",
    },
    footnote:
      "أسماء الفرق والشعارات وسجلات المواسم مصدرها ملف الفريق العام لدى ESPN. وحيثما ينقص حقل، يتركه تاتشلاين فارغا بدل التخمين.",
  },
});
