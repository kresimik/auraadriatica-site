// /functions/api/ical/[apt].ts
interface Env {
  ONYX_ICS_URL: string;   // postavi u Pages > Settings > Variables
  OLIVE_ICS_URL: string;  // postavi u Pages > Settings > Variables
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env, request }) => {
  const apt = String(params.apt || "").toLowerCase();
  const map: Record<string, string | undefined> = {
    onyx: env.ONYX_ICS_URL,
    olive: env.OLIVE_ICS_URL,
  };
  const icsUrl = map[apt];
  if (!icsUrl) {
    return new Response(JSON.stringify({ error: "Unknown apartment" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Cache response for 5 min na edgeu
  const cache = caches.default;
  const cacheKey = new Request(request.url, request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const icsResp = await fetch(icsUrl);
  if (!icsResp.ok) {
    return new Response(JSON.stringify({ error: "Failed to fetch ICS" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ics = await icsResp.text();

  // Minimalni ICS parser (DTSTART/DTEND po VEVENT)
  const bookings: { start: string; end: string }[] = [];
  let inEvent = false;
  let dtStart: string | null = null;
  let dtEnd: string | null = null;

  for (const rawLine of ics.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      dtStart = null;
      dtEnd = null;
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && dtStart && dtEnd) {
        const s = parseIcsDate(dtStart);
        const e = parseIcsDate(dtEnd);
        if (s && e) bookings.push({ start: s, end: e }); // DTEND je ekskluzivan (checkout)
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    if (line.startsWith("DTSTART")) {
      dtStart = line.split(":").pop() || null;
    } else if (line.startsWith("DTEND")) {
      dtEnd = line.split(":").pop() || null;
    }
  }

  const resp = new Response(
    JSON.stringify({ apartment: apt, bookings }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
  await cache.put(cacheKey, resp.clone());
  return resp;
};

function parseIcsDate(s: string | null): string | null {
  if (!s) return null;
  // Podržava YYYYMMDD ili YYYYMMDDThhmmssZ
  const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo}-${d}`; // ISO datum (lokalno bez vremena)
}
