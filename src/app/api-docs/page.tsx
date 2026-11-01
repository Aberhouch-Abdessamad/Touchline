import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Braces, Gauge, KeyRound, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { LEAGUES } from "@/data/leagues";

export const metadata: Metadata = {
  title: "API documentation",
  description:
    "The same-origin JSON routes that power Touchline: fixtures, tables, scorers, match summaries, teams, rankings, news, search, calendar exports and health checks.",
  alternates: { canonical: "/api-docs" },
};

interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

interface Endpoint {
  method: "GET";
  path: string;
  summary: string;
  cache: string;
  params?: Param[];
  example: string;
  notes?: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/matches",
    summary:
      "Fixtures for one calendar day, or a month when `month` is supplied instead of `date`. Defaults to today in UTC.",
    cache: "30 s for a day · 120 s for a month",
    params: [
      {
        name: "date",
        type: "YYYY-MM-DD",
        description: "A real calendar date. Invalid dates return 400.",
      },
      {
        name: "month",
        type: "YYYY-MM",
        description:
          "Month fixture list. Ignored when `date` is present. `limited: true` means the provider capped the response.",
      },
    ],
    example: "/api/matches?date=2026-11-01",
    notes:
      "The month variant may return fewer fixtures than exist because the upstream scoreboard caps a single response. Daily requests are complete.",
  },
  {
    method: "GET",
    path: "/api/leagues",
    summary:
      "The verified competition catalogue. Served from cached project metadata, so it never calls upstream.",
    cache: "3600 s",
    params: [
      { name: "q", type: "string", description: "Matches name, country, abbreviation or alias." },
      { name: "region", type: "string", description: "Exact region, e.g. Europe." },
      { name: "type", type: "club | national", description: "Club or national-team competition." },
      { name: "gender", type: "men | women", description: "Competition gender." },
      {
        name: "format",
        type: "league | cup | qualifier | friendly",
        description: "Competition format.",
      },
      {
        name: "featured",
        type: "true | false",
        description: "Only featured, or only non-featured, competitions.",
      },
    ],
    example: "/api/leagues?type=club&featured=true",
  },
  {
    method: "GET",
    path: "/api/leagues/[slug]/standings",
    summary:
      "Live league table for one competition and season, grouped when the provider splits the table.",
    cache: "120 s",
    params: [
      { name: "slug", type: "path", required: true, description: "Catalogue slug, e.g. eng.1." },
      {
        name: "season",
        type: "YYYY",
        description: "Season year. Defaults to the competition's current season.",
      },
    ],
    example: "/api/leagues/eng.1/standings?season=2026",
    notes:
      "`available: false` means the provider publishes no table for that season; `reason` explains why. A missing slug returns 404.",
  },
  {
    method: "GET",
    path: "/api/leagues/[slug]/scorers",
    summary: "Top scorers and assist leaders for a competition season.",
    cache: "120 s",
    params: [
      { name: "slug", type: "path", required: true, description: "Catalogue slug." },
      { name: "season", type: "YYYY", description: "Season year." },
    ],
    example: "/api/leagues/esp.1/scorers?season=2026",
    notes:
      "Cup competitions frequently return `available: false`. The two boards are independent arrays and may differ in length.",
  },
  {
    method: "GET",
    path: "/api/leagues/[slug]/fixtures",
    summary: "Every fixture the provider lists for a competition season, ordered by date.",
    cache: "120 s",
    params: [
      { name: "slug", type: "path", required: true, description: "Catalogue slug." },
      { name: "season", type: "YYYY", description: "Season year." },
    ],
    example: "/api/leagues/ger.1/fixtures?season=2026",
  },
  {
    method: "GET",
    path: "/api/match/[id]",
    summary:
      "Full match summary: scoreboard, key events, statistics, lineups, head-to-head record, recent form, venue, broadcasters and related news.",
    cache: "30 s",
    params: [
      {
        name: "id",
        type: "path",
        required: true,
        description: "Numeric ESPN event id.",
      },
    ],
    example: "/api/match/401234567",
    notes:
      "Optional blocks are omitted or empty when the provider has not published them. That is normal before kick-off.",
  },
  {
    method: "GET",
    path: "/api/team/[id]",
    summary:
      "Team profile with its competition, a season fixture list and provider-supplied record summaries.",
    cache: "300 s",
    params: [
      { name: "id", type: "path", required: true, description: "Numeric ESPN team id." },
      { name: "season", type: "YYYY", description: "Season year for the schedule." },
    ],
    example: "/api/team/360",
    notes: "Returns 404 when ESPN has no profile for that id.",
  },
  {
    method: "GET",
    path: "/api/rankings",
    summary:
      "Official FIFA world rankings, with rank, previous rank, movement, points and confederation.",
    cache: "21600 s (6 hours)",
    params: [
      { name: "gender", type: "men | women", description: "Ranking board. Defaults to men." },
      {
        name: "confederation",
        type: "string",
        description: "Exact confederation name, e.g. UEFA, CONMEBOL, CAF.",
      },
      { name: "limit", type: "1–211", description: "Maximum entries returned. Defaults to 211." },
    ],
    example: "/api/rankings?gender=women&confederation=UEFA&limit=20",
  },
  {
    method: "GET",
    path: "/api/news",
    summary: "Football news headlines from ESPN's public news feed.",
    cache: "300 s",
    params: [
      { name: "limit", type: "1–24", description: "Article count. Defaults to 12." },
    ],
    example: "/api/news?limit=6",
  },
  {
    method: "GET",
    path: "/api/search",
    summary:
      "Case-insensitive competition search across the local catalogue plus team results from ESPN search.",
    cache: "120 s",
    params: [
      {
        name: "q",
        type: "string",
        required: true,
        description: "At least two characters, maximum 80 after cleaning.",
      },
    ],
    example: "/api/search?q=arsenal",
    notes:
      "`teamsAvailable: false` means the upstream team search failed; competition results are still returned.",
  },
  {
    method: "GET",
    path: "/api/calendar",
    summary:
      "Downloadable iCalendar export for a day or a month. Returns `text/calendar`, not the JSON envelope.",
    cache: "120 s at the CDN",
    params: [
      { name: "date", type: "YYYY-MM-DD", description: "Export a single day." },
      { name: "month", type: "YYYY-MM", description: "Export a whole month." },
    ],
    example: "/api/calendar?month=2026-11",
    notes:
      "Timestamps are UTC. Fixtures without a confirmed kick-off are omitted rather than guessed.",
  },
  {
    method: "GET",
    path: "/api/health",
    summary:
      "Liveness probe. Reports the catalogue size and whether the upstream fixture feed answered, with latency.",
    cache: "no-store",
    example: "/api/health",
    notes:
      "A degraded status still returns HTTP 200 so monitoring can tell an app failure from an upstream failure.",
  },
];

function Envelope() {
  return (
    <pre>
      <code>{`{
  "data": { ... },
  "meta": {
    "source": "ESPN public API",
    "attribution": "Match data from ESPN's public API.",
    "fetchedAt": "2026-11-01T12:00:00.000Z",
    "cacheSeconds": 30
  }
}`}</code>
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Developers"
        title="Public JSON routes"
        description="Touchline's front end reads from the same routes documented here. They validate input, normalise upstream payloads and return cache metadata. There is no API key and no commercial SLA."
      />

      <div className="content-page">
        <div>
          <section className="prose">
            <h2 id="basics" style={{ marginTop: 0 }}>
              Basics
            </h2>
            <p>
              All routes are <code>GET</code>-only and relative to the site
              origin. Successful JSON responses use a{" "}
              <code>{"{ data, meta }"}</code> envelope. Failures use{" "}
              <code>{"{ error: { message, status, code } }"}</code> with an
              appropriate HTTP status.
            </p>
            <Envelope />
            <p>
              <code>Cache-Control</code> is set per route using{" "}
              <code>s-maxage</code> plus <code>stale-while-revalidate</code>, and
              the <code>X-Data-Source</code> response header names the provider.
              The calendar route is the only endpoint that does not return JSON.
            </p>
          </section>

          <section style={{ marginTop: 30 }}>
            <h2 className="group-title">
              <Braces size={14} aria-hidden="true" /> Endpoints
            </h2>
            {ENDPOINTS.map((endpoint) => (
              <article className="api-endpoint" key={endpoint.path}>
                <div className="api-endpoint__head">
                  <span className="api-method">{endpoint.method}</span>
                  <code className="api-endpoint__path">{endpoint.path}</code>
                  <span className="badge badge--muted">{endpoint.cache}</span>
                  <a
                    href={endpoint.example}
                    className="section-head__link"
                    style={{ marginLeft: "auto" }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Try it
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                </div>
                <div className="api-endpoint__body">
                  <p>{endpoint.summary}</p>
                  {endpoint.params ? (
                    <table className="api-params">
                      <thead>
                        <tr>
                          <th scope="col">Parameter</th>
                          <th scope="col">Type</th>
                          <th scope="col">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.params.map((param) => (
                          <tr key={param.name}>
                            <td>
                              <code>{param.name}</code>
                              {param.required ? " *" : ""}
                            </td>
                            <td>
                              <code>{param.type}</code>
                            </td>
                            <td>{param.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                  {endpoint.notes ? (
                    <p style={{ marginTop: 10 }}>{endpoint.notes}</p>
                  ) : null}
                  <p style={{ marginTop: 10 }}>
                    Example:{" "}
                    <a href={endpoint.example}>
                      <code>{endpoint.example}</code>
                    </a>
                  </p>
                </div>
              </article>
            ))}
          </section>

          <section className="prose" style={{ marginTop: 34 }}>
            <h2 id="errors">Errors and limits</h2>
            <ul>
              <li>
                <strong>400</strong> — a parameter failed validation, such as a
                malformed date, month or search term.
              </li>
              <li>
                <strong>404</strong> — an unknown competition slug, invalid team
                or match id, or no upstream profile for that id.
              </li>
              <li>
                <strong>502</strong> — the provider returned an error.{" "}
                <code>{"{ error: { code: \"upstream_error\" } }"}</code>
              </li>
              <li>
                <strong>504</strong> — the provider timed out. Retry after a
                short delay.
              </li>
            </ul>
            <p>
              Routes are metered by caching rather than by keys. Please keep
              automated traffic modest; the upstream providers are public
              services, not capacity for a third-party product. If you need bulk
              history, query the providers directly under their own terms.
            </p>

            <h2 id="terms">Attribution and responsible use</h2>
            <p>
              Match, table, fixture, team, news and search data belong to ESPN.
              Rankings belong to FIFA. Competition metadata is derived from
              ESPN&apos;s public core API. Any reuse must keep the provider
              attribution shown in the <code>meta.attribution</code> field and
              comply with the provider&apos;s terms.
            </p>
            <p>
              Touchline does not proxy private endpoints, bypass access controls
              or scrape sites that block automated clients. Documented
              limitations are listed in the project README.
            </p>

            <h2 id="catalogue">Competition slugs</h2>
            <p>
              Each of the {LEAGUES.length} competitions has a stable slug used in
              paths, such as <code>eng.1</code>, <code>esp.1</code> or{" "}
              <code>uefa.champions</code>. You can list them all with{" "}
              <Link href="/api/leagues">/api/leagues</Link>, or browse the{" "}
              <Link href="/competitions">competition directory</Link>. Slugs that
              failed live validation are not published.
            </p>
          </section>
        </div>

        <aside className="content-aside">
          <h2 className="content-aside__title">On this page</h2>
          <nav aria-label="API documentation sections">
            <a href="#basics">Basics</a>
            <a href="#errors">Errors and limits</a>
            <a href="#terms">Attribution and responsible use</a>
            <a href="#catalogue">Competition slugs</a>
            <Link href="/api/health">Health check</Link>
            <Link href="/about">How the data flows</Link>
          </nav>
          <div className="card" style={{ marginTop: 18, padding: 12 }}>
            <p className="settings-row__title">
              <Gauge size={13} aria-hidden="true" /> Cache-first
            </p>
            <p className="settings-row__description">
              Every route sets an explicit shared-cache window. Repeated reads do
              not multiply upstream calls.
            </p>
          </div>
          <div className="card" style={{ marginTop: 10, padding: 12 }}>
            <p className="settings-row__title">
              <KeyRound size={13} aria-hidden="true" /> No key required
            </p>
            <p className="settings-row__description">
              Same-origin routes are open for inspection. There is no secret to
              leak and no token to rotate.
            </p>
          </div>
          <div className="card" style={{ marginTop: 10, padding: 12 }}>
            <p className="settings-row__title">
              <Scale size={13} aria-hidden="true" /> Provider terms apply
            </p>
            <p className="settings-row__description">
              This documentation is not a licence to redistribute provider data.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
