/**
 * Rate limits for AI generation routes.
 *
 * The gateway call is the expensive operation, so every route that can
 * trigger a generation shares these guards:
 *
 *  1. a per-client hourly budget (`AI_RATE_LIMIT_PER_HOUR`), and
 *  2. a global daily cap (`AI_DAILY_CAP`, default 500) so that even a
 *     distributed abuser cannot drain the API key's quota.
 *
 * Reads of already-stored documents stay unlimited: the limiter is consulted
 * by the caller only when a gateway call will actually happen.
 *
 * Note: counters live in process memory. On a multi-instance / serverless
 * deployment, back them with a shared store (e.g. Redis) for exact limits.
 */
import "server-only";
import { getAiConfig } from "@/lib/ai/config";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_TRACKED_CLIENTS = 5000;

const generationHits = new Map<string, number[]>();
let dailyHits: number[] = [];

/** Headers set by the hosting platform itself; clients cannot forge these. */
const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "fly-client-ip",
  "x-real-ip",
];

/**
 * Client identity. Never trusts the first `x-forwarded-for` entry, which a
 * caller can set to anything. Uses a platform header when present, otherwise
 * the LAST `x-forwarded-for` entry (the one appended by our own proxy).
 */
export function clientIdentity(request: Request): string {
  for (const name of TRUSTED_IP_HEADERS) {
    const value = request.headers.get(name)?.split(",")[0]?.trim();
    if (value) return value.slice(0, 64);
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last.slice(0, 64);
  }
  return "local";
}

function dailyCap(): number {
  const raw = Number(process.env.AI_DAILY_CAP);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 500;
}

/** Record a call and return true when this client (or the site) is out of budget. */
export function rateLimitReject(identity: string): boolean {
  const config = getAiConfig();
  const now = Date.now();

  dailyHits = dailyHits.filter((hit) => hit > now - DAY_MS);
  if (dailyHits.length >= dailyCap()) return true;

  const hits = (generationHits.get(identity) ?? []).filter(
    (hit) => hit > now - HOUR_MS,
  );
  if (hits.length >= config.rateLimitPerHour) {
    generationHits.set(identity, hits);
    return true;
  }

  // Bound memory: drop the oldest tracked client when the map grows too big.
  if (!generationHits.has(identity) && generationHits.size >= MAX_TRACKED_CLIENTS) {
    const oldest = generationHits.keys().next().value;
    if (oldest !== undefined) generationHits.delete(oldest);
  }

  hits.push(now);
  generationHits.set(identity, hits);
  dailyHits.push(now);
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
