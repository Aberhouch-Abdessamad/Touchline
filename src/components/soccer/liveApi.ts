/**
 * Shared client-side contracts for the live analyst panel and dashboard.
 *
 * Both surfaces talk to `/api/match/[id]/live`; these interfaces are the
 * narrow, structural view of its responses (GET returns the stored document,
 * POST returns a capture outcome plus the live match header). Error codes are
 * mapped into the live i18n domain's `error` block.
 */
import { live as liveDict } from "@/lib/i18n/domains/live";
import type { StoredLive } from "@/lib/analysis/store";
import type { ApiMeta } from "@/lib/types";

export type LiveLanguage = "en" | "ar";

export interface LiveApiError {
  error?: { message?: string; status?: number; code?: string };
}

export interface LiveTeamHeader {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logo?: string;
  color?: string;
  score: number;
  record?: string;
}

export interface LiveMatchHeader {
  id: string;
  name: string;
  kickoff: string;
  state: string;
  statusLabel: string;
  competition: { name: string; slug?: string; logo?: string };
  minuteLabel: string;
  score: { home: number; away: number };
  home: LiveTeamHeader;
  away: LiveTeamHeader;
}

/** POST /api/match/[id]/live */
export interface LiveCaptureResponse {
  status: "captured" | "skipped" | "unchanged";
  trigger?: string;
  reason?: string;
  match: LiveMatchHeader;
  live: StoredLive | null;
  meta: ApiMeta;
}

/** GET /api/match/[id]/live */
export interface LiveReadResponse {
  live: StoredLive;
  meta: ApiMeta;
}

/** Map a route error code onto the live domain's message. */
export function liveErrorMessageKey(
  code: string | undefined,
): keyof (typeof liveDict)["en"]["error"] {
  switch (code) {
    case "ai_not_configured":
      return "notConfigured";
    case "ai_auth_failed":
      return "auth";
    case "ai_rate_limited":
    case "rate_limited":
    case "upstream_rate_limited":
      return "rateLimited";
    case "ai_timeout":
    case "upstream_timeout":
      return "timeout";
    case "ai_unavailable":
      return "unavailable";
    case "ai_invalid_response":
    case "ai_unsupported_model":
      return "invalidResponse";
    case "insufficient_match_data":
      return "insufficientData";
    case "match_not_live":
      return "notLive";
    case "not_found":
      return "notFound";
    case "upstream_error":
      return "upstream";
    default:
      return "unknown";
  }
}

/** Probability formatter for 0–1 estimates ("63%"). */
export function livePct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Dominance shares are already 0–100 percentages, never 0–1 fractions, so
 * they must not go through `livePct` (that would render 50 as "5000%").
 */
export function liveDomPct(value: number): string {
  return `${Math.round(value)}%`;
}
