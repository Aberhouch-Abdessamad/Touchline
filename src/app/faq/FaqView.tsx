"use client";

import Link from "next/link";
import { MessageCircleQuestion, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { RichText } from "@/components/pages/RichText";
import { useI18n } from "@/lib/i18n";

/** Stable anchor ids for the FAQ groups, independent of the translated headings. */
const GROUP_IDS = ["data", "using-the-site", "privacy-technical"] as const;

export function FaqView() {
  const { t } = useI18n();
  const faqs = t.content.faqs;

  return (
    <>
      <PageHeader
        eyebrow={faqs.eyebrow}
        title={faqs.title}
        description={faqs.description}
        actions={
          <Link href="/contact" className="btn btn--ghost">
            <MessageCircleQuestion size={16} aria-hidden="true" />
            {faqs.askQuestion}
          </Link>
        }
      />

      <div className="content-page">
        <div>
          {faqs.groups.map((group, groupIndex) => {
            const groupId = GROUP_IDS[groupIndex];
            return (
              <section
                key={groupId}
                id={groupId}
                style={{ marginBottom: 28 }}
              >
                <h2 className="group-title">{group.heading}</h2>
                <div className="faq-list" style={{ maxWidth: "100%" }}>
                  {group.items.map((item) => (
                    <details className="faq-item" key={item.q}>
                      <summary>{item.q}</summary>
                      <div className="faq-item__body">
                        <RichText text={item.a} />
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="content-aside">
          <h2 className="content-aside__title">{faqs.onThisPage}</h2>
          <nav aria-label={faqs.navAria}>
            {faqs.groups.map((group, groupIndex) => (
              <a key={GROUP_IDS[groupIndex]} href={`#${GROUP_IDS[groupIndex]}`}>
                {group.heading}
              </a>
            ))}
            <Link href="/api-docs">{faqs.apiDocsLink}</Link>
            <Link href="/privacy">{faqs.privacyNoteLink}</Link>
          </nav>
          <div style={{ marginTop: 20 }}>
            <Link href="/search" className="btn btn--ghost btn--sm">
              <Search size={14} aria-hidden="true" />
              {faqs.searchSite}
            </Link>
          </div>
          <p className="small text-muted" style={{ marginTop: 14 }}>
            {faqs.stillStuck}
          </p>
        </aside>
      </div>
    </>
  );
}
