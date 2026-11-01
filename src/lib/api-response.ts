import { NextResponse } from "next/server";
import type { ApiMeta } from "./types";
import { TimeoutError, UpstreamError } from "./http";

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
  error?: never;
}

export interface ApiErrorBody {
  error: {
    message: string;
    status: number;
    code: string;
  };
}

export function apiOk<T>(
  data: T,
  meta: ApiMeta,
  cacheSeconds = 60,
): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json(
    { data, meta },
    {
      status: 200,
      headers: {
        // A zero window means the response must never be stored, which is the
        // contract the health probe documents.
        "Cache-Control":
          cacheSeconds > 0
            ? `public, max-age=0, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
            : "no-store",
        "X-Data-Source": meta.source,
      },
    },
  );
}

export function apiError(
  error: unknown,
  fallbackMessage = "The upstream data provider did not respond.",
): NextResponse<ApiErrorBody> {
  let status = 502;
  let code = "upstream_error";
  let message = fallbackMessage;

  if (error instanceof UpstreamError) {
    status = error.status >= 400 && error.status < 500 ? error.status : 502;
    code = error.status === 404 ? "not_found" : "upstream_error";
    message =
      error.status === 404
        ? "No data is available for that request."
        : "The upstream data provider returned an error.";
  } else if (error instanceof TimeoutError) {
    status = 504;
    code = "upstream_timeout";
    message = "The upstream data provider timed out. Please try again.";
  } else if (error instanceof Error) {
    message = error.message;
  }

  return NextResponse.json(
    { error: { message, status, code } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function apiBadRequest(message: string) {
  return NextResponse.json(
    { error: { message, status: 400, code: "bad_request" } },
    { status: 400, headers: { "Cache-Control": "no-store" } },
  );
}

export function apiNotFound(message = "Not found.") {
  return NextResponse.json(
    { error: { message, status: 404, code: "not_found" } },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}
