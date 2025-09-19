// guest.js (final2)

const GUEST_DEFAULT_LANG = 'en';

/* ---------- Link helpers ---------- */

// For LIST items: supports Markdown [Text](URL) and " — URL" -> " — Map".
// Does NOT auto-link bare URLs.
function listItemHTML(raw) {
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g,
    ' — <a href="$1" target="_blank" rel="noopener">Map</a>');
  return s;
}

// For PARAGRAPHS: Markdown ONLY (no autolink of bare URLs).
// This avoids the broken "target=_blank rel=noopener" text you saw.
function paragraphHTML(raw) {
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

  // Hero
  if (data.page_title) document.title = data.page_title;
  const h1 = document.getElementById('guest-h1');
  const sub = document.getElementById('guest-sub');
  if (h1 && data.hero_h) h1.textContent = data.hero_h;
  if (sub && data.hero_p) sub.textContent = data.hero_p;

  // Sections
  const grid = document.getElementById('guest-sections');
  grid.innerHTML = '';
  (data.sections || []).forEach(sec => {
    const card = document.createElement('div');
    card.className = 'info-section';

    const h3 = document.createElement('h3');
    h3.textContent = sec.title || '';
    card.appendChild(h3);

    if (sec.type === 'list') {
      card.appendChild(makeUL(sec.items || []));
    } else if (sec.type === 'html') {
      if (sec.html_kind === 'wifi') {
        const wrap = document.createElement('div'); wrap.className = 'wifi-flex';
        const left = document.createElement('div'); left.className = 'wifi-text';
        left.innerHTML = paragraphHTML(sec.content || '');
        wrap.appendChild(left);
        if (sec.qr) {
          const right = document.createElement('div'); right.className = 'wifi-qr';
          right.innerHTML = `<img src="${sec.qr}" alt="Wi-Fi QR">`;
          wrap.appendChild(right);
        }
        card.appendChild(wrap);
      } else {
        const div = document.createElement('div');
        div.innerHTML = paragraphHTML(sec.content || '');
        card.appendChild(div);
      }
    } else if (sec.type === 'text') {
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
