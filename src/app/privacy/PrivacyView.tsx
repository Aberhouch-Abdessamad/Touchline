"use client";

import Link from "next/link";
import { Download, Lock, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { RichText } from "@/components/pages/RichText";
import { useI18n } from "@/lib/i18n";

/** The localStorage keys the site writes; contents are described in the dictionary. */
const STORED_KEYS = ["touchline.theme", "touchline.preferences.v1"] as const;

export function PrivacyView() {
  const { t } = useI18n();
  const privacy = t.content.privacy;

  return (
    <>
      <PageHeader
        eyebrow={privacy.eyebrow}
        title={privacy.title}
        description={privacy.description}
      />

      <div className="content-page">
        <article className="prose">
          <h2 id="summary">{privacy.summary.heading}</h2>
          <blockquote>{privacy.summary.quote}</blockquote>

          <h2 id="stored">{privacy.stored.heading}</h2>
          <p>{privacy.stored.intro}</p>
          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table className="data-table">
              <caption className="sr-only">{privacy.stored.caption}</caption>
              <thead>
                <tr>
                  <th scope="col">{privacy.stored.cols.key}</th>
                  <th scope="col">{privacy.stored.cols.contents}</th>
                  <th scope="col">{privacy.stored.cols.why}</th>
                </tr>
              </thead>
              <tbody>
                {STORED_KEYS.map((key, index) => {
                  const row = privacy.stored.rows[index];
                  return (
                    <tr key={key}>
                      <td style={{ whiteSpace: "normal" }}>
                        <code>{key}</code>
                      </td>
                      <td style={{ whiteSpace: "normal" }}>{row.fields}</td>
                      <td style={{ whiteSpace: "normal" }}>{row.purpose}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ whiteSpace: "normal" }}>
                    <code>touchline.*</code> {privacy.stored.extra.keyNote}
                  </td>
                  <td style={{ whiteSpace: "normal" }}>
                    {privacy.stored.extra.fields}
                  </td>
                  <td style={{ whiteSpace: "normal" }}>
                    {privacy.stored.extra.purpose}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="not-collected">{privacy.notCollected.heading}</h2>
          <ul>
            {privacy.notCollected.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 id="requests">{privacy.requests.heading}</h2>
          <p>{privacy.requests.p1}</p>
          <p>{privacy.requests.p2}</p>

          <h2 id="email">{privacy.email.heading}</h2>
          <p>
            <RichText text={privacy.email.p} />
          </p>

          <h2 id="control">{privacy.control.heading}</h2>
          <p>
            <RichText text={privacy.control.p} />
          </p>
          <div className="data-actions" style={{ marginTop: 18 }}>
            <Link href="/settings" className="btn btn--accent btn--sm">
              <Download size={14} aria-hidden="true" />
              {privacy.control.exportReset}
            </Link>
            <Link href="/faq" className="btn btn--ghost btn--sm">
              <Lock size={14} aria-hidden="true" />
              {privacy.control.readFaq}
            </Link>
          </div>

          <h2 id="children">{privacy.children.heading}</h2>
          <p>{privacy.children.p}</p>

          <h2 id="changes">{privacy.changes.heading}</h2>
          <p>{privacy.changes.p}</p>

          <h2 id="contact">{privacy.contact.heading}</h2>
          <p>
            <RichText text={privacy.contact.p} />
          </p>

          <p className="small text-muted" style={{ marginTop: 26 }}>
            <Trash2 size={12} aria-hidden="true" /> {privacy.finalNote}
          </p>
        </article>

        <aside className="content-aside">
          <h2 className="content-aside__title">{privacy.onThisPage}</h2>
          <nav aria-label={privacy.navAria}>
            <a href="#summary">{privacy.summary.heading}</a>
            <a href="#stored">{privacy.stored.heading}</a>
            <a href="#not-collected">{privacy.notCollected.heading}</a>
            <a href="#requests">{privacy.requests.heading}</a>
            <a href="#email">{privacy.email.heading}</a>
            <a href="#control">{privacy.control.heading}</a>
            <a href="#children">{privacy.children.heading}</a>
            <a href="#changes">{privacy.changes.heading}</a>
            <a href="#contact">{privacy.contact.heading}</a>
          </nav>
        </aside>
      </div>
    </>
  );
}
