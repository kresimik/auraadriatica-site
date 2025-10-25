// /functions/api/ical/[apt].ts
/* Aura Adriatica — iCal → JSON API for availability calendar
   Works on Cloudflare Pages Functions (Production + Preview)
   Reads OLIVE_ICS_URL and ONYX_ICS_URL from environment variables
   Example: /api/ical/olive  →  { "bookings": [ { start, end }... ] }
*/

export const onRequestGet: PagesFunction = async ({ request, params, env }) => {
  // ------------------------------------------------------------
  // 1. Slug detection (robust: params → path → query)
  // ------------------------------------------------------------
  const url = new URL(request.url);
  const pathSlug = url.pathname.match(/\/api\/ical\/([^\/?#]+)/)?.[1]; // /api/ical/olive
  const querySlug = url.searchParams.get("apt");                       // ?apt=olive
  const paramSlug = (params as any)?.apt;                              // from CF dynamic route

  const raw = String(paramSlug || pathSlug || querySlug || "").trim();
  const apt = raw.toLowerCase();

  if (!apt) {
    return json({
      error: "Unknown apartment",
      got: raw,
      note: "No slug found in params/path/query"
    }, 400);
  }

  // ------------------------------------------------------------
  // 2. Allowed names (alias map)
  // ------------------------------------------------------------
  const ALIAS: Record<string, "olive" | "onyx"> = {
    olive: "olive",
    onyx:  "onyx",
  };

  const key = ALIAS[apt];
  if (!key) {
    return json({ error: "Unknown apartment", got: raw }, 400);
  }

  // ------------------------------------------------------------
  // 3. Environment variable map (uses your names)
  // ------------------------------------------------------------
  const ICS_URL =
    key === "olive" ? env.OLIVE_ICS_URL : env.ONYX_ICS_URL;

  if (!ICS_URL) {
    return json({
      error: "Missing ICS env variable",
      apt: key,
      expected: key === "olive" ? "OLIVE_ICS_URL" : "ONYX_ICS_URL"
    }, 500);
  }

  // ------------------------------------------------------------
  // 4. Fetch and parse ICS
  // ------------------------------------------------------------
  try {
    const res = await fetch(ICS_URL, {
      headers: {
        "User-Agent": "AuraAdriaticaBot/1.0 (+https://auraadriatica.com)"
      },
      cf: { cacheEverything: true, cacheTtl: 300 }
    });

    if (!res.ok) {
      const body = await safeText(res);
      return json({
        error: `Upstream ${res.status}`,
        sample: body.slice(0, 200)
      }, 502);
    }

    const ics = await res.text();
    const bookings = parseICS(ics);

    return new Response(JSON.stringify({ bookings }, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=120, s-maxage=300"
      }
    });

  } catch (err: any) {
    return json({
      error: "Fetch/Parse failed",
      message: String(err?.message || err)
    }, 500);
  }
};

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

async function safeText(res: Response): Promise<string> {
  try { return await res.text(); } catch { return ""; }
}

// ------------------------------------------------------------
// Simple ICS parser: extracts DTSTART/DTEND pairs (UTC or local)
// ------------------------------------------------------------
function parseICS(raw: string): { start: string; end: string }[] {
  if (!raw) return [];

  const unfolded = raw.replace(/\r?\n[ \t]/g, "");
  const events = unfolded.split(/(?:\r?\n)END:VEVENT(?:\r?\n)?/);
  const out: { start: string; end: string }[] = [];

  for (const chunk of events) {
    if (!/BEGIN:VEVENT/.test(chunk)) continue;
    const dtStart = matchProp(chunk, "DTSTART");
    const dtEnd   = matchProp(chunk, "DTEND");
    if (!dtStart) continue;

    const startISO = icsToISODate(dtStart);
    const endISO   = dtEnd ? icsToISODate(dtEnd) : addDaysISO(startISO, 1); // DTEND exclusive
    if (startISO && endISO) out.push({ start: startISO, end: endISO });
  }

  out.sort((a, b) => a.start.localeCompare(b.start));
  return out;
}

function matchProp(chunk: string, prop: string): string | null {
  const re = new RegExp(`${prop}(?:;[^:\\r\\n]+)?:([0-9TZ]+)`, "i");
  const m = chunk.match(re);
  return m ? m[1] : null;
}

function icsToISODate(v: string): string {
  if (!v) return "";
  if (v.length === 8) {
    const y = +v.slice(0, 4), m = +v.slice(4, 6) - 1, d = +v.slice(6, 8);
    return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  }
  // full datetime → just date
  const y = +v.slice(0, 4), m = +v.slice(4, 6) - 1, d = +v.slice(6, 8);
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
}

function addDaysISO(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
