// /assets/js/guest.js (unified guest info loader)
const GUEST_DEFAULT_LANG = 'en';

// helper: create <a> link
function link(href, text){
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text || href;
  a.target = '_blank';
  a.rel = 'noopener';
  return a;
}

// helper: create <ul>
function ul(items){
  const u = document.createElement('ul');
  u.className = 'list-tight';
  items.forEach(it => {
    const li = document.createElement('li');
    li.appendChild(it);
    u.appendChild(li);
  });
  return u;
}

async function loadGuestUnified(langOpt){
  const lang = (langOpt || localStorage.getItem('lang') || GUEST_DEFAULT_LANG).toLowerCase();
  const tryUrls = [
    `/content/guest/${lang}.json`,
    `/content/guest/en.json`
  ];

  let data = null, used = null;
  for (const url of tryUrls){
    try{
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok){ data = await res.json(); used=url; break; }
    }catch(e){ console.warn('[guest] fetch err', e); }
  }
  if(!data){ console.warn('[guest] missing JSON'); return; }
  console.log('[guest] loaded', used);

  // HEADERS
  document.title = data.page_title || 'Guest & Local Information — Aura Adriatica';
  document.getElementById('guest-h1').textContent = data.h1 || 'Guest & Local Information';
  document.getElementById('guest-sub').textContent = data.sub || 'Private info for your upcoming stay. Please keep this link private.';

  const L = data.labels || {};
  const set = (id, def) => {
    const el=document.getElementById(id);
    if(el) el.textContent = L[id] || def;
  };

  // section headers
  set('general_h', 'Guest Information');
  set('addresses_h', 'Apartment Addresses');
  set('parking_h', 'Parking');
  set('lock_h', 'Secure Digital Key');
  set('wifi_h', 'Wi-Fi');
  set('waste_h', 'Waste & Recycling');
  set('times_h', 'Check-in & Check-out');
  set('local_h', 'Local Information');
  set('registration_h', 'Guest Registration');
  set('groceries_h', 'Grocery Stores');
  set('market_h', 'Food Market');
  set('delicacies_h', 'Local Delicacies');
  set('restaurants_h', 'Recommended Restaurants');
  set('beaches_h', 'Nearby Beaches');
  set('tourist_h', 'Tourist Info');

  // GENERAL
  const addr = document.getElementById('addresses'); addr.innerHTML='';
  if (data.general?.addresses?.length){
    const items = data.general.addresses.map(it => {
      const frag = document.createDocumentFragment();
      const strong = document.createElement('strong');
      strong.textContent = (it.label || '') + ': ';
      frag.appendChild(strong);
      if (it.maps) frag.appendChild(link(it.maps, it.text || it.maps));
      else frag.appendChild(document.createTextNode(it.text || ''));
      return frag;
    });
    addr.appendChild(ul(items));
    if (data.general.address_note){
      const p = document.createElement('p');
      p.textContent = data.general.address_note;
      addr.appendChild(p);
    }
  }

  const parking = document.getElementById('parking'); parking.innerHTML='';
  if (data.general?.parking){ const p=document.createElement('p'); p.textContent=data.general.parking; parking.appendChild(p); }

  const lock = document.getElementById('lock'); lock.innerHTML='';
  if (data.general?.lock){ const p=document.createElement('p'); p.textContent=data.general.lock; lock.appendChild(p); }

  const wifi = document.getElementById('wifi'); wifi.innerHTML='';
  if (data.general?.wifi){
    const p=document.createElement('p');
    p.innerHTML = `SSID: <strong>${data.general.wifi.ssid}</strong> · Password: <strong>${data.general.wifi.password}</strong>`;
    wifi.appendChild(p);
    if (data.general.wifi.qr){
      const img=document.createElement('img');
      img.src=data.general.wifi.qr;
      img.alt='Wi-Fi QR';
      img.className='qr';
      wifi.appendChild(img);
    }
  }

  const waste = document.getElementById('waste'); waste.innerHTML='';
  if (data.general?.waste?.length){
    data.general.waste.forEach(t => { const p=document.createElement('p'); p.textContent=t; waste.appendChild(p); });
  }

  const times = document.getElementById('times'); times.innerHTML='';
  if (data.general?.times){ const p=document.createElement('p'); p.textContent=data.general.times; times.appendChild(p); }

  // LOCAL
  const reg = document.getElementById('registration'); reg.innerHTML='';
  if (data.local?.registration){
    const p=document.createElement('p'); p.textContent=data.local.registration.text || ''; reg.appendChild(p);
    if (data.local.registration.url){
      reg.appendChild(link(data.local.registration.url, data.local.registration.label || data.local.registration.url));
    }
  }

  const groceries = document.getElementById('groceries'); groceries.innerHTML='';
  if (data.local?.groceries?.length){
    const items = data.local.groceries.map(g => {
      const frag = document.createDocumentFragment();
      frag.appendChild(document.createTextNode(g.name || ''));
      if (g.map) { frag.appendChild(document.createTextNode(' – ')); frag.appendChild(link(g.map, 'Map')); }
      return frag;
    });
    groceries.appendChild(ul(items));
  }

  const market = document.getElementById('market'); market.innerHTML='';
  if (data.local?.market){
    const p=document.createElement('p');
    if (data.local.market.map) { p.appendChild(link(data.local.market.map, data.local.market.name || 'Market on map')); }
    else { p.textContent = data.local.market.name || ''; }
    market.appendChild(p);
  }

  const delic = document.getElementById('delicacies'); delic.innerHTML='';
  if (data.local?.delicacies?.length){
    const items = data.local.delicacies.map(d => {
      const frag=document.createDocumentFragment();
      frag.appendChild(document.createTextNode(d.name || ''));
      if (d.map) { frag.appendChild(document.createTextNode(' – ')); frag.appendChild(link(d.map, 'Map')); }
      return frag;
    });
    delic.appendChild(ul(items));
  }

  const rests = document.getElementById('restaurants'); rests.innerHTML='';
  if (data.local?.restaurants?.length){
    const items = data.local.restaurants.map(r => {
      const frag=document.createDocumentFragment();
      frag.appendChild(document.createTextNode(r.name || ''));
      if (r.map) { frag.appendChild(document.createTextNode(' – ')); frag.appendChild(link(r.map, 'Map')); }
      return frag;
    });
    rests.appendChild(ul(items));
  }

  const beaches = document.getElementById('beaches'); beaches.innerHTML='';
  if (data.local?.beaches?.length){
    const items = data.local.beaches.map(b => {
      const frag=document.createDocumentFragment();
      frag.appendChild(document.createTextNode(b.name || ''));
      if (b.map) { frag.appendChild(document.createTextNode(' – ')); frag.appendChild(link(b.map, 'Map')); }
      return frag;
    });
    beaches.appendChild(ul(items));
  }

  const tourist = document.getElementById('tourist'); tourist.innerHTML='';
  if (data.local?.tourist_info){
    const p=document.createElement('p'); p.textContent=data.local.tourist_info.text || ''; tourist.appendChild(p);
    if (data.local.tourist_info.url){
      tourist.appendChild(link(data.local.tourist_info.url, data.local.tourist_info.url));
    }
  }

  // FOOTER
  const foot = document.getElementById('footer_note');
  if (foot) foot.textContent = data.footer_note || '';
}

window.loadGuestUnified = loadGuestUnified;

// auto-init
document.addEventListener('DOMContentLoaded', ()=>{
  loadGuestUnified();
});
