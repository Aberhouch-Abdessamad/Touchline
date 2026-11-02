"use client";

import { useI18n } from "@/components/providers/PreferencesProvider";

/**
 * Toggles the interface between English and Arabic. Shows the language you
 * would switch to (like the theme toggle shows the state you would move to).
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const next = lang === "ar" ? "en" : "ar";
  const label =
    lang === "ar"
      ? t.common.language.switchToEnglish
      : t.common.language.switchToArabic;

  return (
    <button
      type="button"
      className={className ?? "icon-button language-toggle"}
      onClick={() => setLang(next)}
      aria-label={label}
      title={label}
      lang={lang === "ar" ? "en" : "ar"}
    >
      <span className="language-toggle__label" aria-hidden="true">
        {lang === "ar" ? "EN" : "عربي"}
      </span>
    </button>
  );
}
