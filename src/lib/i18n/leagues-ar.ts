import type { Locale } from "./core";

/**
 * Arabic names for the 76 tracked competitions, keyed by league slug.
 * Team and league names come from ESPN in English; this map localises the
 * well-known competition names only. Anything not listed falls back to the
 * English name.
 */
const LEAGUE_NAMES_AR: Record<string, string> = {
  "eng.1": "الدوري الإنجليزي الممتاز",
  "esp.1": "الدوري الإسباني (لاليغا)",
  "ita.1": "الدوري الإيطالي الدرجة الأولى",
  "ger.1": "الدوري الألماني (بوندسليغا)",
  "fra.1": "الدوري الفرنسي (ليغ 1)",
  "uefa.champions": "دوري أبطال أوروبا",
  "uefa.europa": "الدوري الأوروبي",
  "conmebol.libertadores": "كأس ليبرتادوريس",
  "fifa.cwc": "كأس العالم للأندية",
  "eng.w.1": "الدوري الإنجليزي الممتاز للسيدات",
  "fifa.world": "كأس العالم",
  "fifa.wwc": "كأس العالم للسيدات",
  "uefa.euro": "بطولة أمم أوروبا",
  "caf.nations": "كأس أمم أفريقيا",
  "eng.2": "الدوري الإنجليزي الدرجة الثانية",
  "esp.2": "الدوري الإسباني الدرجة الثانية",
  "ger.2": "الدوري الألماني الدرجة الثانية",
  "ita.2": "الدوري الإيطالي الدرجة الثانية",
  "fra.2": "الدوري الفرنسي الدرجة الثانية",
  "ned.1": "الدوري الهولندي الممتاز",
  "por.1": "الدوري البرتغالي الممتاز",
  "sco.1": "دوري السوبر الأسكتلندي",
  "tur.1": "الدوري التركي الممتاز",
  "bel.1": "الدوري البلجيكي الممتاز",
  "gre.1": "الدوري اليوناني الممتاز",
  "sui.1": "الدوري السويسري الممتاز",
  "aut.1": "الدوري النمساوي الممتاز",
  "den.1": "الدوري الدنماركي الممتاز",
  "nor.1": "الدوري النرويجي الممتاز",
  "swe.1": "الدوري السويدي الممتاز",
  "rus.1": "الدوري الروسي الممتاز",
  "bra.1": "الدوري البرازيلي الدرجة الأولى",
  "arg.1": "الدوري الأرجنتيني الممتاز",
  "usa.1": "الدوري الأمريكي الممتاز (MLS)",
  "mex.1": "الدوري المكسيكي الممتاز",
  "ksa.1": "الدوري السعودي للمحترفين",
  "aus.1": "الدوري الأسترالي الممتاز",
  "jpn.1": "الدوري الياباني (جي ليغ)",
  "uefa.europa.conf": "الدوري الأوروبي للمؤتمرات",
  "uefa.champions_qual": "تصفيات دوري أبطال أوروبا",
  "concacaf.champions": "كأس أبطال الكونكاكاف",
  "afc.champions": "دوري أبطال آسيا للنخبة",
  "uefa.super_cup": "كأس السوبر الأوروبي",
  "eng.fa": "كأس الاتحاد الإنجليزي",
  "eng.league_cup": "كأس الرابطة الإنجليزية",
  "esp.copa_del_rey": "كأس ملك إسبانيا",
  "ita.coppa_italia": "كأس إيطاليا",
  "ger.dfb_pokal": "كأس ألمانيا (دي إف بي بوكال)",
  "fra.coupe_de_france": "كأس فرنسا",
  "eng.trophy": "كأس الرابطة الإنجليزية (تروفي)",
  "esp.w.1": "الدوري الإسباني للسيدات",
  "fra.w.1": "الدوري الفرنسي للسيدات",
  "usa.nwsl": "الدوري الوطني الأمريكي للسيدات (NWSL)",
  "mex.w.1": "الدوري المكسيكي للسيدات",
  "usa.w.usl.1": "الدوري الأمريكي الأول للسيدات (USL)",
  "uefa.wchampions": "دوري أبطال أوروبا للسيدات",
  "eng.w.fa": "كأس الاتحاد الإنجليزي للسيدات",
  "uefa.weuro": "بطولة أمم أوروبا للسيدات",
  "uefa.nations": "دوري الأمم الأوروبية",
  "uefa.w.nations": "دوري الأمم الأوروبية للسيدات",
  "uefa.euroq": "تصفيات أمم أوروبا",
  "conmebol.america": "كوبا أمريكا",
  "conmebol.america.femenina": "كوبا أمريكا للسيدات",
  "concacaf.gold": "كأس الكونكاكاف الذهبية",
  "fifa.friendly": "مباريات ودية دولية",
  "fifa.friendly.w": "مباريات ودية دولية للسيدات",
  "fifa.worldq.uefa": "تصفيات كأس العالم (أوروبا)",
  "fifa.worldq.conmebol": "تصفيات كأس العالم (أمريكا الجنوبية)",
  "fifa.worldq.concacaf": "تصفيات كأس العالم (أمريكا الشمالية)",
  "fifa.worldq.caf": "تصفيات كأس العالم (أفريقيا)",
  "fifa.worldq.afc": "تصفيات كأس العالم (آسيا)",
  "fifa.worldq.ofc": "تصفيات كأس العالم (أوقيانوسيا)",
  "uefa.euro_u21": "بطولة أمم أوروبا تحت 21 عامًا",
  "fifa.world.u20": "كأس العالم تحت 20 عامًا",
  "fifa.olympics": "كرة القدم في الألعاب الأولمبية",
  "fifa.w.olympics": "كرة القدم في الألعاب الأولمبية للسيدات",
};

type LeagueRef = { slug?: string; name: string } | undefined | null;

/** Display name for a competition, localised when an Arabic name is known. */
export function leagueDisplayName(league: LeagueRef, locale: Locale): string {
  if (locale === "ar" && league?.slug) {
    const arabic = LEAGUE_NAMES_AR[league.slug];
    if (arabic) return arabic;
  }
  return league?.name ?? "";
}
