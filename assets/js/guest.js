// /assets/js/guest.js
const GUEST_DEFAULT_LANG = 'en';

const WELCOME = {
  hr: 'Drago nam je što ste naši gosti. U nastavku nalazite sve što vam je potrebno za ugodan boravak.',
  en: 'We are delighted to welcome you. Below you will find everything you need for a comfortable and memorable stay.',
  de: 'Herzlich willkommen! Hier finden Sie alle wichtigen Informationen für Ihren Aufenthalt.',
  it: 'Benvenuti! Qui sotto trovate tutte le informazioni utili per il vostro soggiorno.',
  sl: 'Dobrodošli! Spodaj najdete vse informacije za prijetno bivanje.',
  hu: 'Üdvözöljük! Az alábbiakban mindent megtalál a kényelmes tartózkodáshoz.',
  cs: 'Vítejte! Níže najdete vše, co potřebujete pro příjemný pobyt.',
  sk: 'Vitajte! Nižšie nájdete všetko, čo potrebujete pre príjemný pobyt.',
  uk: 'Ласкаво просимо! Нижче ви знайдете всю необхідну інформацію для комфортного перебування.',
};

// Icons matched by keyword across all 9 languages
const ICONS = {
  // Addresses
  'address': '📍', 'adres': '📍', 'adress': '📍', 'indiri': '📍', 'naslov': '📍', 'cím': '📍',
  // Parking
  'parking': '🚗', 'parkirali': '🚗', 'parkplatz': '🚗', 'parcheggio': '🚗', 'parkirišče': '🚗', 'parkovani': '🚗', 'parkovan': '🚗',
  // Key / Safe
  'key': '🔑', 'ključ': '🔑', 'schlüssel': '🔑', 'chiave': '🔑', 'kulcs': '🔑', 'klíč': '🔑', 'kľúč': '🔑', 'ключ': '🔑',
  'safe': '🔒', 'sef': '🔒', 'trezor': '🔒', 'cassaforte': '🔒', 'széf': '🔒', 'сейф': '🔒',
  // WiFi
  'wi-fi': '📶', 'wifi': '📶', 'wlan': '📶',
  // Registration
  'registr': '📋', 'prijava': '📋', 'anmeldung': '📋', 'registraz': '📋', 'vendégreg': '📋', 'реєстр': '📋',
  // Waste
  'waste': '🗑️', 'otpad': '🗑️', 'odpadkov': '🗑️', 'müll': '🗑️', 'rifiut': '🗑️', 'hulladék': '🗑️', 'odpadu': '🗑️', 'сміття': '🗑️',
  // Groceries
  'groceri': '🛒', 'trgovin': '🛒', 'lebensm': '🛒', 'supermercati': '🛒', 'élelmiszer': '🛒', 'potraviny': '🛒', 'продукт': '🛒',
  // Restaurants
  'restaurant': '🍽️', 'restoran': '🍽️', 'ristoranti': '🍽️', 'étterem': '🍽️', 'reštaurácie': '🍽️', 'ресторан': '🍽️',
  // Beaches
  'beach': '🏖️', 'plaž': '🏖️', 'strand': '🏖️', 'spiagge': '🏖️', 'pláže': '🏖️', 'пляж': '🏖️',
  // Market / tourist
  'market': '🌿', 'food': '🌿', 'tržnic': '🌿', 'markt': '🌿', 'mercato': '🌿', 'piac': '🌿', 'trh': '🌿', 'ринок': '🌿', 'tourist': '🗺️', 'turisti': '🗺️',
  // Privacy / cameras
  'camera': '📷', 'kamera': '📷', 'nadzor': '📷', 'überwach': '📷', 'telecamer': '📷', 'видеон': '📷',
  'privacy': '🔐', 'privatnost': '🔐', 'datenschutz': '🔐', 'adatvéd': '🔐', 'soukromí': '🔐', 'súkromi': '🔐', 'zasebnost': '🔐', 'конфід': '🔐',
};

function getIcon(title) {
  const t = (title || '').toLowerCase();
  for (const [key, icon] of Object.entries(ICONS)) {
    if (t.includes(key)) return icon;
  }
  return '✦';
}

function appendLinkified(container, raw) {
  if (!raw) return;
  const s = String(raw);
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|\s—\s*(https?:\/\/\S+)/g;
  let last = 0, m;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) container.appendChild(document.createTextNode(s.slice(last, m.index)));
    if (m[1] !== undefined) {
      const strong = document.createElement('strong');
      strong.textContent = m[1];
      container.appendChild(strong);
    } else if (m[2]) {
      const a = document.createElement('a');
      a.rel = 'noopener';
      if (m[3].startsWith('http')) a.target = '_blank';
      a.textContent = m[2]; a.href = m[3];
      if (m[2].toLowerCase() === 'map') a.className = 'map-link';
      container.appendChild(a);
    } else {
      container.appendChild(document.createTextNode(' \u2014 '));
      const a = document.createElement('a');
      a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'Map'; a.href = m[4];
      a.className = 'map-link';
      container.appendChild(a);
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) container.appendChild(document.createTextNode(s.slice(last)));
}

function makeCard(sec) {
  const card = document.createElement('article');
  card.className = 'guest-card';

  // Wide card — driven by JSON flag, not title keyword matching
  if (sec.wide) {
    card.classList.add('guest-card--wide');
  }
  if (sec.html_kind === 'wifi') card.classList.add('guest-card--highlight');

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
      const span = document.createElement('span');
      appendLinkified(span, it);
      li.appendChild(span);
      ul.appendChild(li);
    });
    card.appendChild(ul);

  } else if (sec.html_kind === 'wifi') {
    const flex = document.createElement('div');
    flex.className = 'wifi-flex';

    const textDiv = document.createElement('div');
    textDiv.className = 'wifi-text';
    const wifiP = document.createElement('p');
    (sec.content || '').split('<br>').forEach((part, i, arr) => {
      appendLinkified(wifiP, part);
      if (i < arr.length - 1) wifiP.appendChild(document.createElement('br'));
    });
    textDiv.appendChild(wifiP);
    flex.appendChild(textDiv);

    if (sec.qr) {
      const qrDiv = document.createElement('div');
      qrDiv.className = 'wifi-qr';
      const img = document.createElement('img');
      img.src = sec.qr;
      img.alt = 'Wi-Fi QR code';
      img.loading = 'lazy';
      qrDiv.appendChild(img);
      flex.appendChild(qrDiv);
    }
    card.appendChild(flex);

  } else if (sec.type === 'html') {
    const d = document.createElement('div');
    const htmlP = document.createElement('p');
    (sec.content || '').split('<br>').forEach((part, i, arr) => {
      appendLinkified(htmlP, part);
      if (i < arr.length - 1) htmlP.appendChild(document.createElement('br'));
    });
    d.appendChild(htmlP);
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
      const r = await fetch(u, { cache: 'default' });
      if (r.ok) { data = await r.json(); break; }
    } catch {}
  }
  if (!data) return;

  if (data.page_title) document.title = data.page_title;
  const h1 = document.getElementById('guest-h1');
  const sub = document.getElementById('guest-sub');
  if (h1 && data.hero_h) h1.textContent = data.hero_h;
  if (sub && data.hero_p) sub.textContent = data.hero_p;

  const grid = document.getElementById('guest-sections');
  if (!grid) return;
  grid.innerHTML = '';

  const welcome = document.createElement('div');
  welcome.className = 'guest-welcome';
  const wP = document.createElement('p');
  wP.textContent = WELCOME[lang] || WELCOME.en;
  welcome.appendChild(wP);
  grid.appendChild(welcome);

  (data.sections || []).forEach(sec => {
    grid.appendChild(makeCard(sec));
  });
}

window.loadGuest = loadGuest;
document.addEventListener('DOMContentLoaded', () => {
  // Wait for i18n.js to set the language first, then load guest content
  const init = () => {
    const lang = localStorage.getItem('lang') || GUEST_DEFAULT_LANG;
    loadGuest(lang);
  };
  // Small delay to ensure i18n.js has initialized
  if (document.documentElement.lang && document.documentElement.lang !== 'en') {
    init();
  } else {
    setTimeout(init, 100);
  }
});
