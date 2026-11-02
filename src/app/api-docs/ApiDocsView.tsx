"use client";

import Link from "next/link";
import { ArrowUpRight, Braces, Gauge, KeyRound, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/Primitives";
import { RichText } from "@/components/pages/RichText";
import { useI18n, type Dict } from "@/lib/i18n";

type EndpointKey = keyof Dict["content"]["apiDocs"]["endpoints"];

interface EndpointMeta {
  summary: string;
  cache: string;
  params?: string[];
  notes?: string;
}

/** Spec data that stays English in both languages: paths, param names, types and examples. */
interface ParamSpec {
  name: string;
  type: string;
  required?: boolean;
}

interface EndpointSpec {
  key: EndpointKey;
  method: "GET";
  path: string;
  example: string;
  params?: ParamSpec[];
}

const ENDPOINTS: EndpointSpec[] = [
  {
    key: "matches",
    method: "GET",
    path: "/api/matches",
    example: "/api/matches?date=2026-11-01",
    params: [
      { name: "date", type: "YYYY-MM-DD" },
      { name: "month", type: "YYYY-MM" },
    ],
  },
  {
    key: "leagues",
    method: "GET",
    path: "/api/leagues",
    example: "/api/leagues?type=club&featured=true",
    params: [
      { name: "q", type: "string" },
      { name: "region", type: "string" },
      { name: "type", type: "club | national" },
      { name: "gender", type: "men | women" },
      { name: "format", type: "league | cup | qualifier | friendly" },
      { name: "featured", type: "true | false" },
    ],
  },
  {
    key: "standings",
    method: "GET",
    path: "/api/leagues/[slug]/standings",
    example: "/api/leagues/eng.1/standings?season=2026",
    params: [
      { name: "slug", type: "path", required: true },
      { name: "season", type: "YYYY" },
    ],
  },
  {
    key: "scorers",
    method: "GET",
    path: "/api/leagues/[slug]/scorers",
    example: "/api/leagues/esp.1/scorers?season=2026",
    params: [
      { name: "slug", type: "path", required: true },
      { name: "season", type: "YYYY" },
    ],
  },
  {
    key: "fixtures",
    method: "GET",
    path: "/api/leagues/[slug]/fixtures",
    example: "/api/leagues/ger.1/fixtures?season=2026",
    params: [
      { name: "slug", type: "path", required: true },
      { name: "season", type: "YYYY" },
    ],
  },
  {
    key: "match",
    method: "GET",
    path: "/api/match/[id]",
    example: "/api/match/401234567",
    params: [{ name: "id", type: "path", required: true }],
  },
  {
    key: "team",
    method: "GET",
    path: "/api/team/[id]",
    example: "/api/team/360",
    params: [
      { name: "id", type: "path", required: true },
      { name: "season", type: "YYYY" },
    ],
  },
  {
    key: "rankings",
    method: "GET",
    path: "/api/rankings",
    example: "/api/rankings?gender=women&confederation=UEFA&limit=20",
    params: [
      { name: "gender", type: "men | women" },
      { name: "confederation", type: "string" },
      { name: "limit", type: "1–211" },
    ],
  },
  {
    key: "news",
    method: "GET",
    path: "/api/news",
    example: "/api/news?limit=6",
    params: [{ name: "limit", type: "1–24" }],
  },
  {
    key: "search",
    method: "GET",
    path: "/api/search",
    example: "/api/search?q=arsenal",
    params: [{ name: "q", type: "string", required: true }],
  },
  {
    key: "calendar",
    method: "GET",
    path: "/api/calendar",
    example: "/api/calendar?month=2026-11",
    params: [
      { name: "date", type: "YYYY-MM-DD" },
      { name: "month", type: "YYYY-MM" },
    ],
  },
  {
    key: "health",
    method: "GET",
    path: "/api/health",
    example: "/api/health",
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

const ASIDE_ICONS = [Gauge, KeyRound, Scale];

export function ApiDocsView({ leaguesCount }: { leaguesCount: number }) {
  const { t, f } = useI18n();
  const apiDocs = t.content.apiDocs;
  const { about } = t.content;
  const endpointsMeta = apiDocs.endpoints;

  return (
    <>
      <PageHeader
        eyebrow={apiDocs.eyebrow}
        title={apiDocs.title}
        description={apiDocs.description}
      />

      <div className="content-page">
        <div>
          <section className="prose">
            <h2 id="basics" style={{ marginTop: 0 }}>
              {apiDocs.basics.heading}
            </h2>
            <p>
              <RichText text={apiDocs.basics.p1} />
            </p>
            <Envelope />
            <p>
              <RichText text={apiDocs.basics.cacheP} />
            </p>
          </section>

          <section style={{ marginTop: 30 }}>
            <h2 className="group-title">
              <Braces size={14} aria-hidden="true" /> {apiDocs.endpointsHeading}
            </h2>
            {ENDPOINTS.map((endpoint) => {
              const meta: EndpointMeta = endpointsMeta[endpoint.key];
              return (
                <article className="api-endpoint" key={endpoint.path}>
                  <div className="api-endpoint__head">
                    <span className="api-method">{endpoint.method}</span>
                    <code className="api-endpoint__path">{endpoint.path}</code>
                    <span className="badge badge--muted">{meta.cache}</span>
                    <a
                      href={endpoint.example}
                      className="section-head__link"
                      style={{ marginLeft: "auto" }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {apiDocs.tryIt}
                      <ArrowUpRight size={13} aria-hidden="true" data-flip="rtl" />
                    </a>
                  </div>
                  <div className="api-endpoint__body">
                    <p>
                      <RichText text={meta.summary} />
                    </p>
                    {endpoint.params && meta.params ? (
                      <table className="api-params">
                        <thead>
                          <tr>
                            <th scope="col">{apiDocs.paramsTable.parameter}</th>
                            <th scope="col">{apiDocs.paramsTable.type}</th>
                            <th scope="col">{apiDocs.paramsTable.description}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {endpoint.params.map((param, index) => (
                            <tr key={param.name}>
                              <td>
                                <code>{param.name}</code>
                                {param.required ? " *" : ""}
                              </td>
                              <td>
                                <code>{param.type}</code>
                              </td>
                              <td>
                                <RichText text={meta.params?.[index] ?? ""} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                    {meta.notes ? (
                      <p style={{ marginTop: 10 }}>
                        <RichText text={meta.notes} />
                      </p>
                    ) : null}
                    <p style={{ marginTop: 10 }}>
                      {apiDocs.exampleLabel}{" "}
                      <a href={endpoint.example}>
                        <code>{endpoint.example}</code>
                      </a>
                    </p>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="prose" style={{ marginTop: 34 }}>
            <h2 id="errors">{apiDocs.errors.heading}</h2>
            <ul>
              {apiDocs.errors.items.map((item) => (
                <li key={item.code}>
                  <strong>{item.code}</strong> — <RichText text={item.text} />
                </li>
              ))}
            </ul>
            <p>{apiDocs.errors.meteredP}</p>

            <h2 id="terms">{apiDocs.terms.heading}</h2>
            <p>
              <RichText text={apiDocs.terms.p1} />
            </p>
            <p>
              <RichText text={apiDocs.terms.p2} />
            </p>

            <h2 id="catalogue">{apiDocs.catalogue.heading}</h2>
            <p>
              <RichText text={f(apiDocs.catalogue.p, { n: leaguesCount })} />
            </p>
          </section>
        </div>

        <aside className="content-aside">
          <h2 className="content-aside__title">{apiDocs.onThisPage}</h2>
          <nav aria-label={apiDocs.navAria}>
            <a href="#basics">{apiDocs.basics.heading}</a>
            <a href="#errors">{apiDocs.errors.heading}</a>
            <a href="#terms">{apiDocs.terms.heading}</a>
            <a href="#catalogue">{apiDocs.catalogue.heading}</a>
            <Link href="/api/health">{apiDocs.healthCheck}</Link>
            <Link href="/about">{about.how.heading}</Link>
          </nav>
          {apiDocs.aside.cards.map((card, index) => {
            const Icon = ASIDE_ICONS[index];
            return (
              <div
                className="card"
                key={card.title}
                style={{ marginTop: index === 0 ? 18 : 10, padding: 12 }}
              >
                <p className="settings-row__title">
                  <Icon size={13} aria-hidden="true" /> {card.title}
                </p>
                <p className="settings-row__description">{card.body}</p>
              </div>
            );
          })}
        </aside>
      </div>
    </>
  );
}
