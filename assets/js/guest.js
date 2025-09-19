// /assets/js/guest.js
const GUEST_DEFAULT_LANG = 'en';

function link(href, text){
  const a = document.createElement('a');
  a.href = href; a.textContent = text || href; a.target = '_blank'; a.rel = 'noopener';
  return a;
}
function ulFromMarkdownLinks(lines){
  // lines su stringovi tipa "Ganeum – [Map](https://...)"
  const ul = document.createElement('ul');
  lines.forEach(s=>{
    const li = document.createElement('li');
    // jednostavan parser za [Text](URL)
    li.innerHTML = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    ul.appendChild(li);
  });
  return ul;
}

async function loadGuestUnified(langOpt){
  const lang = (langOpt || localStorage.getItem('lang') || GUEST_DEFAULT_LANG).toLowerCase();
  const bust = `v=${Math.floor(Date.now()/60000)}`; // cache-bust ~1min
  const tryUrls = [
    `/content/guest/${lang}.json?${bust}`,
    `/content/guest/en.json?${bust}`
  ];

  let data = null;
  for (const url of tryUrls){
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok){ data = await res.json(); break; }
    }catch(e){ console.warn('[guest] fetch error', e); }
  }
  if (!data){ console.warn('[guest] missing JSON'); return; }

  // HERO
  document.title = data.page_title || 'Guest & Local Information — Aura Adriatica';
  if (data.hero_title) document.getElementById('guest-h1').textContent = data.hero_title;
  if (data.hero_sub)   document.getElementById('guest-sub').textContent = data.hero_sub;

  // ======= GENERAL =======
  const addrBox = document.getElementById('addresses'); addrBox.innerHTML='';
  if (data.sections?.addresses){
    const s = data.sections.addresses;
    if (Array.isArray(s.items)) addrBox.appendChild(ulFromMarkdownLinks(s.items));
    if (s.note){ const p=document.createElement('p'); p.textContent=s.note; addrBox.appendChild(p); }
  }

  const parking = document.getElementById('parking'); parking.innerHTML='';
  if (data.sections?.parking?.text){ parking.textContent = data.sections.parking.text; }

  const lock = document.getElementById('lock'); lock.innerHTML='';
  if (data.sections?.keys?.text){ lock.textContent = data.sections.keys.text; }

  const wifi = document.getElementById('wifi'); wifi.innerHTML='';
  if (data.sections?.wifi){
    const w = data.sections.wifi;
    const text = document.createElement('div');
    text.className = 'wifi-text';
    text.innerHTML = `Network: <strong>${w.ssid}</strong><br>Password: <strong>${w.password}</strong>${w.note?`<p>${w.note}</p>`:''}`;
    const box = document.createElement('div'); box.className='wifi-flex'; box.appendChild(text);
    if (w.qr){
      const qrWrap = document.createElement('div'); qrWrap.className='wifi-qr';
      const img = document.createElement('img'); img.src = w.qr; img.alt = 'Wi-Fi QR Code';
      qrWrap.appendChild(img); box.appendChild(qrWrap);
    }
    wifi.appendChild(box);
  }

  const waste = document.getElementById('waste'); waste.innerHTML='';
  if (data.sections?.waste?.text){ const p=document.createElement('p'); p.textContent=data.sections.waste.text; waste.appendChild(p); }

  const reg = document.getElementById('registration'); reg.innerHTML='';
  if (data.sections?.registration){
    const r = data.sections.registration;
    const p = document.createElement('p'); p.textContent = r.text || ''; reg.appendChild(p);
    if (r.link) reg.appendChild(link(r.link, 'Guest Registration Form'));
  }

  // ======= LOCAL =======
  const groceries = document.getElementById('groceries'); groceries.innerHTML='';
  if (data.sections?.groceries?.items){ groceries.appendChild(ulFromMarkdownLinks(data.sections.groceries.items)); }

  const restaurants = document.getElementById('restaurants'); restaurants.innerHTML='';
  if (data.sections?.restaurants?.items){ restaurants.appendChild(ulFromMarkdownLinks(data.sections.restaurants.items)); }

  const beaches = document.getElementById('beaches'); beaches.innerHTML='';
  if (data.sections?.beaches?.items){ beaches.appendChild(ulFromMarkdownLinks(data.sections.beaches.items)); }

  const market = document.getElementById('market'); market.innerHTML='';
  if (data.sections?.market?.text){
    market.innerHTML = data.sections.market.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  const tourist = document.getElementById('tourist'); tourist.innerHTML='';
  if (data.sections?.tourist?.text){
    tourist.innerHTML = data.sections.tourist.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  if (data.footer_note){
    const foot = document.getElementById('footer_note');
    if (foot) foot.textContent = data.footer_note;
  }
}

window.loadGuestUnified = loadGuestUnified;
document.addEventListener('DOMContentLoaded', ()=> loadGuestUnified());
