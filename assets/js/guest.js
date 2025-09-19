const GUEST_DEFAULT_LANG = "en";

// === HELPERI ===
function listItemHTML(raw) {
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\s—\s*(https?:\/\/\S+)/g,
    ' — <a href="$1" target="_blank" rel="noopener">Map</a>');
  return s;
}

function paragraphHTML(raw) {
  let s = String(raw);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>');
  return s;
}

function ul(items) {
  const ul = document.createElement("ul");
  (items || []).forEach(item => {
    const li = document.createElement("li");
    if (item && typeof item === "object" && item.name) {
      li.textContent = item.name + (item.url ? " — " : "");
      if (item.url) {
        const a = document.createElement("a");
        a.href = item.url; a.textContent = "Map";
        a.target = "_blank"; a.rel = "noopener";
        li.appendChild(a);
      }
    } else {
      li.innerHTML = listItemHTML(item);
    }
    ul.appendChild(li);
  });
  return ul;
}

// === LOADER ===
async function loadGuest(langOpt){
  const lang = (langOpt || localStorage.getItem("lang") || GUEST_DEFAULT_LANG).toLowerCase();
  const fall = GUEST_DEFAULT_LANG;

  const tryUrls = [
    `/content/guest/${lang}.json`,
    lang !== fall ? `/content/guest/${fall}.json` : null
  ].filter(Boolean);

  let data=null;
  for (const url of tryUrls){
    try{
      const res=await fetch(url,{cache:"no-store"});
      if(res.ok){ data=await res.json(); break; }
    }catch(e){ console.warn("[guest] fetch error", e); }
  }
  if(!data){ console.warn("[guest] no data"); return; }

  // hero texts
  const h=document.querySelector("h1[data-i18n='hero_h']");
  if(h) h.textContent=data.hero_h;
  const p=document.querySelector("p[data-i18n='hero_p']");
  if(p) p.textContent=data.hero_p;

  const cont=document.getElementById("guest-sections");
  cont.innerHTML="";

  data.sections.forEach(sec=>{
    const box=document.createElement("div");
    box.className="info-section";
    const h2=document.createElement("h2");
    h2.textContent=sec.title;
    box.appendChild(h2);

    if(sec.type==="list") box.appendChild(ul(sec.items));
    else if(sec.type==="html") {
      const div=document.createElement("div");
      div.innerHTML=paragraphHTML(sec.content);
      box.appendChild(div);
    }
    cont.appendChild(box);
  });
}

window.loadGuest=loadGuest;

document.addEventListener("DOMContentLoaded", ()=>{
  loadGuest();
  document.querySelectorAll(".lang-menu button[data-lang]").forEach(btn=>{
    btn.addEventListener("click",async()=>{
      localStorage.setItem("lang",btn.dataset.lang);
      await loadGuest(btn.dataset.lang);
    });
  });
});
