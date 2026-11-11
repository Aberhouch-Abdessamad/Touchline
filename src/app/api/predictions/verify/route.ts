import { NextResponse } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { verifyDue } from "@/lib/predictions/verify";
import type { ApiMeta } from "@/lib/types";

const MIN_GAP_MS = 60_000;
let lastRunAt = 0;

/**
 * POST /api/predictions/verify — run a verification sweep now.
 * Uses only the football API (no AI call). At most one sweep per minute per
 * process; concurrent calls share the same in-flight sweep.
 */
export async function POST() {
  const wait = lastRunAt + MIN_GAP_MS - Date.now();
  if (wait > 0) {
    return NextResponse.json(
      {
        error: {
          message: "A verification sweep ran moments ago. Try again shortly.",
          status: 429,
          code: "too_soon",
        },
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil(wait / 1000)) } },
    );
  }
  lastRunAt = Date.now();
  try {
    const result = await verifyDue();
    const meta: ApiMeta = {
      source: "Touchline AI prediction ledger",
      attribution: "Actual results and statistics from ESPN's public soccer API.",
      fetchedAt: new Date().toISOString(),
      cacheSeconds: 0,
    };
    return apiOk(result, meta, 0);
  } catch (error) {
    return apiError(error, "Verification could not run.");
  }
}
