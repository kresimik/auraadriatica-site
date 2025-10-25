// /assets/js/guest.js  (clean-3)

const GUEST_DEFAULT_LANG = 'en';

/* ---------- Link helpers ---------- */
function listItemHTML(raw) {
  if (raw == null) return '';
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g,
    ' — <a href="$1" target="_blank" rel="noopener">Map</a>');
  return s;
}
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
  if (fallbackSrc) return fallbackSrc;
  if (!ssid || !password) return null;
  const payload = `WIFI:T:${auth};S:${ssid};P:${password};;`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
function renderWifiBlock(sec) {
  const wrap = document.createElement('div');
  wrap.className = 'wifi-flex';

  const left = document.createElement('div');
  left.className = 'wifi-text';

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
    left.appendChild(p1); left.appendChild(p2);

    const note = document.createElement('p'); note.className = 'muted spacious';
    note.textContent = sec.note || 'Scan the QR code to join instantly.';
    left.appendChild(note);
  } else {
    left.innerHTML = paragraphHTML(sec.content || '');
  }

  wrap.appendChild(left);

  const right = document.createElement('div'); right.className = 'wifi-qr';
  const qrSrc = buildWifiQR({
    ssid: sec.ssid, password: sec.password, auth: sec.auth || 'WPA',
    size: 260, fallbackSrc: sec.qr
  });
  if (qrSrc) right.innerHTML = `<img id="wifi-qr" src="${qrSrc}" alt="Wi-Fi QR code">`;
  if (qrSrc) wrap.appendChild(right);

  return wrap;
}

/* ---------- Quickbar ---------- */
function renderQuickbar(sections, el) {
  if (!el) return;
  el.innerHTML = '';
  const links = (sections || [])
    .filter(s => s && typeof s.id === 'string' && s.id.trim() && s.title)
    .map(s => ({ id: s.id.trim(), title: s.title }));
  if (!links.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  links.forEach(({ id, title }) => {
    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = title;
    el.appendChild(a);
  });
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

  // QUICKBAR
  renderQuickbar(data.sections || [], document.getElementById('guest-quickbar'));

  // GRID
  const grid = document.getElementById('guest-sections');
  if (!grid) return;
  grid.innerHTML = '';

  (data.sections || []).forEach(sec => {
    const card = document.createElement('div');
    card.className = 'info-section';
    if (sec.id && typeof sec.id === 'string') card.id = sec.id.trim();

    const h3 = document.createElement('h3');
    h3.textContent = sec.title || '';
    card.appendChild(h3);

    const t = (sec.type || sec.html_kind || '').toLowerCase();
    if (t === 'wifi' || sec.html_kind === 'wifi') {
      card.appendChild(renderWifiBlock(sec));
    } else if (t === 'list') {
      card.appendChild(makeUL(sec.items || []));
    } else if (t === 'html') {
      const div = document.createElement('div');
      div.innerHTML = paragraphHTML(sec.content || '');
      card.appendChild(div);
    } else {
      const p = document.createElement('p');
      p.textContent = String(sec.content || '');
      card.appendChild(p);
    }

    grid.appendChild(card);
  });
}

/* ---------- Copy buttons (delegation) ---------- */
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.copy-btn[data-copy]');
  if (!btn) return;
  const sel = btn.getAttribute('data-copy');
  const el = document.querySelector(sel);
  if (!el) return;
  const val = el.textContent || '';
  navigator.clipboard?.writeText(val).then(()=>{
    const old = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(()=>{ btn.textContent = old; }, 1000);
  });
});

// global & init
window.loadGuest = loadGuest;
document.addEventListener('DOMContentLoaded', () => loadGuest());
