// /functions/_middleware.js — one address per language.
//
// English is served as-is from the root (/explore). Every other language gets
// its own prefix (/de/explore, /hr/apartments/olive) so search engines can
// index each version: this middleware takes the English page and, as it
// streams through, sets <html lang>, writes the translations straight into
// the HTML, points canonical/og:url at itself and keeps internal links inside
// the same language. i18n.js still runs afterwards for the parts that page
// scripts build (apartment details, FAQ list, explore lists).
//
// Only runs on the prefixed paths and /api/* — see _routes.json — so static
// assets never pay for a function call.

const ORIGIN = 'https://auraadriatica.com';
const PREFIXED = ['hr', 'de', 'it', 'sl', 'hu', 'cs', 'sk', 'uk'];

// Isolates are reused between requests; keep parsed JSON around.
const jsonCache = new Map();

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const m = url.pathname.match(/^\/([a-z]{2})(\/.*)?$/);
  if (!m) return next();

  const lang = m[1];
  const rest = m[2] || '';

  // English has no prefix: /en/explore -> /explore
  if (lang === 'en') return redirect(url, rest || '/', 301);
  if (!PREFIXED.includes(lang)) return next();
  if (rest === '') return redirect(url, `/${lang}/`, 301);

  // Only pages are localised. Anything else under a prefix — an asset, the
  // guest page, the API — goes back to its one real address.
  if (/^\/(assets|content|api|guest)(\/|$)/.test(rest) || /\.(?!html$)[a-z0-9]+$/i.test(rest)) {
    return redirect(url, rest, 301);
  }

  // A plain fetch, deliberately not forwarding the browser's request: its
  // If-None-Match would be checked against the *English* file's ETag, and a
  // 304 then would keep serving yesterday's translation after a content edit.
  const res = await env.ASSETS.fetch(new URL(rest + url.search, url.origin));

  // Pages turns /explore.html into /explore with a 308; keep the prefix on it.
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('Location');
    if (loc) {
      const target = new URL(loc, url.origin);
      if (target.origin === url.origin) {
        return redirect(url, `/${lang}${target.pathname}${target.search}`, res.status);
      }
    }
    return res;
  }

  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;

  const dict = await loadJSON(env, url, `/content/${lang}.json`);
  if (!dict) return res; // no translations available: serve English rather than fail

  const slug = (rest.match(/^\/apartments\/(olive|onyx)(?:\.html)?\/?$/) || [])[1];
  const apt = slug ? await loadJSON(env, url, `/content/apartments/${slug}/${lang}.json`) : null;

  const pageUrl = `${ORIGIN}/${lang}${prettyPath(rest)}`;

  let rw = new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('lang', lang); } })
    .on('[data-i18n]', {
      element(el) {
        const val = dict[el.getAttribute('data-i18n')];
        if (typeof val !== 'string') return;
        if (el.hasAttribute('data-i18n-html')) {
          // Own content file, same as i18n.js does client-side.
          el.setInnerContent(val, { html: true });
        } else if (el.hasAttribute('data-i18n-paras')) {
          const paras = val.split(/\n+/).map((s) => s.trim()).filter(Boolean);
          el.setInnerContent(paras.map((s) => `<p>${esc(s)}</p>`).join(''), { html: true });
        } else {
          el.setInnerContent(val); // text: escaped by HTMLRewriter
        }
      }
    })
    .on('[data-i18n-content]', {
      element(el) {
        const val = dict[el.getAttribute('data-i18n-content')];
        if (typeof val === 'string') el.setAttribute('content', val);
      }
    })
    // Language menu: show the right code before any script runs.
    .on('.current-lang', { element(el) { el.setInnerContent(lang.toUpperCase()); } })
    .on('.lang-menu button[data-lang]', {
      element(el) {
        if (el.getAttribute('data-lang') === lang) el.setAttribute('class', 'active');
        else el.removeAttribute('class');
      }
    })
    .on('link[rel="canonical"]', { element(el) { el.setAttribute('href', pageUrl); } })
    .on('meta[property="og:url"]', { element(el) { el.setAttribute('content', pageUrl); } })
    .on('a[href^="/"]', {
      element(el) {
        const href = el.getAttribute('href');
        const local = localise(href, lang);
        if (local !== href) el.setAttribute('href', local);
      }
    });

  // Apartment pages take their title, description and hero text from the
  // apartment's own JSON, the same fields apt.js uses in the browser.
  if (apt) {
    rw = rw
      .on('title', { element(el) { if (apt.page_title) el.setInnerContent(apt.page_title); } })
      .on('meta[name="description"]', { element(el) { if (apt.meta_desc) el.setAttribute('content', apt.meta_desc); } })
      .on('meta[property="og:title"]', { element(el) { if (apt.page_title) el.setAttribute('content', apt.page_title); } })
      .on('meta[property="og:description"]', { element(el) { if (apt.meta_desc) el.setAttribute('content', apt.meta_desc); } })
      .on('.hero h1', { element(el) { if (apt.title) el.setInnerContent(apt.title); } })
      .on('.hero p', { element(el) { if (apt.intro) el.setInnerContent(apt.intro); } });
  }

  const out = rw.transform(res);
  const headers = new Headers(out.headers);
  headers.set('Content-Language', lang);
  // The validators belong to the English file, not to this page.
  headers.delete('ETag');
  headers.delete('Last-Modified');
  return new Response(out.body, { status: res.status, headers });
}

// "/" -> "/", "/explore.html" -> "/explore", "/apartments/olive" stays.
function prettyPath(p) {
  let path = p.replace(/\.html$/, '');
  if (path === '/index' || path === '') path = '/';
  return path;
}

// Rewrite an internal page link to stay in `lang`. Assets, the API, the
// content files, the guest page and anything with a file extension other
// than .html keep their single address.
function localise(href, lang) {
  if (href.startsWith('//')) return href;
  const [, path, suffix = ''] = href.match(/^([^?#]*)(.*)$/);
  if (/^\/(assets|content|api|guest)(\/|$)/.test(path)) return href;
  if (/\.(?!html$)[a-z0-9]+$/i.test(path)) return href;
  if (new RegExp(`^/(${PREFIXED.join('|')})(/|$)`).test(path)) return href; // already localised
  const pretty = prettyPath(path);
  return `/${lang}${pretty === '/' ? '/' : pretty}${suffix}`;
}

async function loadJSON(env, url, path) {
  if (jsonCache.has(path)) return jsonCache.get(path);
  try {
    const r = await env.ASSETS.fetch(new URL(path, url.origin));
    if (!r.ok) return null;
    const data = await r.json();
    jsonCache.set(path, data);
    return data;
  } catch (err) {
    console.error('middleware: could not load', path, String(err));
    return null;
  }
}

function redirect(url, path, status) {
  return new Response(null, { status, headers: { Location: new URL(path, url.origin).toString() } });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
