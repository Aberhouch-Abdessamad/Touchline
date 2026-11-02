"use client";

import { Database, Bug, Clock3, ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { ContactForm } from "@/components/pages/ContactForm";
import { RichText } from "@/components/pages/RichText";
import { useI18n } from "@/lib/i18n";

const GUIDE_ICONS = [Database, Bug, Clock3];

export function ContactView({ contactEmail }: { contactEmail?: string }) {
  const { t } = useI18n();
  const contact = t.content.contact;

  return (
    <>
      <PageHeader
        eyebrow={contact.eyebrow}
        title={contact.title}
        description={contact.description}
      />

      <div className="contact-layout">
        <ContactForm contactEmail={contactEmail} />

        <aside>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="settings-row__title">{contact.guidesHeading}</h2>
            <div className="favorite-list" style={{ marginTop: 12, gap: 14 }}>
              {contact.guides.map((guide, index) => {
                const Icon = GUIDE_ICONS[index];
                return (
                  <div key={guide.title} className="inline" style={{ alignItems: "flex-start", gap: 10 }}>
                    <span className="empty-state__icon" aria-hidden="true" style={{ margin: 0, width: 30, height: 30 }}>
                      <Icon size={15} />
                    </span>
                    <div>
                      <p className="settings-row__title">{guide.title}</p>
                      <p className="settings-row__description">{guide.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="settings-row__title">
              <ShieldCheck size={14} aria-hidden="true" /> {contact.privacyHeading}
            </h2>
            <p className="settings-row__description" style={{ marginTop: 8 }}>
              <RichText text={contact.privacyBody} />
            </p>
          </section>

          <section className="card">
            <h2 className="settings-row__title">{contact.providersHeading}</h2>
            <p className="settings-row__description" style={{ marginTop: 8 }}>
              {contact.providersBody}
            </p>
            <div className="data-actions" style={{ marginTop: 12 }}>
              <a
                className="btn btn--ghost btn--sm"
                href="https://www.espn.com/soccer/"
                target="_blank"
                rel="noopener noreferrer"
              >
                {contact.espnSoccer}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              <a
                className="btn btn--ghost btn--sm"
                href="https://www.fifa.com/fifa-world-ranking"
                target="_blank"
                rel="noopener noreferrer"
              >
                {contact.fifaRankings}
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
