// /assets/js/guest.js
const GUEST_DEFAULT_LANG = 'en';

// helper: napravi <ul> iz polja stringova
function ul(list) {
  const ul = document.createElement('ul');
  list.forEach(item => {
    const li = document.createElement('li');
    // pretvori "— URL" u link, ili [Text](URL)
    li.innerHTML = String(item)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/—\s*(https?:\/\/\S+)/g, '— <a href="$1" target="_blank" rel="noopener">Map</a>');
    ul.appendChild(li);
  });
  return ul;
}

// cache-buster (minutni) da probije CDN/browser cache
function bustUrl(url) {
  const v = Math.floor(Date.now() / 60000);
  return url + (url.includes('?') ? '&' : '?') + 'v=' + v;
}

async function loadGuestUnified(langOpt) {
  const lang = (langOpt || localStorage.getItem('lang') || GUEST_DEFAULT_LANG).toLowerCase();

  // probaj traženi jezik → fallback EN
  const urls = [
    bustUrl(`/content/guest/${lang}.json`),
    bustUrl(`/content/guest/en.json`)
  ];

  let data = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { cache: 'no-store' });
      if (res.ok) { data = await res.json(); break; }
    } catch (e) {
      console.warn('[guest] fetch error for', u, e);
    }
  }
  if (!data) return;

  // HERO tekst (iz JSON-a)
  if (data.guest_h1) {
    const h1 = document.getElementById('guest-h1');
    if (h1) h1.textContent = data.guest_h1;
  }
  if (data.guest_sub) {
    const sub = document.getElementById('guest-sub');
    if (sub) sub.textContent = data.guest_sub;
  }

  // ====== PUNJENJE SEKCIJA ======
  // Addresses
  const elAddr = document.getElementById('addresses');
  if (elAddr) {
    elAddr.innerHTML = '';
    if (Array.isArray(data.addresses)) elAddr.appendChild(ul(data.addresses));
  }

  // Parking
  const elParking = document.getElementById('parking');
  if (elParking) {
    elParking.innerHTML = '';
    if (data.parking) {
      const p = document.createElement('p');
      p.textContent = data.parking;
      elParking.appendChild(p);
    }
  }

  // Digital key / Lock
  const elLock = document.getElementById('lock');
  if (elLock) {
    elLock.innerHTML = '';
    if (data.lock) {
      const p = document.createElement('p');
      p.textContent = data.lock;
      elLock.appendChild(p);
    }
  }

  // Wi-Fi
  const elWifi = document.getElementById('wifi');
  if (elWifi) {
    elWifi.innerHTML = '';
    if (data.wifi && (data.wifi.text || data.wifi.qr)) {
      const box = document.createElement('div');
      box.className = 'wifi-flex';

      const txt = document.createElement('div');
      txt.className = 'wifi-text';
      txt.innerHTML = data.wifi.text
        ? data.wifi.text.replace(/\n/g, '<br>')
        : '';
      box.appendChild(txt);

      if (data.wifi.qr) {
        const qr = document.createElement('div');
        qr.className = 'wifi-qr';
        const img = document.createElement('img');
        img.src = data.wifi.qr;
        img.alt = 'Wi-Fi QR';
        qr.appendChild(img);
        box.appendChild(qr);
      }
      elWifi.appendChild(box);
    }
  }

  // Registration (može biti plain tekst sa linkom)
  const elReg = document.getElementById('registration');
  if (elReg) {
    elReg.innerHTML = '';
    if (data.registration) {
      const p = document.createElement('p');
      p.innerHTML = String(data.registration)
        .replace(/\b(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
      elReg.appendChild(p);
    }
  }

  // Waste
  const elWaste = document.getElementById('waste');
  if (elWaste) {
    elWaste.innerHTML = '';
    if (data.waste) {
      const p = document.createElement('p');
      p.textContent = data.waste;
      elWaste.appendChild(p);
    }
  }

  // Groceries
  const elGro = document.getElementById('groceries');
  if (elGro) {
    elGro.innerHTML = '';
    if (Array.isArray(data.groceries)) elGro.appendChild(ul(data.groceries));
  }

  // Restaurants
  const elRest = document.getElementById('restaurants');
  if (elRest) {
    elRest.innerHTML = '';
    if (Array.isArray(data.restaurants)) elRest.appendChild(ul(data.restaurants));
  }

  // Beaches
  const elBea = document.getElementById('beaches');
  if (elBea) {
    elBea.innerHTML = '';
    if (Array.isArray(data.beaches)) elBea.appendChild(ul(data.beaches));
  }

  // Market & Tourist
  const elMarket = document.getElementById('market');
  if (elMarket) {
    elMarket.innerHTML = '';
    if (data.market) {
      elMarket.innerHTML = String(data.market)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\b(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }
  }
  const elTour = document.getElementById('tourist');
  if (elTour) {
    elTour.innerHTML = '';
    if (data.tourist) {
      elTour.innerHTML = String(data.tourist)
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\b(https?:\/\/\S+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    }
  }

  // Footer note (iz JSON-a ili ostavi i18n default)
  const foot = document.getElementById('footer_note');
  if (foot && data.footer_note) foot.textContent = data.footer_note;
}

// init
window.loadGuestUnified = loadGuestUnified;
document.addEventListener('DOMContentLoaded', () => loadGuestUnified());
