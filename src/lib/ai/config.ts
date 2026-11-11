/**
 * FFC-Vision provider configuration, read entirely from server environment
 * variables. This module never runs in the browser and never logs the API
 * key: the key only ever leaves this process as an Authorization header
 * against the FFC AI Gateway.
 */

export type AiProvider = "ffc-vision";

export interface AiConfig {
  provider: AiProvider;
  /** Base URL including the `/v1` version segment, no trailing slash. */
  baseUrl: string;
  /** Bearer key for the FFC AI Gateway. Empty string when unset. */
  apiKey: string;
  /** Master model exposed by the gateway (default `FFC-Vision`). */
  model: string;
  /** Per-request timeout for one upstream attempt. */
  timeoutMs: number;
  /** Retry attempts on top of the first request (temporary failures only). */
  retries: number;
  /** Completion token budget for one analysis response. */
  maxTokens: number;
  /** Model sampling temperature; low for deterministic statistics. */
  temperature: number;
  /** Generate-calls allowed per client IP per hour (local abuse guard). */
  rateLimitPerHour: number;
}

export const DEFAULT_FFC_VISION_MODEL = "FFC-Vision";

function intFromEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function floatFromEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Resolve the active AI configuration. The provider is deliberately closed:
 * `AI_PROVIDER` accepts only `ffc-vision` (or an empty value, which defaults
 * to it) so a misconfigured deployment fails loudly instead of silently
 * switching providers.
 */
export function getAiConfig(): AiConfig {
  const provider = (process.env.AI_PROVIDER ?? "ffc-vision").trim();
  if (provider !== "ffc-vision") {
    throw new AiConfigError(
      `Unsupported AI_PROVIDER "${provider}". Only "ffc-vision" is allowed.`,
    );
  }

  // The gateway address is deployment-specific and deliberately not committed:
  // it lives in the environment alongside the key, so the repository carries
  // no private network details.
  const baseUrl = (process.env.FFC_VISION_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  return {
    provider: "ffc-vision",
    baseUrl,
    apiKey: (process.env.FFC_VISION_API_KEY ?? "").trim(),
    model: (
      process.env.FFC_VISION_MODEL ?? DEFAULT_FFC_VISION_MODEL
    ).trim(),
    timeoutMs: intFromEnv("FFC_VISION_TIMEOUT_MS", 60_000, 5_000, 120_000),
    retries: intFromEnv("FFC_VISION_RETRIES", 2, 0, 4),
    maxTokens: intFromEnv("FFC_VISION_MAX_TOKENS", 12_000, 500, 20_000),
    temperature: floatFromEnv("FFC_VISION_TEMPERATURE", 0.2, 0, 1),
    rateLimitPerHour: intFromEnv("AI_RATE_LIMIT_PER_HOUR", 10, 1, 500),
  };
}

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

/** True when a key exists, so read paths can offer stored analyses without it. */
export function hasAiKey(): boolean {
  return (process.env.FFC_VISION_API_KEY ?? "").trim().length > 0;
}
