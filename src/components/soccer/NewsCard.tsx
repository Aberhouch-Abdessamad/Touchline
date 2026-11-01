import { ArrowUpRight, Newspaper } from "lucide-react";
import { LocalTime } from "@/components/ui/LocalTime";
import { cn } from "@/lib/utils";
import type { NewsArticle } from "@/lib/types";

function StoryMedia({
  article,
  variant,
}: {
  article: NewsArticle;
  variant: "default" | "lead";
}) {
  return (
    <div
      className={cn(
        "nw-card__media",
        variant === "lead" && "nw-card__media--lead",
      )}
    >
      {article.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="nw-card__image"
          src={article.image}
          alt={article.imageAlt ?? ""}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span className="nw-card__placeholder" aria-hidden="true">
          <Newspaper size={variant === "lead" ? 30 : 22} />
          <em>{article.section ?? "Football"}</em>
        </span>
      )}
      {article.section ? (
        <span className="nw-card__section">{article.section}</span>
      ) : null}
    </div>
  );
}

export function NewsCard({
  article,
  variant = "default",
}: {
  article: NewsArticle;
  variant?: "default" | "lead";
}) {
  const Heading = variant === "lead" ? "h2" : "h3";

  const body = (
    <>
      <StoryMedia article={article} variant={variant} />
      <div className="nw-card__body">
        <div className="nw-card__meta">
          <LocalTime
            date={article.published}
            mode="date"
            fallback="Date unavailable"
          />
          {article.byline ? (
            <span className="nw-card__byline">{article.byline}</span>
          ) : null}
        </div>
        <Heading
          className={cn(
            "nw-card__title",
            variant === "lead" && "nw-card__title--lead",
          )}
        >
          {article.headline}
        </Heading>
        {article.description ? (
          <p className="nw-card__desc">{article.description}</p>
        ) : null}
        {article.url ? (
          <span className="nw-card__foot">
            Read at ESPN
            <ArrowUpRight size={13} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (!article.url) {
    return (
      <article
        className={cn(
          "nw-card",
          variant === "lead" && "nw-card--lead",
        )}
      >
        {body}
      </article>
    );
  }

  return (
    <a
      className={cn("nw-card", variant === "lead" && "nw-card--lead")}
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {body}
    </a>
  );
}

export function NewsGrid({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="nw-grid">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </div>
  );
}

export function NewsList({ articles }: { articles: NewsArticle[] }) {
  return (
    <div className="news-list">
      {articles.map((article) => {
        const body = (
          <>
            {article.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="news-item__image"
                src={article.image}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <span className="news-item__text">
              <span className="news-item__title">{article.headline}</span>
              <span className="news-item__meta">
                <LocalTime date={article.published} mode="date" fallback="—" />
              </span>
            </span>
          </>
        );

        return article.url ? (
          <a
            key={article.id}
            className="news-item"
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {body}
          </a>
        ) : (
          <article key={article.id} className="news-item">
            {body}
          </article>
        );
      })}
    </div>
  );
}
