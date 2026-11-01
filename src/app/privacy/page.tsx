import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Trash2, Download } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Touchline stores in your browser, what it never collects, and how to export or delete your local preferences.",
  alternates: { canonical: "/privacy" },
};

const STORED = [
  {
    key: "touchline.theme",
    fields: "One of light, dark or system.",
    purpose: "Applies your theme before the page paints, avoiding a flash.",
  },
  {
    key: "touchline.preferences.v1",
    fields:
      "Theme, time zone, notification choice, favourite teams, favourite competitions, favourite matches, match reminders.",
    purpose:
      "Personalises match filters, competition pins, kick-off times and reminder alerts.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Privacy"
        title="Your data stays in your browser"
        description={`${SITE_NAME} has no accounts, no analytics cookies and no server-side profile. This page lists every piece of information the site stores and how to remove it.`}
      />

      <div className="content-page">
        <article className="prose">
          <h2 id="summary">The short version</h2>
          <blockquote>
            There is no sign-up, no tracking script, no advertising network and
            no database of visitors. Preferences are kept in your browser&apos;s
            localStorage. Clearing site data deletes them permanently.
          </blockquote>

          <h2 id="stored">What is stored locally</h2>
          <p>
            The site writes only the following keys. They are scoped to the
            Touchline origin and are not readable by other websites.
          </p>
          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table className="data-table">
              <caption className="sr-only">
                Local storage keys and their contents
              </caption>
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Contents</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {STORED.map((entry) => (
                  <tr key={entry.key}>
                    <td style={{ whiteSpace: "normal" }}>
                      <code>{entry.key}</code>
                    </td>
                    <td style={{ whiteSpace: "normal" }}>{entry.fields}</td>
                    <td style={{ whiteSpace: "normal" }}>{entry.purpose}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ whiteSpace: "normal" }}>
                    <code>touchline.*</code> (none currently)
                  </td>
                  <td style={{ whiteSpace: "normal" }}>
                    No analytics, advertising or session identifiers are written.
                  </td>
                  <td style={{ whiteSpace: "normal" }}>
                    The project does not include a tracking script.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="not-collected">What is not collected</h2>
          <ul>
            <li>No name, address, phone number or account credentials.</li>
            <li>No email address, unless you choose to send one by email.</li>
            <li>
              No analytics identifier, fingerprint, session recording or
              cross-site tracker.
            </li>
            <li>
              No advertising cookies. The site does not embed ad networks or
              social pixels.
            </li>
            <li>
              No server-side history of which matches you viewed. Pages are
              rendered per request and are not tied to a user identity.
            </li>
          </ul>

          <h2 id="requests">Requests to other servers</h2>
          <p>
            Pages and API routes call ESPN&apos;s public soccer APIs and
            FIFA&apos;s public rankings API. Those requests originate from the
            Touchline server, not from your browser, so your IP address is not
            shared with the providers for page rendering.
          </p>
          <p>
            Two things do reach third-party servers from your browser: team and
            competition crests are loaded from the provider&apos;s image CDN, and
            following an attribution link opens the provider&apos;s site under
            their own privacy policy. Fonts are self-hosted, so no font CDN is
            contacted.
          </p>

          <h2 id="email">If you send an email</h2>
          <p>
            The <Link href="/contact">contact form</Link> validates your message
            in the browser and opens it in your mail app. Nothing is transmitted
            to Touchline&apos;s server, and no copy is stored. What happens next
            depends on your email provider and ours.
          </p>

          <h2 id="control">Exporting and deleting</h2>
          <p>
            Open <Link href="/settings">Settings</Link> to download a JSON copy of
            your preferences, import them on another device, or reset everything.
            You can also clear the site&apos;s data from your browser settings;
            Touchline will simply start from its defaults next time.
          </p>
          <div className="data-actions" style={{ marginTop: 18 }}>
            <Link href="/settings" className="btn btn--accent btn--sm">
              <Download size={14} aria-hidden="true" />
              Export or reset preferences
            </Link>
            <Link href="/faq" className="btn btn--ghost btn--sm">
              <Lock size={14} aria-hidden="true" />
              Read the FAQ
            </Link>
          </div>

          <h2 id="children">Children</h2>
          <p>
            The site is a general-audience sports reference and does not
            knowingly collect personal information from anyone, including
            children. There is nothing to sign up for.
          </p>

          <h2 id="changes">Changes to this note</h2>
          <p>
            If the site ever adds a feature that changes what is stored, this
            page will be updated before that feature ships. The current version
            stores only the two localStorage keys listed above.
          </p>

          <h2 id="contact">Contact</h2>
          <p>
            Questions about this note can go through the{" "}
            <Link href="/contact">contact form</Link>. Because there is no
            visitor database, a deletion request is best handled by clearing
            site data in your browser — there is no server-side record to remove.
          </p>

          <p className="small text-muted" style={{ marginTop: 26 }}>
            <Trash2 size={12} aria-hidden="true" /> Remember: clearing browser
            storage also removes saved favourites and reminders. Export a backup
            first if you want to keep them.
          </p>
        </article>

        <aside className="content-aside">
          <h2 className="content-aside__title">On this page</h2>
          <nav aria-label="Privacy sections">
            <a href="#summary">The short version</a>
            <a href="#stored">What is stored locally</a>
            <a href="#not-collected">What is not collected</a>
            <a href="#requests">Requests to other servers</a>
            <a href="#email">If you send an email</a>
            <a href="#control">Exporting and deleting</a>
            <a href="#children">Children</a>
            <a href="#changes">Changes to this note</a>
            <a href="#contact">Contact</a>
          </nav>
        </aside>
      </div>
    </>
  );
}
