/**
 * Small upstream HTTP client with timeouts, retries, in-process caching and
 * request de-duplication. Used only on the server; client components talk to
 * our own `/api/*` routes instead.
 */

export class UpstreamError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
    this.url = url;
  }
}

export class TimeoutError extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`Request timed out: ${url}`);
    this.name = "TimeoutError";
    this.url = url;
  }
}

interface CacheEntry {
  expires: number;
  value: unknown;
}

interface FetchJsonOptions {
  /** Seconds the response stays fresh in the in-process cache. */
  revalidate?: number;
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  cacheKey?: string;
  /** Bypass the in-process cache but still participate in de-duplication. */
  fresh?: boolean;
  /**
   * Opt out of Next's data cache. Large scoreboard payloads exceed its 2 MB
   * per-entry limit, so they are kept only in the bounded in-process cache.
   */
  nextCache?: boolean;
}

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<unknown>>();
const MAX_CACHE_ENTRIES = 400;

const DEFAULT_HEADERS: Record<string, string> = {
  accept: "application/json, text/plain, */*",
  "user-agent":
    "Touchline/1.0 (+https://github.com/touchline) football data client",
};

function pruneCache(now: number) {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key);
  }
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;
  if (error instanceof UpstreamError) {
    return error.status === 429 || error.status >= 500;
  }
  return error instanceof TypeError;
}

/**
 * Fetch JSON with a bounded retry policy. Upstream 4xx responses (other than
 * 429) are surfaced immediately because retrying them only wastes quota.
 */
export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    revalidate = 60,
    timeoutMs = 15_000,
    retries = 2,
    headers,
    cacheKey = url,
    fresh = false,
    nextCache = true,
  } = options;

  const now = Date.now();
  if (!fresh) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > now) return hit.value as T;
  }

  const existing = pending.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const task = (async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          headers: { ...DEFAULT_HEADERS, ...headers },
          signal: controller.signal,
          ...(nextCache
            ? { next: { revalidate } }
            : { cache: "no-store" as const }),
        });

        if (!response.ok) {
          throw new UpstreamError(
            `Upstream responded ${response.status} for ${url}`,
            response.status,
            url,
          );
        }

        const data = (await response.json()) as T;
        cache.set(cacheKey, {
          expires: Date.now() + revalidate * 1000,
          value: data,
        });
        pruneCache(now);
        return data;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new TimeoutError(url);
        } else {
          lastError = error;
        }
        if (attempt >= retries || !shouldRetry(lastError)) break;
        await sleep(300 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new UpstreamError("Unknown upstream error", 502, url);
  })();

  pending.set(cacheKey, task);
  try {
    return (await task) as T;
  } finally {
    pending.delete(cacheKey);
  }
}

export function getCacheStats() {
  return { entries: cache.size, pending: pending.size };
}
