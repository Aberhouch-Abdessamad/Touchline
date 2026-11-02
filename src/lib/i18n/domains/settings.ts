import { defineDomain } from "../define";

/**
 * Settings page and settings panel: appearance, interface language, time
 * zone, notifications, favourites and reminders lists, and local data
 * export/import/reset. Theme names, the language selector labels and the
 * notification/export/import/reset toasts live in `common` (t.common.*);
 * the `*Pre`/`*Post` keys wrap inline markup (code, links, zone names) that
 * sits between two translated half-sentences.
 */
export const settings = defineDomain({
  en: {
    page: {
      eyebrow: "Preferences",
      title: "Make Touchline yours",
      description:
        "Theme, time zone, alerts and favourites — all stored in this browser. No account, no tracking, no profile on a server.",
      localTitle: "Local by design",
      localPre: "Favourites and reminders are written to localStorage under ",
      localPost:
        ". Clearing site data resets them, which is why the export button exists.",
      signupTitle: "Nothing to sign up for",
      signupPre:
        "Touchline has no registration, no newsletter and no analytics identifier. Read the ",
      privacyLink: "privacy note",
      signupPost: " for the short version of what the browser stores.",
      tip: "Tip: export your preferences before clearing browsing data, then import the file on another device.",
    },
    panel: {
      appearance: {
        title: "Appearance",
        description:
          "Touchline ships with a light editorial theme and a low-glare dark theme. Your choice is stored in this browser only.",
        themeGroup: "Theme",
        lightDesc: "Warm paper background, dark ink.",
        darkDesc: "Deep green background for night matches.",
        systemDesc: "Follow the operating system setting.",
        note: "The theme is applied immediately and remembered across visits.",
        languageRowTitle: "Interface language",
        languageDescription:
          "Switch the whole interface between English and Arabic. Arabic flips the layout to right-to-left.",
      },
      timezone: {
        description:
          "Every kick-off time, date label and calendar export follows this zone.",
        displayZone: "Display time zone",
        detected:
          "Detected from your browser as {zone}. Choose any IANA zone to override it.",
        preview: "Preview",
        previewPre: "A typical Saturday 15:00 kick-off, rendered in",
        previewPost: ".",
        useBrowser: "Use browser time zone",
      },
      notifications: {
        title: "Notifications",
        description:
          "Match reminders rely on the browser Notification API. They only fire while a Touchline tab is open — the calendar export is the reliable backup.",
        alertsTitle: "Kick-off alerts",
        permissionPre: "Permission:",
        permissionUnsupported: "not supported in this browser",
        permissionGranted: "granted",
        permissionDenied: "blocked for this site",
        permissionDefault: "not requested yet",
        permissionPost:
          ". Reminders are stored locally and removed once they fire.",
        toggleOn: "Enabled",
        toggleOff: "Disabled",
        askPermission: "Ask this browser for permission",
        blockedInSettings: "Blocked in browser settings",
        toastTurnedOff: "Kick-off alerts turned off.",
        note: "Notification permission can only be requested from a user gesture, so this button is the place to grant it. You can revoke it at any time in your browser's site settings.",
      },
      favourites: {
        description:
          "Starred teams, competitions and matches are stored in this browser. They power the favourites filter on the match centre and the pinned cards on the competitions page.",
        emptyTitle: "Nothing starred yet",
        emptyDescription:
          "Use the star buttons on a match, team or competition page, then return here to manage the list.",
        browseCompetitions: "Browse competitions",
        todaysMatches: "Today's matches",
        teamsCount: "Teams · {n}",
        leaguesCount: "Competitions · {n}",
        matchesCount: "Matches · {n}",
        teamFallback: "Team",
        competitionFallback: "Competition",
        removeNamed: "Remove {name} from favourites",
      },
      reminders: {
        title: "Reminders",
        description:
          "Matches you asked to be reminded about. Each entry disappears after its alert fires, or when you remove it.",
        empty:
          "No match reminders are saved. Open any fixture and choose the bell button to add one.",
        removeAria: "Remove reminder for {name}",
      },
      data: {
        title: "Your data",
        description:
          "Touchline has no accounts and no server-side profile. Everything on this page lives in localStorage under touchline.preferences.v1, so it belongs to this browser.",
        exportTitle: "Export a copy",
        exportDescription:
          "Download a JSON file with your theme, time zone, notification choice, favourites and reminders.",
        exportAction: "Export JSON",
        importTitle: "Restore from a file",
        importDescription:
          "Import a previously exported file. Unknown or malformed fields are discarded rather than trusted.",
        importAction: "Import JSON",
        importReading: "Reading…",
        importAria: "Import a Touchline preferences JSON file",
        importReadFailed:
          "That file could not be read. Try exporting a fresh copy.",
        resetTitle: "Reset this browser",
        resetDescription:
          "Clears the theme, time zone, favourites and reminders stored here. This cannot be undone.",
        resetAction: "Reset preferences",
        resetConfirm: "Yes, clear everything",
      },
    },
  },
  ar: {
    page: {
      eyebrow: "التفضيلات",
      title: "اجعل تاتشلاين خاصًا بك",
      description:
        "المظهر والمنطقة الزمنية والتنبيهات والمفضلة — كلها محفوظة في هذا المتصفح. لا حساب، ولا تتبع، ولا ملف شخصي على أي خادم.",
      localTitle: "محلي بالتصميم",
      localPre: "تكتب المفضلة والتذكيرات في localStorage تحت ",
      localPost:
        ". مسح بيانات الموقع يعيد ضبطها، ولهذا يوجد زر التصدير.",
      signupTitle: "لا حاجة إلى أي تسجيل",
      signupPre:
        "لا يتضمن تاتشلاين تسجيلًا ولا نشرة بريدية ولا معرف تحليلات. اقرأ ",
      privacyLink: "ملحوظة الخصوصية",
      signupPost: " للملخص القصير لما يخزنه المتصفح.",
      tip: "نصيحة: صدّر تفضيلاتك قبل مسح بيانات التصفح، ثم استورد الملف على جهاز آخر.",
    },
    panel: {
      appearance: {
        title: "المظهر",
        description:
          "يأتي تاتشلاين بمظهر فاتح تحريري ومظهر داكن قليل الوهج. يبقى اختيارك محفوظًا في هذا المتصفح وحده.",
        themeGroup: "المظهر",
        lightDesc: "خلفية ورقية دافئة وحبر داكن.",
        darkDesc: "خلفية خضراء عميقة تناسب مباريات الليل.",
        systemDesc: "يتبع إعداد نظام التشغيل.",
        note: "يتم تطبيق المظهر فورًا ويبقى محفوظًا عبر الزيارات.",
        languageRowTitle: "لغة الواجهة",
        languageDescription:
          "بدّل واجهة الموقع بين الإنجليزية والعربية. عند اختيار العربية ينتقل تخطيط الصفحة إلى الاتجاه من اليمين إلى اليسار.",
      },
      timezone: {
        description:
          "كل وقت بداية مباراة وتسمية تاريخ وتصدير تقويم يتبع هذه المنطقة.",
        displayZone: "المنطقة الزمنية للعرض",
        detected:
          "مكتشفة تلقائيًا من متصفحك: {zone}. اختر أي منطقة زمنية من IANA لتجاوزها.",
        preview: "معاينة",
        previewPre: "بداية نموذجية يوم السبت الساعة 15:00، معروضة في",
        previewPost: ".",
        useBrowser: "استخدم المنطقة الزمنية للمتصفح",
      },
      notifications: {
        title: "الإشعارات",
        description:
          "تعتمد تذكيرات المباريات على واجهة الإشعارات في المتصفح، ولا يطلق التنبيه إلا أثناء فتح تبويب تاتشلاين — ويبقى تصدير التقويم هو الخيار الأضمن.",
        alertsTitle: "تنبيهات بداية المباراة",
        permissionPre: "الإذن:",
        permissionUnsupported: "غير مدعوم في هذا المتصفح",
        permissionGranted: "ممنوح",
        permissionDenied: "محجوب عن هذا الموقع",
        permissionDefault: "لم يتم الطلب بعد",
        permissionPost:
          ". يتم تخزين التذكيرات محليًا ويتم حذفها بعد تشغيلها مرة واحدة.",
        toggleOn: "مفعّل",
        toggleOff: "معطّل",
        askPermission: "اطلب الإذن من هذا المتصفح",
        blockedInSettings: "محجوب من إعدادات المتصفح",
        toastTurnedOff: "تم إيقاف تنبيهات بداية المباراة.",
        note: "لا يمكن طلب إذن الإشعارات إلا من تفاعل مباشر من المستخدم، ولهذا يوفر هذا الزر مكان منحه. يمكنك سحب الإذن في أي وقت من إعدادات الموقع في متصفحك.",
      },
      favourites: {
        description:
          "الفرق والمسابقات والمباريات التي تميزتها بنجمة محفوظة في هذا المتصفح. تغذي هذه القوائم مرشح المفضلة في صفحة المباريات والبطاقات المثبتة في صفحة المسابقات.",
        emptyTitle: "لم تختر شيئًا بعد",
        emptyDescription:
          "استخدم أزرار النجمة في صفحة مباراة أو فريق أو مسابقة، ثم عد إلى هنا لإدارة القائمة.",
        browseCompetitions: "تصفح المسابقات",
        todaysMatches: "مباريات اليوم",
        teamsCount: "فرق · {n}",
        leaguesCount: "مسابقات · {n}",
        matchesCount: "مباريات · {n}",
        teamFallback: "فريق",
        competitionFallback: "مسابقة",
        removeNamed: "إزالة {name} من المفضلة",
      },
      reminders: {
        title: "التذكيرات",
        description:
          "المباريات التي طلبت التذكير بها. تختفي كل عنصر بعد تشغيل تنبيهه أو عند حذفه.",
        empty:
          "لا توجد تذكيرات مباريات محفوظة. افتح أي مباراة مجدولة واختر زر الجرس لإضافة تذكير.",
        removeAria: "إزالة تذكير {name}",
      },
      data: {
        title: "بياناتك",
        description:
          "لا يوجد في تاتشلاين حسابات ولا ملف جانبي على الخادم. كل ما في هذه الصفحة يبقى في التخزين المحلي للمتصفح تحت المفتاح touchline.preferences.v1، وهو بذلك ملك لهذا المتصفح.",
        exportTitle: "تصدير نسخة",
        exportDescription:
          "تنزيل ملف JSON يحتوي على المظهر والمنطقة الزمنية وخيار الإشعارات والمفضلة والتذكيرات.",
        exportAction: "تصدير JSON",
        importTitle: "الاستعادة من ملف",
        importDescription:
          "استيراد ملف تم تصديره مسبقًا. الحقول غير المعروفة أو المشوهة يتم تجاهلها من دون اعتمادها.",
        importAction: "استيراد JSON",
        importReading: "جارٍ القراءة…",
        importAria: "استيراد ملف تفضيلات تاتشلاين بصيغة JSON",
        importReadFailed: "تعذر قراءة هذا الملف. جرّب تصدير نسخة جديدة.",
        resetTitle: "إعادة تعيين هذا المتصفح",
        resetDescription:
          "يمسح المظهر والمنطقة الزمنية والمفضلة والتذكيرات المحفوظة هنا، ولا يمكن التراجع عن ذلك.",
        resetAction: "إعادة تعيين التفضيلات",
        resetConfirm: "نعم، امسح كل شيء",
      },
    },
  },
});
