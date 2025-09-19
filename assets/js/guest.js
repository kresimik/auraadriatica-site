// /assets/js/guest.js
const GUEST_DEFAULT_LANG = 'en';

// link helper za nizove
function asLinkedHTML(raw) {
  let s = String(raw);

  // Markdown [Text](URL)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // " — URL" -> " — Map"
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g, ' — <a href="$1" target="_blank" rel="noopener">Map</a>');

  // Ako postoji URL u stringu, linkaj ga (fallback)
  s = s.replace(/(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  // Ako je spomenut "Google Maps" i postoji barem jedan URL u stringu, zamijeni tekst u link
  s = s.replace(/Google Maps/g, (m) => {
    const urlMatch = s.match(/href="(https?:\/\/[^"]+)"/);
    return urlMatch ? `<a href="${urlMatch[1]}" target="_blank" rel="noopener">${m}</a>` : m;
  });

  return s;
}

function ul(list) {
  const ul = document.createElement('ul');
  (list || []).forEach(item => {
    const li = document.createElement('li');
    li.innerHTML = asLinkedHTML(item);
    ul.appendChild(li);
  });
  return ul;
}

// cache-buster
function bustUrl(url) {
  const v = Math.floor(Date.now() / 60000);
  return url + (url.includes('?') ? '&' : '?') + 'v=' + v;
}

async function loadGuestUnified(langOpt) {
  const lang = (langOpt || localStorage.getItem('lang') || GUEST_DEFAULT_LANG).toLowerCase();

  const urls = [
    bustUrl(`/content/guest/${lang}.json`),
    bustUrl(`/content/guest/en.json`)
  ];

  let data = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: 'no-store' });
      if (res.ok) { data = await res.json(); break; }
    } catch (e) { console.warn('[guest] fetch error', u, e); }
  }
  if (!data) return;

  // --- Naslovi sekcija iz guest JSON-a (umjesto i18n) ---
  const H = (key, sel) => {
    if (!data[key]) return;
    const el = document.querySelector(sel);
    if (el) el.textContent = data[key];
  };
  H('guest_h1',  '#guest-h1');
  H('guest_sub', '#guest-sub');

  H('addr_h',        'h2[data-i18n="addr_h"]');
  H('parking_h',     'h2[data-i18n="parking_h"]');
  H('lock_h',        'h2[data-i18n="lock_h"]');
  H('wifi_h',        'h2[data-i18n="wifi_h"]');
  H('registration_h','h2[data-i18n="registration_h"]');
  H('waste_h',       'h2[data-i18n="waste_h"]');
  H('groceries_h',   'h2[data-i18n="groceries_h"]');
  H('restaurants_h', 'h2[data-i18n="restaurants_h"]');
  H('beaches_h',     'h2[data-i18n="beaches_h"]');
  H('market_h',      'h2[data-i18n="market_h"]');
  if (data.footer_note) { const f = document.getElementById('footer_note'); if (f) f.textContent = data.footer_note; }

  // --- Sadržaj ---
  const setHTML = (id, html) => { const el = document.getElementById(id); if (el) { el.innerHTML = html || ''; } };

  // Addresses
  setHTML('addresses', Array.isArray(data.addresses) ? ul(data.addresses).outerHTML : '');

  // Parking, Lock, Waste -> običan paragraf
  setHTML('parking', data.parking ? `<p>${asLinkedHTML(data.parking)}</p>` : '');
  setHTML('lock',    data.lock    ? `<p>${asLinkedHTML(data.lock)}</p>`     : '');
  setHTML('waste',   data.waste   ? `<p>${asLinkedHTML(data.waste)}</p>`    : '');

  // Wi-Fi blok
  (function(){
    const wrap = document.getElementById('wifi');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!(data.wifi && (data.wifi.text || data.wifi.qr))) return;

    const box = document.createElement('div'); box.className = 'wifi-flex';
    const t = document.createElement('div');  t.className = 'wifi-text';
    t.innerHTML = data.wifi.text ? asLinkedHTML(data.wifi.text).replace(/\n/g,'<br>') : '';
    box.appendChild(t);

    if (data.wifi.qr) {
      const q = document.createElement('div'); q.className = 'wifi-qr';
      q.innerHTML = `<img src="${data.wifi.qr}" alt="Wi-Fi QR">`;
      box.appendChild(q);
    }
    wrap.appendChild(box);
  })();

  // Registration
  setHTML('registration', data.registration ? `<p>${asLinkedHTML(data.registration)}</p>` : '');

  // Groceries / Restaurants / Beaches list
  setHTML('groceries',   Array.isArray(data.groceries)   ? ul(data.groceries).outerHTML   : '');
  setHTML('restaurants', Array.isArray(data.restaurants) ? ul(data.restaurants).outerHTML : '');
  setHTML('beaches',     Array.isArray(data.beaches)     ? ul(data.beaches).outerHTML     : '');

  // Market & Tourist
  setHTML('market',  data.market  ? asLinkedHTML(data.market)  : '');
  setHTML('tourist', data.tourist ? asLinkedHTML(data.tourist) : '');
}

// global + init
window.loadGuestUnified = loadGuestUnified;
document.addEventListener('DOMContentLoaded', () => loadGuestUnified());
