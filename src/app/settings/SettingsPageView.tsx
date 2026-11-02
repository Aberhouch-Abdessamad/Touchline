"use client";

import Link from "next/link";
import { HardDrive, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { useI18n } from "@/lib/i18n";

/** Client presentation for the settings page; metadata stays server-side. */
export function SettingsPageView() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        eyebrow={t.settings.page.eyebrow}
        title={t.settings.page.title}
        description={t.settings.page.description}
      />

      <SettingsPanel />

      <section className="section section--tight">
        <div className="two-col">
          <article className="card">
            <span className="empty-state__icon" aria-hidden="true">
              <HardDrive size={20} />
            </span>
            <h2 className="settings-row__title" style={{ marginTop: 12 }}>
              {t.settings.page.localTitle}
            </h2>
            <p className="settings-row__description">
              {t.settings.page.localPre}{" "}
              <code className="u-dir-ltr">touchline.preferences.v1</code>
              {t.settings.page.localPost}
            </p>
          </article>
          <article className="card">
            <span className="empty-state__icon" aria-hidden="true">
              <ShieldCheck size={20} />
            </span>
            <h2 className="settings-row__title" style={{ marginTop: 12 }}>
              {t.settings.page.signupTitle}
            </h2>
            <p className="settings-row__description">
              {t.settings.page.signupPre}{" "}
              <Link href="/privacy">{t.settings.page.privacyLink}</Link>
              {t.settings.page.signupPost}
            </p>
          </article>
        </div>

        <p className="small text-muted" style={{ marginTop: 18 }}>
          <Sparkles size={12} aria-hidden="true" /> {t.settings.page.tip}
        </p>
      </section>
    </>
  );
}
