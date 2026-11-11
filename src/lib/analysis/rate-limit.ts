/**
 * Per-client rate limit for AI generation routes.
 *
 * The gateway call is the expensive operation (one client-hour budget from
 * `AI_RATE_LIMIT_PER_HOUR`), so every route that can trigger a generation
 * shares this guard. Reads of already-stored documents stay unlimited — the
 * limiter is consulted by the caller only when a gateway call will actually
 * happen.
 */
import { getAiConfig } from "@/lib/ai/config";

const generationHits = new Map<string, number[]>();

/** Coarse client identity: first `x-forwarded-for` entry, or "local". */
export function clientIdentity(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

/** Record a call and return true when this client has exhausted its budget. */
export function rateLimitReject(identity: string): boolean {
  const config = getAiConfig();
  const now = Date.now();
  const windowStart = now - 60 * 60 * 1000;
  const hits = (generationHits.get(identity) ?? []).filter(
    (hit) => hit > windowStart,
  );
  if (hits.length >= config.rateLimitPerHour) {
    generationHits.set(identity, hits);
    return true;
  }
  hits.push(now);
  generationHits.set(identity, hits);
  return false;
}

/** The message shown when a route turns a regeneration/refresh away. */
export function rateLimitedMessage(action: string): string {
  return `${action} limit reached for this client. Already-stored results remain available.`;
}

/** Thrown by a route's `gate` callback when the capture budget is exhausted. */
export class RateLimitExceededError extends Error {
  constructor(message: string = "Generation limit reached for this client.") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}
