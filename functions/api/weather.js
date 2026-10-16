// /functions/api/weather.js
// 7-day forecast for Lovran, fetched server-side from Open-Meteo.
//
// The browser used to call api.open-meteo.com directly, handing every
// visitor's IP to a third party. Going through our own origin keeps that
// inside Cloudflare, and the edge cache means one upstream call serves all
// visitors for the next half hour instead of one call per page view.
//
// Parameters are fixed — this endpoint takes no input, so it cannot be
// pointed at another location or used as an open proxy.

const UPSTREAM =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=45.291&longitude=14.272&timezone=Europe%2FZagreb' +
  '&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=7';

export async function onRequestGet() {
  try {
    const res = await fetch(UPSTREAM, {
      cf: { cacheEverything: true, cacheTtl: 1800 }
    });
    if (!res.ok) {
      console.error('Open-Meteo upstream', res.status);
      return json({ error: 'Forecast unavailable' }, 502);
    }
    const data = await res.json();
    const d = data && data.daily;
    if (!d || !Array.isArray(d.time)) {
      console.error('Open-Meteo unexpected payload');
      return json({ error: 'Forecast unavailable' }, 502);
    }
    // Pass on only the fields the widget reads.
    return json(
      {
        daily: {
          time: d.time,
          weathercode: d.weathercode,
          temperature_2m_max: d.temperature_2m_max,
          temperature_2m_min: d.temperature_2m_min
        }
      },
      200,
      'public, max-age=900, s-maxage=1800'
    );
  } catch (err) {
    console.error('Open-Meteo fetch failed', String(err && err.message || err));
    return json({ error: 'Forecast unavailable' }, 502);
  }
}

function json(obj, status, cacheControl = 'no-store') {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl
    }
  });
}
