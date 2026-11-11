/**
 * AI provider configuration, read entirely from server environment variables.
 * This module never runs in the browser and never logs the API key: the key
 * only ever leaves this process as an Authorization header against the
 * private gateway.
 *
 * None of these values are exposed to clients. API responses carry only the
 * public product name (`AI_PUBLIC_NAME`); the base URL, key and real model id
 * stay in the server process.
 */
import "server-only";
import { AI_PUBLIC_NAME } from "./brand";

export type AiProvider = "touchline-ai";

export interface AiConfig {
  provider: AiProvider;
  /** Base URL including the `/v1` version segment, no trailing slash. */
  baseUrl: string;
  /** Bearer key for the private AI gateway. Empty string when unset. */
  apiKey: string;
  /** Model id sent to the gateway (server-side only). */
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

export const DEFAULT_AI_MODEL = AI_PUBLIC_NAME;

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
 * `AI_PROVIDER` accepts only `touchline-ai` (or an empty value, which defaults
 * to it) so a misconfigured deployment fails loudly instead of silently
 * switching providers.
 */
export function getAiConfig(): AiConfig {
  const provider = (process.env.AI_PROVIDER ?? "touchline-ai").trim();
  if (provider !== "touchline-ai") {
    throw new AiConfigError(
      `Unsupported AI_PROVIDER "${provider}". Only "touchline-ai" is allowed.`,
    );
  }

  // The gateway address is deployment-specific and deliberately not committed:
  // it lives in the environment alongside the key, so the repository carries
  // no private network details.
  const baseUrl = (process.env.AI_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

  return {
    provider: "touchline-ai",
    baseUrl,
    apiKey: (process.env.AI_API_KEY ?? "").trim(),
    model: (process.env.AI_MODEL ?? DEFAULT_AI_MODEL).trim(),
    timeoutMs: intFromEnv("AI_TIMEOUT_MS", 60_000, 5_000, 120_000),
    retries: intFromEnv("AI_RETRIES", 2, 0, 4),
    maxTokens: intFromEnv("AI_MAX_TOKENS", 12_000, 500, 20_000),
    temperature: floatFromEnv("AI_TEMPERATURE", 0.2, 0, 1),
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
  return (process.env.AI_API_KEY ?? "").trim().length > 0;
}
