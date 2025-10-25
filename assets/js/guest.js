// /assets/js/guest.js (final-clean)
const GUEST_DEFAULT_LANG = 'en';

function listItemHTML(raw) {
  if (!raw) return '';
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g, ' — <a href="$1" target="_blank" rel="noopener">Map</a>');
  return s;
}
function paragraphHTML(raw) {
  return String(raw||'').replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function makeUL(items){
  const ul=document.createElement('ul');
  (items||[]).forEach(it=>{
    const li=document.createElement('li');
    li.innerHTML=listItemHTML(it);
    ul.appendChild(li);
  });
  return ul;
}

async function loadGuest(langOpt){
  const lang=(langOpt||localStorage.getItem('lang')||GUEST_DEFAULT_LANG).toLowerCase();
  const urls=[`/content/guest/${lang}.json`, `/content/guest/en.json`];
  let data=null;
  for(const u of urls){
    try{const r=await fetch(u,{cache:'no-store'}); if(r.ok){data=await r.json();break;}}catch{}
  }
  if(!data)return;

  if(data.page_title)document.title=data.page_title;
  if(data.hero_h)document.getElementById('guest-h1').textContent=data.hero_h;
  if(data.hero_p)document.getElementById('guest-sub').textContent=data.hero_p;

  const grid=document.getElementById('guest-sections');
  grid.innerHTML='';
  (data.sections||[]).forEach(sec=>{
    const card=document.createElement('div');
    card.className='info-section';
    const h3=document.createElement('h3'); h3.textContent=sec.title||''; card.appendChild(h3);

    if(sec.type==='list'){ card.appendChild(makeUL(sec.items)); }
    else if(sec.html_kind==='wifi'){
      const div=document.createElement('div'); div.className='wifi-flex';
      div.innerHTML=paragraphHTML(sec.content||'');
      if(sec.qr){
        const qr=document.createElement('div'); qr.className='wifi-qr';
        qr.innerHTML=`<img src="${sec.qr}" alt="Wi-Fi QR code">`;
        div.appendChild(qr);
      }
      card.appendChild(div);
    }
    else if(sec.type==='html'){
      const d=document.createElement('div'); d.innerHTML=paragraphHTML(sec.content||''); card.appendChild(d);
    }
    else{
      const p=document.createElement('p'); p.textContent=sec.content||''; card.appendChild(p);
    }

    grid.appendChild(card);
  });
}

window.loadGuest=loadGuest;
document.addEventListener('DOMContentLoaded',()=>loadGuest());
