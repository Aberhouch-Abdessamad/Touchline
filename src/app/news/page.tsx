import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowUpRight,
  ExternalLink,
  Newspaper,
  Radio,
  RefreshCw,
} from "lucide-react";
import { NewsCard, NewsGrid } from "@/components/soccer/NewsCard";
import { NewsSkeleton } from "@/components/soccer/NewsSkeleton";
import { EmptyState } from "@/components/ui/Primitives";
import { LocalTime } from "@/components/ui/LocalTime";
import { getNews } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import type { NewsArticle } from "@/lib/types";

export const metadata = {
  title: "News",
  description:
    "Football headlines from ESPN's public news feed — transfers, match reports and competition stories, each linking to the original publisher.",
  alternates: { canonical: "/news" },
};

const ESPN_SOCCER = "https://www.espn.com/soccer/";

function NewsHero({
  articles,
  failed,
}: {
  articles: NewsArticle[];
  failed: boolean;
}) {
  const lead = articles[0];
  const bylines = new Set(
    articles.map((article) => article.byline).filter(Boolean),
  );
  const topics = new Set(
    articles.map((article) => article.section).filter(Boolean),
  );

  const lede = failed
    ? "The ESPN news feed did not answer. The rest of Touchline is unaffected, so scores and fixtures stay live while you retry."
    : articles.length === 0
      ? "The feed returned an empty list. Headlines usually appear again within the hour."
      : `${formatNumber(articles.length)} stories from ESPN's football desk, refreshed every five minutes. Every headline opens the original publisher.`;

  return (
    <section className="nw-hero" aria-labelledby="nw-title">
      <div className="nw-hero__bar">
        <p className="nw-hero__eyebrow">
          <span className="nw-hero__spark" aria-hidden="true" />
          The wire
        </p>
        <div className="nw-hero__actions">
          <span className="nw-hero__tag">ESPN football desk</span>
          <Link className="nw-hero__action" href="/matches">
            Today&apos;s matches
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="nw-hero__body">
        <div className="nw-hero__intro">
          <h1 className="nw-hero__title" id="nw-title">
            <span className="nw-hero__title-top">The stories</span>{" "}
            <span className="nw-hero__title-main">behind the scores</span>
          </h1>
          <p className="nw-hero__lede">{lede}</p>
          <p className="nw-hero__note">
            Curated by ESPN&apos;s football desk · links open the publisher in a
            new tab
          </p>
        </div>

        <aside className="nw-top" aria-label="Leading story">
          <p className="nw-top__label">Leading story</p>
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
                      fallback="Time unavailable"
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
                    {lead.section ?? "Football"}
                  </span>
                  <span className="nw-top__headline">{lead.headline}</span>
                </div>
              )}
              <span className="nw-top__link">
                {lead.url ? "Read at ESPN" : "No external link published"}
                {lead.url ? (
                  <ArrowUpRight size={13} aria-hidden="true" />
                ) : null}
              </span>
            </>
          ) : (
            <div className="nw-top__empty">
              <Newspaper size={20} aria-hidden="true" />
              <p>
                {failed
                  ? "The lead story is temporarily unavailable."
                  : "No lead story has been published yet."}
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
          <dt>Stories</dt>
          <dd>{articles.length ? formatNumber(articles.length) : "—"}</dd>
        </div>
        <div className="nw-hero__stat">
          <dt>Bylines</dt>
          <dd>{bylines.size ? formatNumber(bylines.size) : "—"}</dd>
        </div>
        <div className="nw-hero__stat">
          <dt>Topics</dt>
          <dd>{topics.size ? formatNumber(topics.size) : "—"}</dd>
        </div>
        <div className="nw-hero__stat">
          <dt>Latest update</dt>
          <dd className="nw-hero__stat-date">
            {lead?.published ? (
              <LocalTime
                date={lead.published}
                mode="time"
                fallback="—"
              />
            ) : (
              "—"
            )}
            <span className="nw-hero__stat-note">your time zone</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function LatestHeadlines({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="nw-latest" aria-labelledby="nw-latest-title">
      <div className="nw-latest__head">
        <div>
          <p className="nw-latest__eyebrow">
            <Radio size={12} aria-hidden="true" />
            Just moved
          </p>
          <h2 className="nw-latest__title" id="nw-latest-title">
            Latest headlines
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
                  {article.section ?? "Football"} ·{" "}
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
  return (
    <section className="nw-about" aria-labelledby="nw-about-title">
      <div className="nw-about__head">
        <div>
          <p className="nw-about__eyebrow">Attribution</p>
          <h2 className="nw-about__title" id="nw-about-title">
            About this feed
          </h2>
        </div>
        <ExternalLink size={15} aria-hidden="true" />
      </div>
      <div className="nw-about__body">
        <p>
          Headlines and summaries come from ESPN&apos;s public news API.
          Touchline does not rewrite articles: every card opens the original
          publisher in a new tab, where their terms and privacy policy apply.
        </p>
        <p>
          Looking for a specific fixture instead?{" "}
          <Link href="/matches">Open the match centre</Link> or{" "}
          <Link href="/search">search teams and competitions</Link>.
        </p>
        <a
          className="nw-about__link"
          href={ESPN_SOCCER}
          target="_blank"
          rel="noopener noreferrer"
        >
          ESPN Soccer
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

async function NewsFeed() {
  await connection();

  let articles: NewsArticle[] = [];
  let failed = false;
  try {
    articles = await getNews(15);
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <div className="nw-page">
        <NewsHero articles={[]} failed />
        <EmptyState
          icon={<Newspaper size={22} />}
          title="The news feed is unavailable"
          description="ESPN's public news endpoint did not respond. Scores, tables and fixtures are unaffected — try again in a moment."
          action={{ href: "/matches", label: "Today's matches" }}
        >
          <a href="/news" className="btn btn--ghost">
            <RefreshCw size={15} aria-hidden="true" />
            Reload the feed
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
          title="No stories published right now"
          description="The feed returned an empty list. Headlines usually appear again within the hour."
          action={{ href: "/matches", label: "Browse today's fixtures" }}
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

      <section className="nw-front" aria-label="Top stories">
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
              <p className="nw-wire__eyebrow">Across the game</p>
              <h2 className="nw-wire__title" id="nw-wire-title">
                More from the wire
              </h2>
              <p className="nw-wire__sub">
                Transfers, match reports, injury updates and competition news
                from ESPN&apos;s football desk.
              </p>
            </div>
            <span className="nw-wire__count">
              {formatNumber(gridStories.length)}{" "}
              {gridStories.length === 1 ? "story" : "stories"}
            </span>
          </div>

          <NewsGrid articles={gridStories} />
        </section>
      ) : null}
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsSkeleton />}>
      <NewsFeed />
    </Suspense>
  );
}
