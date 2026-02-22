// /assets/js/guest.js
const GUEST_DEFAULT_LANG = 'en';

// Icons per section title keyword
const ICONS = {
  'address':    '📍',
  'parking':    '🚗',
  'key':        '🔑',
  'wi-fi':      '📶',
  'wifi':       '📶',
  'registr':    '📋',
  'waste':      '🗑️',
  'groceri':    '🛒',
  'restaurant': '🍽️',
  'beach':      '🏖️',
  'market':     '🌿',
  'food':       '🌿',
  'tourist':    '🗺️',
};

function getIcon(title) {
  const t = (title || '').toLowerCase();
  for (const [key, icon] of Object.entries(ICONS)) {
    if (t.includes(key)) return icon;
  }
  return '✦';
}

function linkify(raw) {
  if (!raw) return '';
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g,
    ' — <a href="$1" target="_blank" rel="noopener">Map</a>');
  return s;
}

function makeCard(sec) {
  const card = document.createElement('div');
  card.className = 'guest-card';

  // Wide card for restaurants (long list)
  const titleLower = (sec.title || '').toLowerCase();
  if (titleLower.includes('restaurant') || titleLower.includes('beach')) {
    card.classList.add('guest-card--wide');
  }

  // Icon
  const icon = document.createElement('span');
  icon.className = 'guest-card__icon';
  icon.textContent = getIcon(sec.title);
  card.appendChild(icon);

  // Title
  const h3 = document.createElement('h3');
  h3.className = 'guest-card__title';
  h3.textContent = sec.title || '';
  card.appendChild(h3);

  // Content
  if (sec.type === 'list') {
    const ul = document.createElement('ul');
    (sec.items || []).forEach(it => {
      const li = document.createElement('li');
      li.innerHTML = linkify(it);
      ul.appendChild(li);
    });
    card.appendChild(ul);

  } else if (sec.html_kind === 'wifi') {
    const flex = document.createElement('div');
    flex.className = 'wifi-flex';

    const textDiv = document.createElement('div');
    textDiv.className = 'wifi-text';
    textDiv.innerHTML = `<p>${linkify(sec.content || '')}</p>`;
    flex.appendChild(textDiv);

    if (sec.qr) {
      const qrDiv = document.createElement('div');
      qrDiv.className = 'wifi-qr';
      qrDiv.innerHTML = `<img src="${sec.qr}" alt="Wi-Fi QR code" loading="lazy">`;
      flex.appendChild(qrDiv);
    }
    card.appendChild(flex);

  } else if (sec.type === 'html') {
    const d = document.createElement('div');
    d.innerHTML = `<p>${linkify(sec.content || '')}</p>`;
    card.appendChild(d);

  } else {
    const p = document.createElement('p');
    p.textContent = sec.content || '';
    card.appendChild(p);
  }

  return card;
}

async function loadGuest(langOpt) {
  const lang = (langOpt || localStorage.getItem('lang') || GUEST_DEFAULT_LANG).toLowerCase();
  const urls = [`/content/guest/${lang}.json`, `/content/guest/en.json`];
  let data = null;
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (r.ok) { data = await r.json(); break; }
    } catch {}
  }
  if (!data) return;

  if (data.page_title) document.title = data.page_title;
  const h1 = document.getElementById('guest-h1');
  const sub = document.getElementById('guest-sub');
  if (h1 && data.hero_h) h1.innerHTML = data.hero_h;
  if (sub && data.hero_p) sub.textContent = data.hero_p;

  const grid = document.getElementById('guest-sections');
  if (!grid) return;
  grid.innerHTML = '';

  (data.sections || []).forEach(sec => {
    grid.appendChild(makeCard(sec));
  });
}

window.loadGuest = loadGuest;
document.addEventListener('DOMContentLoaded', () => loadGuest());
