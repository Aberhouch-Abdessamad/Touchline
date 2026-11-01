import type { Metadata } from "next";
import Link from "next/link";
import { Bug, Clock3, Database, ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { ContactForm } from "@/components/pages/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Report a data problem, request a competition, or send feedback about Touchline. The form opens a real email in your own mail app.",
  alternates: { canonical: "/contact" },
};

const GUIDES = [
  {
    icon: Database,
    title: "Data corrections",
    body: "Include the competition, the date and a link to the page. If a score is wrong, say what it should be and where that comes from if you can.",
  },
  {
    icon: Bug,
    title: "Bug reports",
    body: "Describe what you expected, what happened, and which browser and device you used. A screenshot is welcome but not required.",
  },
  {
    icon: Clock3,
    title: "Timing questions",
    body: "Kick-off times follow the time zone saved in Settings. Check that first — most time complaints are a zone mismatch, not missing data.",
  },
];

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Tell us what is broken or missing"
        description="Touchline is maintained as an independent project. Data corrections, accessibility feedback and competition requests are all welcome."
      />

      <div className="contact-layout">
        <ContactForm contactEmail={contactEmail} />

        <aside>
          <section className="card" style={{ marginBottom: 16 }}>
            <h2 className="settings-row__title">What to include</h2>
            <div className="favorite-list" style={{ marginTop: 12, gap: 14 }}>
              {GUIDES.map((guide) => {
                const Icon = guide.icon;
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
              <ShieldCheck size={14} aria-hidden="true" /> Privacy
            </h2>
            <p className="settings-row__description" style={{ marginTop: 8 }}>
              The form never posts to a server. Your message is composed in your
              mail app and sent from your own address. The{" "}
              <Link href="/privacy">privacy note</Link> explains what the site
              stores locally.
            </p>
          </section>

          <section className="card">
            <h2 className="settings-row__title">Provider issues</h2>
            <p className="settings-row__description" style={{ marginTop: 8 }}>
              Some problems belong upstream. If a whole competition is missing
              from ESPN&apos;s public data, the provider&apos;s own feedback channel
              is the right place.
            </p>
            <div className="data-actions" style={{ marginTop: 12 }}>
              <a
                className="btn btn--ghost btn--sm"
                href="https://www.espn.com/soccer/"
                target="_blank"
                rel="noopener noreferrer"
              >
                ESPN Soccer
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              <a
                className="btn btn--ghost btn--sm"
                href="https://www.fifa.com/fifa-world-ranking"
                target="_blank"
                rel="noopener noreferrer"
              >
                FIFA rankings
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
