// /assets/js/apt.js
const APT_DEFAULT_LANG = "en";

async function loadApartment(slug, langOpt){
  const lang = (langOpt || localStorage.getItem("lang") || APT_DEFAULT_LANG).toLowerCase();
  const fall  = APT_DEFAULT_LANG;

  const tryUrls = [
    `/content/apartments/${slug}/${lang}.json`,
    lang !== fall ? `/content/apartments/${slug}/${fall}.json` : null
  ].filter(Boolean);

  let data = null;
  for (const url of tryUrls){
    try{
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok){ data = await res.json(); break; }
    }catch(_){}
  }
  if(!data){ console.warn(`[apt] Missing JSON for ${slug}/${lang}`); return; }

  // Page <title> + meta description
  if (data.page_title) document.title = data.page_title;
  if (data.meta_desc){
    let m = document.querySelector('meta[name="description"]');
    if (!m){ m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
    m.setAttribute('content', data.meta_desc);
  }

  // Hero override (opcionalno)
  const h1 = document.querySelector("h1[data-i18n]");
  if (h1 && data.title) h1.textContent = data.title;
  const hTitle = document.getElementById("apt-title");
  if (hTitle && data.title) hTitle.textContent = data.title;
  const hIntro = document.getElementById("apt-intro");
  if (hIntro && data.intro) hIntro.textContent = data.intro;

  // Description — podupri array ili string (+ fallback na intro)
  const descEl = document.getElementById("apt-desc");
  if (descEl){
    descEl.innerHTML = "";

    let paragraphs = [];
    if (Array.isArray(data.description)) {
      paragraphs = data.description.filter(s => typeof s === "string" && s.trim());
    } else if (typeof data.description === "string") {
      paragraphs = data.description.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    }

    if (!paragraphs.length && typeof data.intro === "string" && data.intro.trim()){
      paragraphs = [data.intro.trim()];
    }

    paragraphs.forEach(p=>{
      const el = document.createElement("p");
      el.textContent = p;
      descEl.appendChild(el);
    });
  }

  // Highlights
  const list = document.getElementById("apt-highlights");
  if (list){
    list.innerHTML = "";
    if (Array.isArray(data.features)){
      data.features.forEach(f=>{
        const li = document.createElement("li");
        li.textContent = f;
        list.appendChild(li);
      });
    }
  }

  // Gallery
  const gal = document.getElementById("apt-gallery");
  if (gal){
    gal.innerHTML = "";
    if (Array.isArray(data.gallery)){
      data.gallery.forEach((src, i)=>{
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${data.title || slug} photo ${i+1}`;
        gal.appendChild(img);
      });
    }
  }

  // Calendar
  const wrap = document.getElementById("apt-calendar-wrap");
  const iframe = document.getElementById("apt-calendar");
  if (iframe){
    if (data.calendar){
      iframe.src = data.calendar;
      if (wrap) wrap.style.display = "";
    } else {
      if (wrap) wrap.style.display = "none";
      iframe.removeAttribute("src");
    }
  }
}

// expose for language switcher
window.loadApartment = loadApartment;

// auto-init if we find a data-apt-slug marker on the <body>
document.addEventListener("DOMContentLoaded", ()=>{
  const body = document.body;
  const slug = body ? body.getAttribute("data-apt-slug") : null;
  if (slug) loadApartment(slug);
});
