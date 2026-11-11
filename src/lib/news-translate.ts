/**
 * Arabic localisation for the ESPN news feed.
 *
 * The UI chrome around the news is translated through the i18n dictionary, but
 * headlines, summaries and section tags arrive from ESPN in English. When the
 * reader's language is Arabic, the missing text is translated once through
 * Touchline AI (the only AI provider in the project) and cached on disk
 * (`.data/news-ar.json`, gitignored), so each story costs at most one call.
 *
 * Guarantees:
 *  - Best-effort: any failure (no key, budget exhausted, timeout, bad output)
 *    leaves the English text untouched. A translation never blocks the page for
 *    longer than `WAIT_MS`; late results are still cached for the next view.
 *  - Only the headline, description and section are translated. Names, links,
 *    dates and images are never touched.
 */
import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { chatComplete } from "@/lib/ai/client";
import { extractJsonObject } from "@/lib/ai/analysis-schema";
import { NEWS_TRANSLATION_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { rateLimitReject } from "@/lib/analysis/rate-limit";
import type { Locale } from "@/lib/i18n/core";
import type { NewsArticle } from "@/lib/types";

interface ArabicNewsText {
  headline: string;
  description: string;
  section?: string;
}

const FILE = path.join(process.cwd(), ".data", "news-ar.json");
const MAX_ENTRIES = 600;
const WAIT_MS = 9_000;
const BATCH = 12;

let memory: Record<string, ArabicNewsText> | null = null;
const inFlight = new Map<string, Promise<void>>();

async function load(): Promise<Record<string, ArabicNewsText>> {
  if (memory) return memory;
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8"));
    memory = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    memory = {};
  }
  return memory as Record<string, ArabicNewsText>;
}

async function persist(store: Record<string, ArabicNewsText>): Promise<void> {
  try {
    const keys = Object.keys(store);
    if (keys.length > MAX_ENTRIES) {
      for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) delete store[key];
    }
    await mkdir(path.dirname(FILE), { recursive: true });
    const temp = `${FILE}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(store), "utf8");
    await rename(temp, FILE);
  } catch {
    /* persistence is best-effort */
  }
}

const clean = (value: unknown, max: number): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined;

/** Translate one batch of stories and merge the result into the cache. */
async function translateBatch(articles: NewsArticle[]): Promise<void> {
  if (articles.length === 0) return;
  // Shares the AI spending guards (hourly + site-wide daily cap).
  if (rateLimitReject("news-translation")) return;

  const payload = articles.map((article) => ({
    id: article.id,
    headline: article.headline,
    description: article.description,
    section: article.section ?? "",
  }));

  const result = await chatComplete({
    system: NEWS_TRANSLATION_SYSTEM_PROMPT,
    user: `Translate these football news items into Arabic. Return {"articles":[{"id","headline","description","section"}]} with the same ids.\n\n${JSON.stringify(
      payload,
    )}`,
    maxTokens: 4000,
  });

  const parsed = extractJsonObject(result.content) as {
    articles?: Array<Record<string, unknown>>;
  };
  if (!Array.isArray(parsed?.articles)) return;

  const store = await load();
  const known = new Set(articles.map((article) => article.id));
  for (const item of parsed.articles) {
    const id = clean(item?.id, 200);
    const headline = clean(item?.headline, 400);
    if (!id || !headline || !known.has(id)) continue;
    // Reject output that is still English (no Arabic letters at all).
    if (!/[؀-ۿ]/.test(headline)) continue;
    store[id] = {
      headline,
      description: clean(item?.description, 1200) ?? "",
      section: clean(item?.section, 80),
    };
  }
  await persist(store);
}

/**
 * Return the articles with Arabic text where available. English readers get the
 * input back unchanged and never trigger a model call.
 */
export async function localizeNews(
  articles: NewsArticle[],
  lang: Locale,
): Promise<NewsArticle[]> {
  if (lang !== "ar" || articles.length === 0) return articles;

  const store = await load();
  const missing = articles.filter((article) => !store[article.id]);

  if (missing.length > 0) {
    const key = missing.map((article) => article.id).join("|");
    let task = inFlight.get(key);
    if (!task) {
      task = (async () => {
        for (let i = 0; i < missing.length; i += BATCH) {
          await translateBatch(missing.slice(i, i + BATCH));
        }
      })()
        .catch((error) => {
          // Server-side only; never contains the key.
          console.error("[news-translation] failed:", error);
        })
        .finally(() => inFlight.delete(key));
      inFlight.set(key, task);
    }
    // Wait briefly; a slow translation keeps running and is cached for next time.
    await Promise.race([task, new Promise((resolve) => setTimeout(resolve, WAIT_MS))]);
  }

  const latest = await load();
  return articles.map((article) => {
    const arabic = latest[article.id];
    if (!arabic) return article;
    return {
      ...article,
      headline: arabic.headline,
      description: arabic.description || article.description,
      section: arabic.section ?? article.section,
      imageAlt: arabic.headline,
    };
  });
}
