/**
 * Arabic display text for the live desk's provider data. ESPN publishes
 * statistic labels and event sentences in English only; the numbers stay
 * verbatim and only the surrounding words are localised here, in code — no
 * AI call, nothing is invented. Unknown labels fall back to the provider text.
 */
const STAT_AR: Record<string, string> = {
  possessionpct: "الاستحواذ",
  possession: "الاستحواذ",
  totalshots: "إجمالي التسديدات",
  shots: "التسديدات",
  shotsontarget: "تسديدات على المرمى",
  shotsoffgoal: "تسديدات خارج المرمى",
  blockedshots: "تسديدات محظورة",
  shotpct: "دقة التسديد",
  wincorners: "الركنيات",
  woncorners: "الركنيات",
  cornerkicks: "الركنيات",
  foulscommitted: "الأخطاء",
  fouls: "الأخطاء",
  yellowcards: "البطاقات الصفراء",
  redcards: "البطاقات الحمراء",
  offsides: "التسلل",
  saves: "التصديات",
  goalkeepersaves: "تصديات الحارس",
  accuratepasses: "تمريرات دقيقة",
  totalpasses: "إجمالي التمريرات",
  passes: "التمريرات",
  passpct: "دقة التمرير",
  passingaccuracy: "دقة التمرير",
  accuratecrosses: "عرضيات دقيقة",
  totalcrosses: "إجمالي العرضيات",
  crosspct: "دقة العرضيات",
  effectivetackles: "تدخلات ناجحة",
  totaltackles: "إجمالي التدخلات",
  tacklepct: "دقة التدخلات",
  interceptions: "اعتراضات",
  effectiveclearance: "تشتيتات ناجحة",
  totalclearance: "التشتيتات",
  clearances: "التشتيتات",
  longballs: "كرات طويلة",
  accuratelongballs: "كرات طويلة دقيقة",
  accuratethroughballs: "تمريرات بينية دقيقة",
  totalgoals: "الأهداف",
  goals: "الأهداف",
  assists: "التمريرات الحاسمة",
  penaltykickgoals: "أهداف ركلات الجزاء",
  penaltykickshots: "ركلات الجزاء",
};

const norm = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

export function statLabel(
  row: { name: string; label: string },
  lang: "en" | "ar",
): string {
  const fallback = row.label || row.name;
  if (lang !== "ar") return fallback;
  return STAT_AR[norm(row.name)] ?? STAT_AR[norm(row.label)] ?? fallback;
}

/**
 * Event line for Arabic: the localised kind plus the published player names
 * (names stay as published). Falls back to the provider sentence when it
 * carries more than we can rebuild.
 */
export function eventText(
  event: { players: string[]; text: string },
  kindName: string,
  lang: "en" | "ar",
): string {
  if (lang !== "ar") return event.text;
  const players = event.players.filter(Boolean);
  return players.length > 0 ? `${kindName} — ${players.join("، ")}` : kindName;
}
