// /functions/api/solar.js
// Production, consumption and per-panel data for the two apartments' solar
// systems, fetched server-side from the APsystems OpenAPI (EMA).
//
// Each apartment is its own EMA account, so each has its own App ID, App
// Secret and system id (SID), all kept as Pages secrets:
//   APS_OLIVE_APP_ID, APS_OLIVE_APP_SECRET, APS_OLIVE_SID
//   APS_ONYX_APP_ID,  APS_ONYX_APP_SECRET,  APS_ONYX_SID
//
// Private page: /solar/ and this endpoint sit behind Cloudflare Access, since
// consumption shows when the apartments stand empty. Nothing here is cached
// in the browser or shared caches; the edge copy below is keyed internally.
//
// The OpenAPI counts calls per month, so answers are kept in the edge cache:
// today's figures for FAST_TTL, history and the panel list for a day.

const BASE = 'https://api.apsystemsema.com:9282';
const TZ = 'Europe/Zagreb';
const ACCESS_TEAM = 'https://auraadriatica.cloudflareaccess.com';
const FAST_TTL = 3 * 3600;
const SLOW_TTL = 24 * 3600;
const APARTMENTS = [
  { name: 'Olive', env: 'OLIVE' },
  { name: 'Onyx', env: 'ONYX' }
];
const METER_KEYS = ['produced', 'consumed', 'imported', 'exported'];

const API_ERRORS = {
  1001: 'Nema podataka',
  2001: 'Neispravan App ID',
  2002: 'Račun nije autoriziran',
  2003: 'Autorizacija je istekla',
  2004: 'Račun nema dozvolu',
  2005: 'Prekoračen mjesečni limit poziva',
  4001: 'Neispravan parametar (provjeri SID)',
  7001: 'Prekoračen limit pristupa',
  7002: 'Previše upita, pokušaj kasnije',
  7003: 'Sustav je zauzet, pokušaj kasnije'
};

export async function onRequestGet({ env, request }) {
  // Access only guards auraadriatica.com; the same function also answers on
  // *.pages.dev, so it checks the Access token itself and refuses without one.
  if (!(await accessUser(request))) {
    return new Response(JSON.stringify({ error: 'Pristup nije dozvoljen' }), {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, no-store' }
    });
  }
  const today = localDate(new Date());
  const systems = await Promise.all(APARTMENTS.map(async (apt) => {
    const creds = {
      appId: env[`APS_${apt.env}_APP_ID`],
      secret: env[`APS_${apt.env}_APP_SECRET`],
      sid: env[`APS_${apt.env}_SID`]
    };
    if (!creds.appId || !creds.secret || !creds.sid) {
      return { name: apt.name, error: 'Ključevi za ovaj apartman nisu postavljeni' };
    }
    try {
      return { name: apt.name, ...(await loadSystem(creds, today, request.url)) };
    } catch (err) {
      console.error('solar:', apt.name, String(err && err.message || err));
      return { name: apt.name, error: err instanceof ApiError ? err.message : 'Podaci trenutno nisu dostupni' };
    }
  }));
  return new Response(JSON.stringify({ today, systems }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex'
    }
  });
}

async function loadSystem(creds, today, origin) {
  const { sid } = creds;
  const get = (path, params, ttl) => cached(origin, ttl, path, params, () => signedGet(creds, path, params));

  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const yesterday = shiftDate(today, -1);

  const devices = await get(`/user/api/v2/systems/inverters/${sid}`, null, SLOW_TTL);
  const eid = devices.data[0].eid;
  const meter = `/user/api/v2/systems/${sid}/devices/meter/period/${eid}`;

  const [details, summary, hourly, daily, monthly, yearly, panels] = await Promise.all([
    get(`/user/api/v2/systems/details/${sid}`, null, SLOW_TTL),
    get(`/user/api/v2/systems/${sid}/devices/meter/summary/${eid}`, { day: today }, FAST_TTL),
    get(meter, { energy_level: 'hourly', date_range: today }, FAST_TTL),
    get(meter, { energy_level: 'daily', date_range: month }, FAST_TTL),
    get(meter, { energy_level: 'monthly', date_range: year }, SLOW_TTL),
    get(meter, { energy_level: 'yearly' }, SLOW_TTL),
    get(`/user/api/v2/systems/${sid}/devices/inverter/batch/energy/${eid}`,
      { energy_level: 'energy', date_range: yesterday }, SLOW_TTL)
  ]);

  return {
    capacity: num(details.data.capacity),
    light: details.data.light,
    updated: summary.at,
    summary: Object.fromEntries(['today', 'month', 'year', 'lifetime'].map((p) => [p, series(summary.data[p], (v) => num(v))])),
    hourly: series(hourly.data, (v) => v.map(num)),
    daily: series(daily.data, (v) => v.map(num)),
    monthly: series(monthly.data, (v) => v.map(num)),
    yearly: { time: yearly.data.time || [], ...series(yearly.data, (v) => v.map(num)) },
    panels: {
      date: yesterday,
      list: (panels.data.energy || [])
        .map((item) => {
          const [inverter, channel, kwh] = item.split('-');
          return { inverter, channel: Number(channel), kwh: num(kwh) };
        })
        .sort((a, b) => a.inverter.localeCompare(b.inverter) || a.channel - b.channel)
    }
  };
}

// The `day` param on the summary call isn't sent upstream: it only makes the
// cache key roll over at midnight, so "today" never shows yesterday's total.
async function cached(origin, ttl, path, params, fetcher) {
  const upstream = params ? Object.fromEntries(Object.entries(params).filter(([k]) => k !== 'day')) : null;
  const key = new Request(new URL(`/__solar-cache${path}?${new URLSearchParams(params || {})}`, origin));
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit.json();
  }
  const value = { at: new Date().toISOString(), data: await fetcher(upstream) };
  if (cache) {
    await cache.put(key, new Response(JSON.stringify(value), {
      headers: { 'content-type': 'application/json', 'cache-control': `max-age=${ttl}` }
    }));
  }
  return value;
}

class ApiError extends Error {}

// Signature per the APsystems OpenAPI manual, section 2.2: HMAC-SHA256 over
// timestamp/nonce/appId/<last path segment>/GET/HmacSHA256, Base64-encoded.
async function signedGet({ appId, secret }, path, params) {
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const method = 'HmacSHA256';
  const lastSegment = path.split('/').filter(Boolean).pop();
  const toSign = [timestamp, nonce, appId, lastSegment, 'GET', method].join('/');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  const url = BASE + path + (params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : '');
  const res = await fetch(url, {
    headers: {
      'X-CA-AppId': appId,
      'X-CA-Timestamp': timestamp,
      'X-CA-Nonce': nonce,
      'X-CA-Signature-Method': method,
      'X-CA-Signature': signature
    }
  });
  if (!res.ok) throw new ApiError(`APsystems je vratio HTTP ${res.status}`);
  const body = await res.json();
  if (body.code !== 0) throw new ApiError(API_ERRORS[body.code] || `APsystems greška ${body.code}`);
  return body.data;
}

// Cloudflare Access passes a signed JWT in Cf-Access-Jwt-Assertion. It must be
// issued by our team domain, unexpired, and signed with one of the team's keys.
async function accessUser(request) {
  try {
    const token = request.headers.get('cf-access-jwt-assertion');
    const [head, body, sig] = (token || '').split('.');
    if (!sig) return null;
    const header = JSON.parse(b64urlText(head));
    const payload = JSON.parse(b64urlText(body));
    if (payload.iss !== ACCESS_TEAM || !(payload.exp * 1000 > Date.now())) return null;

    const certs = await (await fetch(`${ACCESS_TEAM}/cdn-cgi/access/certs`, { cf: { cacheTtl: 3600 } })).json();
    const jwk = (certs.keys || []).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const alg = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    const key = await crypto.subtle.importKey('jwk', jwk, alg, false, ['verify']);
    const ok = await crypto.subtle.verify(alg, key, b64urlBytes(sig), new TextEncoder().encode(`${head}.${body}`));
    return ok ? (payload.email || payload.sub || 'access') : null;
  } catch {
    return null;
  }
}

function b64urlBytes(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function b64urlText(s) {
  return new TextDecoder().decode(b64urlBytes(s));
}

// The meter answers {produced: [...], consumed: [...], ...}; keep those four.
function series(obj, map) {
  return Object.fromEntries(METER_KEYS.map((k) => [k, map(obj && obj[k] != null ? obj[k] : [])]));
}

// Numbers arrive as text, and periods without data as null or "null".
function num(x) {
  const n = parseFloat(x);
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : 0;
}

function localDate(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function shiftDate(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
