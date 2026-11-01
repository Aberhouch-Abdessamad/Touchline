import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleQuestion, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about Touchline's data sources, refresh rates, time zones, favourites, reminders, calendar exports and missing competitions.",
  alternates: { canonical: "/faq" },
};

const GROUPS: Array<{
  heading: string;
  items: Array<{ question: string; answer: React.ReactNode }>;
}> = [
  {
    heading: "Data",
    items: [
      {
        question: "Where do the scores and tables come from?",
        answer: (
          <>
            ESPN&apos;s public soccer APIs supply scores, fixtures, tables, team
            profiles, match summaries and news. FIFA&apos;s public ranking API
            supplies the men&apos;s and women&apos;s world rankings. Competition
            metadata is cached from ESPN&apos;s core API when the project is
            generated. Every page names its source.
          </>
        ),
      },
      {
        question: "How fresh is live data?",
        answer: (
          <>
            Fixture lists are cached for around 30 seconds, tables for two
            minutes and rankings for six hours. A page load asks for the latest
            cached response, so a live score can trail the broadcast by a short
            interval. Reloading is the way to force a fresh request once the
            cache window has passed.
          </>
        ),
      },
      {
        question: "Why is a match, table or scorer list missing?",
        answer: (
          <>
            The provider did not publish it. Pre-season fixtures often have no
            table, cup competitions frequently have no season-long scorer board,
            and very old matches fall out of the summary index. Touchline shows
            an explicit empty state with the reason instead of a blank panel or
            a made-up value.
          </>
        ),
      },
      {
        question: "Why are some competitions absent?",
        answer: (
          <>
            The catalogue only includes competition slugs that were verified
            against the live provider. A handful of ESPN slugs return errors for
            every season, so they are left out rather than shipped as dead
            links. Coverage currently stands at 76 competitions across six
            confederations.
          </>
        ),
      },
      {
        question: "Do you cover women's football?",
        answer: (
          <>
            Yes. The competition directory can be filtered to women&apos;s
            competitions, several women&apos;s leagues are in the catalogue, and
            the rankings page has a dedicated women&apos;s board.
          </>
        ),
      },
    ],
  },
  {
    heading: "Using the site",
    items: [
      {
        question: "Do I need an account?",
        answer: (
          <>
            No. There is no registration, sign-in or newsletter. Favourites,
            reminders and display preferences are stored in your browser&apos;s
            localStorage. Use <Link href="/settings">Settings</Link> to export
            them as JSON if you want a backup.
          </>
        ),
      },
      {
        question: "How do favourites work?",
        answer: (
          <>
            The star button appears on match, team and competition pages. On the{" "}
            <Link href="/matches">match centre</Link>, the favourites filter
            narrows the day&apos;s fixtures to the teams and matches you starred.
            On <Link href="/competitions">Competitions</Link>, starred
            competitions can be isolated with the favourites toggle. Manage the
            whole list in <Link href="/settings">Settings</Link>.
          </>
        ),
      },
      {
        question: "Which time zone are kick-off times shown in?",
        answer: (
          <>
            By default, the zone your browser reports. You can override it in{" "}
            <Link href="/settings">Settings</Link>; the choice applies to match
            rows, the scoreboard, calendar exports and reminder labels. Calendar
            files themselves use UTC timestamps so they land correctly anywhere.
          </>
        ),
      },
      {
        question: "How do reminders work?",
        answer: (
          <>
            The bell button on a match saves a reminder locally and asks the
            browser for notification permission. While a Touchline tab is open,
            the app checks pending reminders every 30 seconds and alerts you
            within ten minutes of kick-off. Browsers throttle background tabs, so
            add the match to your calendar as well if the alert matters.
          </>
        ),
      },
      {
        question: "How do I export fixtures to my calendar?",
        answer: (
          <>
            On a match page, open the calendar menu for Google Calendar, Outlook
            or a downloaded <code>.ics</code> file. The{" "}
            <Link href="/calendar">calendar page</Link> exports a whole month or
            a single day. Exports contain the kick-off time, competition, round
            and venue when the provider supplies them.
          </>
        ),
      },
      {
        question: "Does search cover every team?",
        answer: (
          <>
            Search matches competition names from the local catalogue and asks
            ESPN for teams. If the team endpoint is unavailable, the results
            explain that only competitions are shown. Very small or defunct clubs
            may not be indexed upstream.
          </>
        ),
      },
    ],
  },
  {
    heading: "Privacy & technical",
    items: [
      {
        question: "What is stored in my browser?",
        answer: (
          <>
            Three keys: your theme choice, your preferences object (time zone,
            notification choice, favourites, reminders), and nothing else.
            There are no analytics cookies. The <Link href="/privacy">privacy
            note</Link> lists the exact fields.
          </>
        ),
      },
      {
        question: "Can I move my preferences to another device?",
        answer: (
          <>
            Yes. Export the JSON file from <Link href="/settings">Settings</Link>{" "}
            and import it on the other device. Unknown or malformed fields are
            discarded, so an edited file will not corrupt the stored state.
          </>
        ),
      },
      {
        question: "Is there a public API?",
        answer: (
          <>
            The same-origin routes the site uses are documented at{" "}
            <Link href="/api-docs">API documentation</Link>. They return
            normalised JSON with cache metadata. They are intended for this
            site&apos;s front end; there is no API key or commercial SLA.
          </>
        ),
      },
      {
        question: "Why does the site sometimes say data is unavailable?",
        answer: (
          <>
            Upstream providers occasionally rate-limit or time out. Touchline
            reports the failure and offers a retry link rather than showing stale
            numbers as if they were live. The <code>/api/health</code> route
            reports the same state programmatically.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <>
      <PageHeader
        eyebrow="Help centre"
        title="Frequently asked questions"
        description="Short, honest answers about where the data comes from, how favourites and reminders are stored, and what to do when a provider comes up short."
        actions={
          <Link href="/contact" className="btn btn--ghost">
            <MessageCircleQuestion size={16} aria-hidden="true" />
            Ask a question
          </Link>
        }
      />

      <div className="content-page">
        <div>
          {GROUPS.map((group) => (
            <section
              key={group.heading}
              id={group.heading.toLowerCase().replace(/[^a-z]+/g, "-")}
              style={{ marginBottom: 28 }}
            >
              <h2 className="group-title">{group.heading}</h2>
              <div className="faq-list" style={{ maxWidth: "100%" }}>
                {group.items.map((item) => (
                  <details className="faq-item" key={item.question}>
                    <summary>{item.question}</summary>
                    <div className="faq-item__body">{item.answer}</div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="content-aside">
          <h2 className="content-aside__title">Jump to</h2>
          <nav aria-label="FAQ groups">
            {GROUPS.map((group) => (
              <a key={group.heading} href={`#${group.heading.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                {group.heading}
              </a>
            ))}
            <Link href="/api-docs">API documentation</Link>
            <Link href="/privacy">Privacy note</Link>
          </nav>
          <div style={{ marginTop: 20 }}>
            <Link href="/search" className="btn btn--ghost btn--sm">
              <Search size={14} aria-hidden="true" />
              Search the site
            </Link>
          </div>
          <p className="small text-muted" style={{ marginTop: 14 }}>
            Still stuck? The contact form composes a real email in your mail app.
          </p>
        </aside>
      </div>
    </>
  );
}
