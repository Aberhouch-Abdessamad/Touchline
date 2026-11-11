<<<<<<< HEAD
import { Suspense } from "react";
import { connection } from "next/server";
import { NewsSkeleton } from "@/components/soccer/NewsSkeleton";
import { getNews } from "@/lib/api";
import type { NewsArticle } from "@/lib/types";
import { NewsView } from "./NewsView";

export const metadata = {
  title: "News",
  description:
    "Football headlines from ESPN's public news feed — transfers, match reports and competition stories, each linking to the original publisher.",
  alternates: { canonical: "/news" },
};

async function NewsFeed() {
  await connection();

  let articles: NewsArticle[] = [];
  let failed = false;
  try {
    articles = await getNews(15);
  } catch {
    failed = true;
  }

  return <NewsView articles={articles} failed={failed} />;
}

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsSkeleton />}>
      <NewsFeed />
    </Suspense>
  );
}
=======
import { Suspense } from "react";
import { connection } from "next/server";
import { NewsSkeleton } from "@/components/soccer/NewsSkeleton";
import { getNews } from "@/lib/api";
import { localizeNews } from "@/lib/news-translate";
import { serverPreferences } from "@/lib/i18n/server";
import type { NewsArticle } from "@/lib/types";
import { NewsView } from "./NewsView";

export const metadata = {
  title: "News",
  description:
    "Football headlines from ESPN's public news feed — transfers, match reports and competition stories, each linking to the original publisher.",
  alternates: { canonical: "/news" },
};

async function NewsFeed() {
  await connection();

  let articles: NewsArticle[] = [];
  let failed = false;
  try {
    const [{ lang }, fetched] = await Promise.all([serverPreferences(), getNews(15)]);
    articles = await localizeNews(fetched, lang);
  } catch {
    failed = true;
  }

  return <NewsView articles={articles} failed={failed} />;
}

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsSkeleton />}>
      <NewsFeed />
    </Suspense>
  );
}
>>>>>>> bd33da1bc8aba80a975dcfa5da7ea3857aaecb97
