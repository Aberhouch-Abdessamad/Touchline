import { getAllLeagues, getMatchesByDate, meta } from "@/lib/api";
import { apiOk } from "@/lib/api-response";

/**
 * GET /api/health — lightweight liveness probe.
 * A failed ESPN call is reported as `degraded`; the route itself still answers
 * so monitoring can distinguish "our app is up" from "upstream is down".
 */
export async function GET() {
  const started = Date.now();
  const date = new Date().toISOString().slice(0, 10);
  const checks: Record<string, unknown> = {
    catalogue: { ok: true, leagues: getAllLeagues().length },
  };

  try {
    const matches = await getMatchesByDate(date);
    checks.espn = {
      ok: true,
      latencyMs: Date.now() - started,
      fixturesToday: matches.length,
    };
  } catch (error) {
    checks.espn = {
      ok: false,
      latencyMs: Date.now() - started,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }

  const healthy = Boolean((checks.espn as { ok?: boolean } | undefined)?.ok);

  return apiOk(
    {
      status: healthy ? "ok" : "degraded",
      checks,
    },
    meta("espn", 0),
    0,
  );
}
