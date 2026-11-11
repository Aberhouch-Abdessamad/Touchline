<<<<<<< HEAD
/**
 * Private AI gateway client (OpenAI-compatible `POST /v1/chat/completions`).
 *
 * Server-only. The credential never touches logs, error messages, or the
 * response we hand back to callers — errors carry a stable `kind` that route
 * handlers translate into HTTP statuses. Error text names only the public
 * product ("Touchline AI"); the gateway address, key and model id never
 * appear anywhere a client could read.
 */
import { getAiConfig, AiConfigError, type AiConfig } from "./config";
import { extractJsonObject } from "./analysis-schema";

export type AiErrorKind =
  | "not_configured"
  | "auth_failed"
  | "unsupported_model"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "invalid_request"
  | "invalid_response";

export class AiError extends Error {
  readonly kind: AiErrorKind;
  /** Upstream HTTP status when there was one (408/ETIMEDOUT excluded). */
  readonly upstreamStatus?: number;

  constructor(kind: AiErrorKind, message: string, upstreamStatus?: number) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
    this.upstreamStatus = upstreamStatus;
  }
}

export interface ChatCompletionResult {
  content: string;
  /** Model that actually answered (the gateway may route per-request). */
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  /** Whether the response hit the token budget before finishing. */
  truncated?: boolean;
}

interface GatewayErrorBody {
  error?: { message?: string; type?: string; code?: string };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Classify a gateway HTTP error. Payloads are never echoed into messages. */
function classifyHttpError(status: number, body: GatewayErrorBody): AiError {
  const code = String(body.error?.code ?? "");
  if (status === 401 || status === 403 || code === "authentication_failed") {
    return new AiError(
      "auth_failed",
      "The configured Touchline AI key was rejected.",
      status,
    );
  }
  if (
    status === 404 ||
    code === "model_not_found" ||
    code === "model_not_supported"
  ) {
    return new AiError(
      "unsupported_model",
      "The configured Touchline AI model is not available.",
      status,
    );
  }
  if (status === 429 || code === "rate_limited") {
    return new AiError(
      "rate_limited",
      "Touchline AI rate limit reached. Try again shortly.",
      status,
    );
  }
  if (status === 400 || status === 422 || code === "invalid_request") {
    return new AiError(
      "invalid_request",
      "Touchline AI could not process the analysis request.",
      status,
    );
  }
  return new AiError(
    "unavailable",
    "Touchline AI is currently unavailable.",
    status >= 100 ? status : undefined,
  );
}

function isRetryable(error: AiError): boolean {
  return (
    error.kind === "timeout" ||
    error.kind === "rate_limited" ||
    (error.kind === "unavailable" &&
      ((error.upstreamStatus ?? 500) >= 500 || error.upstreamStatus === undefined))
  );
}

function retryDelayMs(attempt: number, error: AiError, retryAfterMs?: number) {
  if (error.kind === "rate_limited" && retryAfterMs !== undefined) {
    return Math.min(Math.max(retryAfterMs, 500), 10_000);
  }
  return 500 * (attempt + 1) + Math.floor(Math.random() * 250);
}

async function parseEnvelope(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * One OpenAI-compatible chat completion against the private AI gateway, with
 * the project's timeout/retry policy. Only temporary failures (timeouts, 429,
 * 5xx, connection errors) are retried — auth, unsupported-model and invalid
 * requests fail immediately instead of burning quota.
 */
export async function chatComplete(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ChatCompletionResult> {
  let config: AiConfig;
  try {
    config = getAiConfig();
  } catch (error) {
    if (error instanceof AiConfigError) {
      throw new AiError("not_configured", error.message);
    }
    throw error;
  }

  if (!config.apiKey || !config.baseUrl) {
    throw new AiError(
      "not_configured",
      "Touchline AI credentials are not configured on this server.",
    );
  }

  const url = `${config.baseUrl}/chat/completions`;
  const payload = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: options.maxTokens ?? config.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
  };

  let lastError: AiError | undefined;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const body = (await parseEnvelope(response)) as
        | GatewayErrorBody
        | Record<string, unknown>
        | undefined;

      if (!response.ok) {
        lastError = classifyHttpError(
          response.status,
          (body ?? {}) as GatewayErrorBody,
        );
      } else {
        const message = (
          body as {
            choices?: Array<{
              message?: { content?: unknown; reasoning?: unknown };
              finish_reason?: unknown;
            }>;
          }
        )?.choices?.[0]?.message;
        const finishReason =
          typeof (body as {
            choices?: Array<{ finish_reason?: unknown }>;
          })?.choices?.[0]?.finish_reason === "string"
            ? ((body as { choices: Array<{ finish_reason: string }> })
                .choices[0].finish_reason as string)
            : undefined;
        const truncated = finishReason === "length";
        const content = message?.content;
        const reasoning = message?.reasoning;
        const answeredModel = (body as { model?: unknown })?.model;
        const usage = (body as { usage?: Record<string, unknown> })?.usage;
        const tokens = {
          promptTokens:
            typeof usage?.prompt_tokens === "number"
              ? (usage.prompt_tokens as number)
              : undefined,
          completionTokens:
            typeof usage?.completion_tokens === "number"
              ? (usage.completion_tokens as number)
              : undefined,
        };
        const model =
          typeof answeredModel === "string" ? answeredModel : config.model;

        if (typeof content !== "string" || content.trim() === "") {
          // Reasoning-model upstreams can spend the whole token budget on
          // hidden thinking and leave `content` empty while the final JSON
          // sits in the gateway's non-standard `reasoning` field. Using that
          // object is honest reuse of the model's own output, never fabricat-
          // ed; anything else is unusable.
          if (typeof reasoning === "string" && reasoning.length > 0) {
            try {
              const recovered = extractJsonObject(reasoning);
              if (recovered && typeof recovered === "object") {
                return {
                  content: JSON.stringify(recovered),
                  model,
                  ...tokens,
                  truncated,
                };
              }
            } catch {
              // The reasoning trail holds no complete JSON object; treat the
              // response as empty below.
            }
          }
          lastError = new AiError(
            "invalid_response",
            truncated
              ? "Touchline AI hit the token budget before returning the JSON object."
              : "Touchline AI returned an empty analysis. Please try again.",
          );
        } else {
          return {
            content,
            model,
            ...tokens,
            truncated,
          };
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new AiError(
          "timeout",
          "Touchline AI did not answer in time. Please try again.",
        );
      } else if (error instanceof AiError) {
        lastError = error;
      } else {
        lastError = new AiError(
          "unavailable",
          "Touchline AI could not be reached. Please try again.",
        );
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt >= config.retries || !isRetryable(lastError)) break;
    await sleep(retryDelayMs(attempt, lastError));
  }

  throw lastError ?? new AiError("unavailable", "Touchline AI request failed.");
}
=======
/**
 * Private AI gateway client (OpenAI-compatible `POST /v1/chat/completions`).
 *
 * Server-only. The credential never touches logs, error messages, or the
 * response we hand back to callers — errors carry a stable `kind` that route
 * handlers translate into HTTP statuses. Error text names only the public
 * product ("Touchline AI"); the gateway address, key and model id never
 * appear anywhere a client could read.
 */
import "server-only";
import { getAiConfig, AiConfigError, type AiConfig } from "./config";
import { extractJsonObject } from "./analysis-schema";

export type AiErrorKind =
  | "not_configured"
  | "auth_failed"
  | "unsupported_model"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "invalid_request"
  | "invalid_response";

export class AiError extends Error {
  readonly kind: AiErrorKind;
  /** Upstream HTTP status when there was one (408/ETIMEDOUT excluded). */
  readonly upstreamStatus?: number;

  constructor(kind: AiErrorKind, message: string, upstreamStatus?: number) {
    super(message);
    this.name = "AiError";
    this.kind = kind;
    this.upstreamStatus = upstreamStatus;
  }
}

export interface ChatCompletionResult {
  content: string;
  /** Model that actually answered (the gateway may route per-request). */
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  /** Whether the response hit the token budget before finishing. */
  truncated?: boolean;
}

interface GatewayErrorBody {
  error?: { message?: string; type?: string; code?: string };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Classify a gateway HTTP error. Payloads are never echoed into messages. */
function classifyHttpError(status: number, body: GatewayErrorBody): AiError {
  const code = String(body.error?.code ?? "");
  if (status === 401 || status === 403 || code === "authentication_failed") {
    return new AiError(
      "auth_failed",
      "The configured Touchline AI key was rejected.",
      status,
    );
  }
  if (
    status === 404 ||
    code === "model_not_found" ||
    code === "model_not_supported"
  ) {
    return new AiError(
      "unsupported_model",
      "The configured Touchline AI model is not available.",
      status,
    );
  }
  if (status === 429 || code === "rate_limited") {
    return new AiError(
      "rate_limited",
      "Touchline AI rate limit reached. Try again shortly.",
      status,
    );
  }
  if (status === 400 || status === 422 || code === "invalid_request") {
    return new AiError(
      "invalid_request",
      "Touchline AI could not process the analysis request.",
      status,
    );
  }
  return new AiError(
    "unavailable",
    "Touchline AI is currently unavailable.",
    status >= 100 ? status : undefined,
  );
}

function isRetryable(error: AiError): boolean {
  return (
    error.kind === "timeout" ||
    error.kind === "rate_limited" ||
    (error.kind === "unavailable" &&
      ((error.upstreamStatus ?? 500) >= 500 || error.upstreamStatus === undefined))
  );
}

function retryDelayMs(attempt: number, error: AiError, retryAfterMs?: number) {
  if (error.kind === "rate_limited" && retryAfterMs !== undefined) {
    return Math.min(Math.max(retryAfterMs, 500), 10_000);
  }
  return 500 * (attempt + 1) + Math.floor(Math.random() * 250);
}

async function parseEnvelope(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * One OpenAI-compatible chat completion against the private AI gateway, with
 * the project's timeout/retry policy. Only temporary failures (timeouts, 429,
 * 5xx, connection errors) are retried — auth, unsupported-model and invalid
 * requests fail immediately instead of burning quota.
 */
export async function chatComplete(options: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<ChatCompletionResult> {
  let config: AiConfig;
  try {
    config = getAiConfig();
  } catch (error) {
    if (error instanceof AiConfigError) {
      throw new AiError("not_configured", error.message);
    }
    throw error;
  }

  if (!config.apiKey || !config.baseUrl) {
    throw new AiError(
      "not_configured",
      "Touchline AI credentials are not configured on this server.",
    );
  }

  const url = `${config.baseUrl}/chat/completions`;
  const payload = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: options.maxTokens ?? config.maxTokens,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
  };

  let lastError: AiError | undefined;

  for (let attempt = 0; attempt <= config.retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const body = (await parseEnvelope(response)) as
        | GatewayErrorBody
        | Record<string, unknown>
        | undefined;

      if (!response.ok) {
        lastError = classifyHttpError(
          response.status,
          (body ?? {}) as GatewayErrorBody,
        );
      } else {
        const message = (
          body as {
            choices?: Array<{
              message?: { content?: unknown; reasoning?: unknown };
              finish_reason?: unknown;
            }>;
          }
        )?.choices?.[0]?.message;
        const finishReason =
          typeof (body as {
            choices?: Array<{ finish_reason?: unknown }>;
          })?.choices?.[0]?.finish_reason === "string"
            ? ((body as { choices: Array<{ finish_reason: string }> })
                .choices[0].finish_reason as string)
            : undefined;
        const truncated = finishReason === "length";
        const content = message?.content;
        const reasoning = message?.reasoning;
        const answeredModel = (body as { model?: unknown })?.model;
        const usage = (body as { usage?: Record<string, unknown> })?.usage;
        const tokens = {
          promptTokens:
            typeof usage?.prompt_tokens === "number"
              ? (usage.prompt_tokens as number)
              : undefined,
          completionTokens:
            typeof usage?.completion_tokens === "number"
              ? (usage.completion_tokens as number)
              : undefined,
        };
        const model =
          typeof answeredModel === "string" ? answeredModel : config.model;

        if (typeof content !== "string" || content.trim() === "") {
          // Reasoning-model upstreams can spend the whole token budget on
          // hidden thinking and leave `content` empty while the final JSON
          // sits in the gateway's non-standard `reasoning` field. Using that
          // object is honest reuse of the model's own output, never fabricat-
          // ed; anything else is unusable.
          if (typeof reasoning === "string" && reasoning.length > 0) {
            try {
              const recovered = extractJsonObject(reasoning);
              if (recovered && typeof recovered === "object") {
                return {
                  content: JSON.stringify(recovered),
                  model,
                  ...tokens,
                  truncated,
                };
              }
            } catch {
              // The reasoning trail holds no complete JSON object; treat the
              // response as empty below.
            }
          }
          lastError = new AiError(
            "invalid_response",
            truncated
              ? "Touchline AI hit the token budget before returning the JSON object."
              : "Touchline AI returned an empty analysis. Please try again.",
          );
        } else {
          return {
            content,
            model,
            ...tokens,
            truncated,
          };
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new AiError(
          "timeout",
          "Touchline AI did not answer in time. Please try again.",
        );
      } else if (error instanceof AiError) {
        lastError = error;
      } else {
        lastError = new AiError(
          "unavailable",
          "Touchline AI could not be reached. Please try again.",
        );
      }
    } finally {
      clearTimeout(timer);
    }

    if (attempt >= config.retries || !isRetryable(lastError)) break;
    await sleep(retryDelayMs(attempt, lastError));
  }

  throw lastError ?? new AiError("unavailable", "Touchline AI request failed.");
}
>>>>>>> bd33da1bc8aba80a975dcfa5da7ea3857aaecb97
