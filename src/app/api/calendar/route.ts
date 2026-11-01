import { matchesToIcs } from "@/lib/calendar";
import { getMatchesByDate, getMatchesByMonth } from "@/lib/api";
import { apiBadRequest, apiError } from "@/lib/api-response";
import { isIsoDate, isIsoMonth } from "@/lib/validation";

/**
 * GET /api/calendar?date=YYYY-MM-DD   or   ?month=YYYY-MM
 * Returns a downloadable iCalendar file. This lets the calendar page offer a
 * real export without shipping the whole fixture list to the browser.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const month = searchParams.get("month");

  if (date && !isIsoDate(date)) {
    return apiBadRequest("`date` must be a real calendar date formatted YYYY-MM-DD.");
  }
  if (!date && month && !isIsoMonth(month)) {
    return apiBadRequest("`month` must be formatted YYYY-MM.");
  }

  try {
    const matches = date
      ? await getMatchesByDate(date)
      : month
        ? (await getMatchesByMonth(month)).matches
        : await getMatchesByDate(new Date().toISOString().slice(0, 10));

    const label = date ?? month ?? "today";
    const body = matchesToIcs(matches, `Touchline fixtures — ${label}`);
    const filename = `touchline-${label}.ics`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=0, s-maxage=120, stale-while-revalidate=240",
      },
    });
  } catch (error) {
    return apiError(error, "The calendar export could not be generated.");
  }
}
