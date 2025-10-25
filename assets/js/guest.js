// /assets/js/guest.js  (clean-2)

const GUEST_DEFAULT_LANG = 'en';

/* ---------- Link helpers ---------- */

// For LIST items: supports Markdown [Text](URL) and " — URL" -> " — Map".
function listItemHTML(raw) {
  if (raw == null) return '';
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g,
    ' — <a href="$1" target="_blank" rel="noopener">Map</a>');
  return s;
}

// For PARAGRAPHS: Markdown ONLY (no autolink of bare URLs)
function paragraphHTML(raw) {
  if (raw == null) return '';
  return String(raw).replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

function makeUL(items) {
  const ul = document.createElement('ul');
  (items || []).forEach(item => {
    const li = document.createElement('li');
    if (item && typeof item === 'object' && item.name) {
      // object form: { name, url? }
      li.textContent = item.name + (item.url ? ' — ' : '');
      if (item.url) {
        const a = document.createElement('a');
        a.href = item.url; a.textContent = 'Map';
        a.target = '_blank'; a.rel = 'noopener';
        li.appendChild(a);
      }
    } else {
      li.innerHTML = listItemHTML(item);
    }
    ul.appendChild(li);
  });
  return ul;
}

/* ---------- Wi-Fi helpers ---------- */

function buildWifiQR({ ssid, password, auth = 'WPA', size = 260, fallbackSrc }) {
  // If explicit image provided, use it.
  if (fallbackSrc) return fallbackSrc;

  if (!ssid || !password) return null;
  const payload = `WIFI:T:${auth};S:${ssid};P:${password};;`;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
  return url;
}

function renderWifiBlock(sec) {
  // sec.html_kind === 'wifi' OR sec.type === 'wifi' supported
  const wrap = document.createElement('div');
  wrap.className = 'wifi-flex';

  const left = document.createElement('div');
  left.className = 'wifi-text';

  // Prefer structured fields if present; otherwise fall back to content HTML.
  const hasStructured = (sec.ssid || sec.password);

  if (hasStructured) {
    const ssid = String(sec.ssid || '').trim();
    const pass = String(sec.password || '').trim();

    const p1 = document.createElement('p'); p1.className = 'kv';
    p1.innerHTML = `<strong>SSID:</strong> <code id="wifi-ssid">${ssid || '-'}</code>
      <button class="copy-btn" data-copy="#wifi-ssid">Copy</button>`;
    const p2 = document.createElement('p'); p2.className = 'kv';
    p2.innerHTML = `<strong>Password:</strong> <code id="wifi-pass">${pass || '-'}</code>
      <button class="copy-btn" data-copy="#wifi-pass">Copy</button>`;

    left.appendChild(p1);
    left.appendChild(p2);

    const note = document.createElement('p');
    note.className = 'muted spacious';
    note.textContent = sec.note || 'Scan the QR code to join instantly.';
    left.appendChild(note);
  } else {
    // fallback: raw HTML text with markdown links
    left.innerHTML = paragraphHTML(sec.content || '');
  }

  wrap.appendChild(left);

  // QR
  const right = document.createElement('div'); right.className = 'wifi-qr';
  const qrSrc = buildWifiQR({
    ssid: sec.ssid, password: sec.password, auth: sec.auth || 'WPA',
    size: 260, fallbackSrc: sec.qr
  });
  if (qrSrc) {
    right.innerHTML = `<img id="wifi-qr" src="${qrSrc}" alt="Wi-Fi QR code">`;
    wrap.appendChild(right);
  }

  return wrap;
}

/* ---------- Loader ---------- */
async function loadGuest(langOpt){
  const lang = (langOpt || localStorage.getItem('lang') || GUEST_DEFAULT_LANG).toLowerCase();
  const fall = GUEST_DEFAULT_LANG;
  const urls = [
    `/content/guest/${lang}.json`,
    lang !== fall ? `/content/guest/${fall}.json` : null
  ].filter(Boolean);

  let data = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: 'no-store' });
      if (res.ok) { data = await res.json(); break; }
    } catch (e) { console.warn('[guest] fetch error', u, e); }
  }
  if (!data) return;

  // HERO
  if (data.page_title) document.title = data.page_title;
  const h1 = document.getElementById('guest-h1');
  const sub = document.getElementById('guest-sub');
  if (h1 && data.hero_h) h1.textContent = data.hero_h;
  if (sub && data.hero_p) sub.textContent = data.hero_p;

  // GRID target
  const grid = document.getElementById('guest-sections');
  if (!grid) return;
  grid.innerHTML = '';

  // RENDER sections
  (data.sections || []).forEach(sec => {
    const card = document.createElement('div');
    card.className = 'info-section';

    // Optional anchor id for quickbar: e.g. "parking", "bins", "emergency"
    if (sec.id && typeof sec.id === 'string') {
      card.id = sec.id.trim();
    }

    const h3 = document.createElement('h3');
    h3.textContent = sec.title || '';
    card.appendChild(h3);

    // Types:
    // - "wifi" or { type:"html", html_kind:"wifi", ssid,password,qr? }
    // - "list" with items
    // - "html" with content (markdown links)
    // - "text" with content
    const t = (sec.type || sec.html_kind || '').toLowerCase();

    if (t === 'wifi' || sec.html_kind === 'wifi') {
      card.appendChild(renderWifiBlock(sec));
    } else if (t === 'list') {
      card.appendChild(makeUL(sec.items || []));
    } else if (t === 'html') {
      const div = document.createElement('div');
      div.innerHTML = paragraphHTML(sec.content || '');
      card.appendChild(div);
    } else if (t === 'text' || !t) {
      const p = document.createElement('p');
      p.textContent = String(sec.content || '');
      card.appendChild(p);
    }

    grid.appendChild(card);
  });
}

// global & init
window.loadGuest = loadGuest;
document.addEventListener('DOMContentLoaded', () => loadGuest());
