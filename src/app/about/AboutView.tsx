"use client";

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
import { RichText } from "@/components/pages/RichText";
import { useI18n } from "@/lib/i18n";

const PRINCIPLE_ICONS = [Database, Gauge, ShieldCheck, HeartHandshake];

export function AboutView({ leaguesCount }: { leaguesCount: number }) {
  const { t, f } = useI18n();
  const about = t.content.about;

  return (
    <>
      <PageHeader
        eyebrow={about.eyebrow}
        title={about.title}
        description={about.description}
        actions={
          <Link href="/matches" className="btn btn--accent">
            {about.actions.todaysMatches}
            <ArrowRight size={16} aria-hidden="true" data-flip="rtl" />
          </Link>
        }
      />

      <div className="content-page">
        <article className="prose">
          <h2 id="what">{about.what.heading}</h2>
          <p>{f(about.what.p1, { n: leaguesCount })}</p>
          <p>
            <RichText text={about.what.p2} />
          </p>

          <h2 id="how">{about.how.heading}</h2>
          <p>
            <RichText text={about.how.p1} />
          </p>
          <ol>
            {about.how.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h2 id="sources">{about.sources.heading}</h2>
          <p>
            <RichText text={about.sources.p1} />
          </p>
          <p>
            <RichText text={about.sources.p2} />
          </p>

          <h2 id="limits">{about.limits.heading}</h2>
          <ul>
            {about.limits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h2 id="principles">{about.principles.heading}</h2>
          <div className="two-col">
            {about.principles.items.map((principle, index) => {
              const Icon = PRINCIPLE_ICONS[index];
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

          <h2 id="stack">{about.stack.heading}</h2>
          <p>
            <RichText text={about.stack.p1} />
          </p>
          <p>
            <RichText text={about.stack.p2} />
          </p>

          <h2 id="next">{about.next.heading}</h2>
          <p>
            <RichText text={about.next.p} />
          </p>
        </article>

        <aside className="content-aside">
          <h2 className="content-aside__title">{about.onPage}</h2>
          <nav aria-label={about.navAria}>
            <a href="#what">{about.what.heading}</a>
            <a href="#how">{about.how.heading}</a>
            <a href="#sources">{about.sources.heading}</a>
            <a href="#limits">{about.limits.heading}</a>
            <a href="#principles">{about.principles.heading}</a>
            <a href="#stack">{about.stack.heading}</a>
            <a href="#next">{about.next.heading}</a>
          </nav>
          <div style={{ marginTop: 20 }}>
            <span className="badge badge--accent">
              <Layers size={11} aria-hidden="true" />
              {f(about.badge, { n: leaguesCount })}
            </span>
          </div>
          <p className="small text-muted" style={{ marginTop: 14 }}>
            {about.note}
          </p>
        </aside>
      </div>
    </>
  );
}
