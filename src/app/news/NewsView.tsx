"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ExternalLink,
  Newspaper,
  Radio,
  RefreshCw,
} from "lucide-react";
import { NewsCard, NewsGrid } from "@/components/soccer/NewsCard";
import { EmptyState } from "@/components/ui/Primitives";
import { LocalTime } from "@/components/ui/LocalTime";
import { useI18n } from "@/lib/i18n";
import { formatNumber } from "@/lib/utils";
import type { NewsArticle } from "@/lib/types";

const ESPN_SOCCER = "https://www.espn.com/soccer/";

function NewsHero({
  articles,
  failed,
}: {
  articles: NewsArticle[];
  failed: boolean;
}) {
  const { t, f } = useI18n();
  const lead = articles[0];
  const bylines = new Set(
    articles.map((article) => article.byline).filter(Boolean),
  );
  const topics = new Set(
    articles.map((article) => article.section).filter(Boolean),
  );

  const lede = failed
    ? t.news.ledeFailed
    : articles.length === 0
      ? t.news.empty.description
      : f(
          articles.length === 1 ? t.news.ledeCountOne : t.news.ledeCount,
          { n: formatNumber(articles.length) },
        );

  return (
    <section className="nw-hero" aria-labelledby="nw-title">
      <div className="nw-hero__bar">
        <p className="nw-hero__eyebrow">
          <span className="nw-hero__spark" aria-hidden="true" />
          {t.news.kicker}
        </p>
        <div className="nw-hero__actions">
          <span className="nw-hero__tag">{t.news.deskTag}</span>
          <Link className="nw-hero__action" href="/matches">
            {t.news.todaysMatches}
            <ArrowUpRight size={13} aria-hidden="true" data-flip="rtl" />
          </Link>
        </div>
      </div>

      <div className="nw-hero__body">
        <div className="nw-hero__intro">
          <h1 className="nw-hero__title" id="nw-title">
            <span className="nw-hero__title-top">{t.news.titleTop}</span>{" "}
            <span className="nw-hero__title-main">{t.news.titleMain}</span>
          </h1>
          <p className="nw-hero__lede">{lede}</p>
          <p className="nw-hero__note">{t.news.note}</p>
        </div>

        <aside className="nw-top" aria-label={t.news.topAria}>
          <p className="nw-top__label">{t.news.topLabel}</p>
          {lead ? (
            <>
              {lead.url ? (
                <a
                  className="nw-top__story"
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="nw-top__media">
                    {lead.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lead.image}
                        alt={lead.imageAlt ?? ""}
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <span className="nw-top__media-empty" aria-hidden="true">
                        <Newspaper size={24} />
                      </span>
                    )}
                  </span>
                  <span className="nw-top__meta">
                    {lead.section ? `${lead.section} · ` : null}
                    <LocalTime
                      date={lead.published}
                      mode="time"
                      fallback={t.news.timeFallback}
                    />
                  </span>
                  <span className="nw-top__headline">{lead.headline}</span>
                </a>
              ) : (
                <div className="nw-top__story">
                  <span className="nw-top__media">
                    <span className="nw-top__media-empty" aria-hidden="true">
                      <Newspaper size={24} />
                    </span>
                  </span>
                  <span className="nw-top__meta">
                    {lead.section ?? t.news.sectionFallback}
                  </span>
                  <span className="nw-top__headline">{lead.headline}</span>
                </div>
              )}
              <span className="nw-top__link">
                {lead.url ? t.news.readAtEspn : t.news.noExternalLink}
                {lead.url ? (
                  <ArrowUpRight size={13} aria-hidden="true" data-flip="rtl" />
                ) : null}
              </span>
            </>
          ) : (
            <div className="nw-top__empty">
              <Newspaper size={20} aria-hidden="true" />
              <p>
                {failed
                  ? t.news.topEmptyFailed
                  : t.news.topEmptyNone}
              </p>
            </div>
          )}
          <span className="nw-top__watermark" aria-hidden="true">
            01
          </span>
        </aside>
      </div>

      <dl className="nw-hero__stats">
        <div className="nw-hero__stat">
          <dt>{t.news.stats.stories}</dt>
          <dd>{articles.length ? formatNumber(articles.length) : "—"}</dd>
        </div>
        <div className="nw-hero__stat">
          <dt>{t.news.stats.bylines}</dt>
          <dd>{bylines.size ? formatNumber(bylines.size) : "—"}</dd>
        </div>
        <div className="nw-hero__stat">
          <dt>{t.news.stats.topics}</dt>
          <dd>{topics.size ? formatNumber(topics.size) : "—"}</dd>
        </div>
        <div className="nw-hero__stat">
          <dt>{t.news.stats.latestUpdate}</dt>
          <dd className="nw-hero__stat-date">
            {lead?.published ? (
              <LocalTime date={lead.published} mode="time" fallback="—" />
            ) : (
              "—"
            )}
            <span className="nw-hero__stat-note">{t.news.stats.zoneNote}</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function LatestHeadlines({ articles }: { articles: NewsArticle[] }) {
  const { t } = useI18n();
  if (articles.length === 0) return null;

  return (
    <section className="nw-latest" aria-labelledby="nw-latest-title">
      <div className="nw-latest__head">
        <div>
          <p className="nw-latest__eyebrow">
            <Radio size={12} aria-hidden="true" />
            {t.news.latest.eyebrow}
          </p>
          <h2 className="nw-latest__title" id="nw-latest-title">
            {t.news.latest.title}
          </h2>
        </div>
        <span className="nw-latest__count" aria-hidden="true">
          {String(articles.length).padStart(2, "0")}
        </span>
      </div>

      <div className="nw-latest__list">
        {articles.map((article, index) => {
          const body = (
            <>
              <span className="nw-latest__rank" aria-hidden="true">
                {String(index + 2).padStart(2, "0")}
              </span>
              <span className="nw-latest__text">
                <span className="nw-latest__meta">
                  {article.section ?? t.news.sectionFallback} ·{" "}
                  <LocalTime
                    date={article.published}
                    mode="time"
                    fallback="—"
                  />
                </span>
                <span className="nw-latest__headline">{article.headline}</span>
              </span>
              {article.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="nw-latest__thumb"
                  src={article.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="nw-latest__thumb nw-latest__thumb--empty">
                  <Newspaper size={14} aria-hidden="true" />
                </span>
              )}
            </>
          );

          return article.url ? (
            <a
              key={article.id}
              className="nw-latest__item"
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {body}
            </a>
          ) : (
            <article key={article.id} className="nw-latest__item">
              {body}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AboutFeed() {
  const { t } = useI18n();

  return (
    <section className="nw-about" aria-labelledby="nw-about-title">
      <div className="nw-about__head">
        <div>
          <p className="nw-about__eyebrow">{t.news.about.eyebrow}</p>
          <h2 className="nw-about__title" id="nw-about-title">
            {t.news.about.title}
          </h2>
        </div>
        <ExternalLink size={15} aria-hidden="true" />
      </div>
      <div className="nw-about__body">
        <p>{t.news.about.body}</p>
        <p>
          {t.news.about.looking}{" "}
          <Link href="/matches">{t.news.about.matchCentre}</Link>{" "}
          {t.news.about.or} <Link href="/search">{t.news.about.search}</Link>.
        </p>
        <a
          className="nw-about__link"
          href={ESPN_SOCCER}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.news.about.espnSoccer}
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/**
 * Client chrome for the news hub. The server page keeps metadata and the ESPN
 * fetch; this component only renders translated markup around serializable
 * article data.
 */
export function NewsView({
  articles,
  failed,
}: {
  articles: NewsArticle[];
  failed: boolean;
}) {
  const { t, f } = useI18n();

  if (failed) {
    return (
      <div className="nw-page">
        <NewsHero articles={[]} failed />
        <EmptyState
          icon={<Newspaper size={22} />}
          title={t.news.feedError.title}
          description={t.news.feedError.description}
          action={{ href: "/matches", label: t.news.todaysMatches }}
        >
          <a href="/news" className="btn btn--ghost">
            <RefreshCw size={15} aria-hidden="true" />
            {t.news.feedError.reload}
          </a>
        </EmptyState>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="nw-page">
        <NewsHero articles={[]} failed={false} />
        <EmptyState
          icon={<Newspaper size={22} />}
          title={t.news.empty.title}
          description={t.news.empty.description}
          action={{ href: "/matches", label: t.news.empty.action }}
        />
      </div>
    );
  }

  const [lead, ...rest] = articles;
  const sideStories = rest.slice(0, 4);
  const gridStories = rest.slice(4);

  return (
    <div className="nw-page">
      <NewsHero articles={articles} failed={false} />

      <section className="nw-front" aria-label={t.news.frontAria}>
        <NewsCard article={lead} variant="lead" />

        <aside className="nw-rail">
          <LatestHeadlines articles={sideStories} />
          <AboutFeed />
        </aside>
      </section>

      {gridStories.length > 0 ? (
        <section className="nw-wire" aria-labelledby="nw-wire-title">
          <div className="nw-wire__head">
            <div>
              <p className="nw-wire__eyebrow">{t.news.wire.eyebrow}</p>
              <h2 className="nw-wire__title" id="nw-wire-title">
                {t.news.wire.title}
              </h2>
              <p className="nw-wire__sub">{t.news.wire.sub}</p>
            </div>
            <span className="nw-wire__count">
              {f(
                gridStories.length === 1
                  ? t.news.wire.countOne
                  : t.news.wire.countMany,
                { n: formatNumber(gridStories.length) },
              )}
            </span>
          </div>

          <NewsGrid articles={gridStories} />
        </section>
      ) : null}
    </div>
  );
}
