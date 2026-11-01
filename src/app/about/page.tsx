import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Database,
  Gauge,
  HeartHandshake,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { LEAGUES } from "@/data/leagues";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Touchline is an independent football data project built on ESPN's public soccer APIs and FIFA's public rankings API — original design, no accounts, no invented numbers.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    icon: Database,
    title: "Real data or nothing",
    body: "Every score, table row and ranking comes from a public provider response. When a field is missing, the page says so instead of filling the gap with a plausible guess.",
  },
  {
    icon: Gauge,
    title: "Fast by default",
    body: "Pages render on the server, shared responses are cached for seconds to hours depending on how often they change, and the browser only receives what it needs to render.",
  },
  {
    icon: ShieldCheck,
    title: "No account, no profiling",
    body: "There is no registration, no newsletter and no advertising identifier. Preferences live in your browser's localStorage and never leave it.",
  },
  {
    icon: HeartHandshake,
    title: "Respectful of upstreams",
    body: "We use documented, publicly reachable endpoints at modest rates. Where a site blocks non-browser clients, we document the limitation rather than working around it.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="About the project"
        title="A quieter way to follow football"
        description={`${SITE_NAME} is an independent, non-commercial football data project. The goal is simple: make the score, the table and the next fixture easy to find, without pop-ups, autoplay video or numbers that were never there.`}
        actions={
          <Link href="/matches" className="btn btn--accent">
            Open today&apos;s matches
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />

      <div className="content-page">
        <article className="prose">
          <h2 id="what">What this site does</h2>
          <p>
            Touchline covers live and scheduled football across {LEAGUES.length}{" "}
            competitions: domestic leagues, continental cups, international
            tournaments and qualifiers. Each competition page carries a live
            table, season leaderboards and the full fixture list. The match
            centre adds key events, team statistics, lineups, head-to-head
            records and recent form where the provider publishes them.
          </p>
          <p>
            Beyond the match centre, you can browse any day or month, export
            fixtures to Google Calendar, Outlook or an <code>.ics</code> file,
            follow the official FIFA men&apos;s and women&apos;s world rankings, and
            star the teams and competitions you care about. Stars and reminders
            are stored locally, which is why there is no sign-in.
          </p>

          <h2 id="how">How the data flows</h2>
          <p>
            The browser never talks to ESPN or FIFA directly. Instead, every
            page reads from a same-origin route under <code>/api</code>. Those
            routes validate input, call the upstream provider, normalise the
            response into a stable shape, and cache the result for an
            appropriate number of seconds.
          </p>
          <ol>
            <li>
              A page requests fixtures, a table, a match summary or a ranking.
            </li>
            <li>
              The server route checks parameters and rejects anything malformed.
            </li>
            <li>
              The upstream payload is normalised — missing branches become empty
              arrays, not invented records.
            </li>
            <li>
              The response is cached so repeat views are cheap and the providers
              are not hammered.
            </li>
            <li>
              The page renders on the server; only interactive pieces such as
              filters, stars and reminders hydrate in the browser.
            </li>
          </ol>

          <h2 id="sources">Where the numbers come from</h2>
          <p>
            Match, table, fixture, team, news and search data come from ESPN&apos;s
            public soccer APIs. World rankings come from FIFA&apos;s public
            ranking API. Competition metadata — names, countries, crests and
            slugs — is generated once from ESPN&apos;s public core API and stored
            in the project so the catalogue is fast and stable.
          </p>
          <p>
            Neither provider sponsors this project, and Touchline is not
            affiliated with either. Provider names appear only for attribution.
            If you are from a provider and want a change,{" "}
            <Link href="/contact">get in touch</Link>.
          </p>

          <h2 id="limits">Known limitations</h2>
          <ul>
            <li>
              Live data can lag the broadcast by seconds to minutes. Refreshing
              the page asks for the latest cached response.
            </li>
            <li>
              Cup competitions and early-season fixtures often have no table or
              scorer board. Those pages explain the gap rather than showing an
              empty table.
            </li>
            <li>
              Some leagues return no data for older seasons. The season selector
              reflects what the provider actually publishes.
            </li>
            <li>
              Browser notifications only fire while a Touchline tab is open.
              Calendar export is the dependable reminder.
            </li>
            <li>
              The public catalogue deliberately excludes competition slugs that
              failed validation, instead of shipping links that would 404.
            </li>
          </ul>

          <h2 id="principles">Principles</h2>
          <div className="two-col">
            {PRINCIPLES.map((principle) => {
              const Icon = principle.icon;
              return (
                <section key={principle.title} className="card">
                  <span className="empty-state__icon" aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <h3 style={{ marginTop: 10 }}>{principle.title}</h3>
                  <p>{principle.body}</p>
                </section>
              );
            })}
          </div>

          <h2 id="stack">How it is built</h2>
          <p>
            Touchline runs on Next.js with the App Router, React server
            components and TypeScript. Styling is a hand-written design system —
            no UI kit, no template. Icons come from Lucide and the two typefaces
            are self-hosted variable fonts. Calendar files are generated on the
            server from real fixture data.
          </p>
          <p>
            The visual language is deliberately editorial: warm paper, dark ink,
            one lime accent, tabular numerals for scores and a low-glare dark
            theme for evening use. It is an original design built for this
            project.
          </p>

          <h2 id="next">Where to go next</h2>
          <p>
            Start with <Link href="/matches">today&apos;s matches</Link>, browse the{" "}
            <Link href="/competitions">competition directory</Link>, or read the{" "}
            <Link href="/faq">FAQ</Link> if something looks off. The{" "}
            <Link href="/api-docs">API documentation</Link> explains the public
            routes if you want to build on the same data.
          </p>
        </article>

        <aside className="content-aside">
          <h2 className="content-aside__title">On this page</h2>
          <nav aria-label="About sections">
            <a href="#what">What this site does</a>
            <a href="#how">How the data flows</a>
            <a href="#sources">Where the numbers come from</a>
            <a href="#limits">Known limitations</a>
            <a href="#principles">Principles</a>
            <a href="#stack">How it is built</a>
            <a href="#next">Where to go next</a>
          </nav>
          <div style={{ marginTop: 20 }}>
            <span className="badge badge--accent">
              <Layers size={11} aria-hidden="true" />
              {LEAGUES.length} competitions
            </span>
          </div>
          <p className="small text-muted" style={{ marginTop: 14 }}>
            A non-commercial project. No ads, no accounts, no tracking
            identifiers.
          </p>
        </aside>
      </div>
    </>
  );
}
