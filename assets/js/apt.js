// /assets/js/apt.js
const APT_DEFAULT_LANG = "en";

/** 1) URL-ovi Zoho formi po apartmanu i jeziku (dodaj kasnije nove jezike/linkove) */
const FORM_URLS = {
  olive: {
    en: "https://forms.zohopublic.eu/infoauraad1/form/OliveInquiryEN/formperma/OP0PWusRcluUMbh63Zwmo7xAM_s-34dDij1RecmrvVs",
    hr: null,
    de: null,
    it: null,
  },
  onyx: {
    en: "https://forms.zohopublic.eu/infoauraad1/form/OnyxInquiryEN/formperma/gby9DTk-97zjC8ZYsI9urf8dfperqQ7IclFsn_ZikDQ",
    hr: null,
    de: null,
    it: null,
  }
};

async function loadApartment(slug, langOpt){
  const lang = (langOpt || localStorage.getItem("lang") || APT_DEFAULT_LANG).toLowerCase();
  const fall = APT_DEFAULT_LANG;

  const tryUrls = [
    `/content/apartments/${slug}/${lang}.json`,
    lang !== fall ? `/content/apartments/${slug}/${fall}.json` : null
  ].filter(Boolean);

  let data = null, usedUrl = null;
  for (const url of tryUrls){
    try{
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok){
        data = await res.json();
        usedUrl = url;
        break;
      } else {
        console.warn(`[apt] ${res.status} for ${url}`);
      }
    }catch(e){
      console.warn(`[apt] fetch error for ${url}`, e);
    }
  }
  if(!data){ console.warn(`[apt] Missing JSON for ${slug}/${lang}`); return; }
  console.log(`[apt] Loaded ${usedUrl}`);

  // <title> + meta description
  if (data.page_title) document.title = data.page_title;
  if (data.meta_desc){
    let m = document.querySelector('meta[name="description"]');
    if (!m){ m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
    m.setAttribute('content', data.meta_desc);
  }

  // HERO override (ako JSON ima naslove)
  const h1 = document.querySelector("h1[data-i18n]");
  if (h1 && (data.title || data.olive_h || data.onyx_h)) {
    h1.textContent = data.title || data.olive_h || data.onyx_h;
  }
  const heroIntro = document.querySelector("[data-i18n='olive_intro'], [data-i18n='onyx_intro']");
  if (heroIntro && (data.intro || data.olive_intro || data.onyx_intro)) {
    heroIntro.textContent = data.intro || data.olive_intro || data.onyx_intro;
  }

  // ---------- DESCRIPTION ----------
  const descEl = document.getElementById("apt-desc");
  if (descEl){
    descEl.innerHTML = "";

    let paragraphs = [];
    if (Array.isArray(data.description)) {
      paragraphs = data.description;
    } else if (typeof data.description === "string") {
      paragraphs = data.description.split(/\n\s*\n/);
    } else if (Array.isArray(data.desc)) {
      paragraphs = data.desc;
    } else {
      const descKeys = Object.keys(data)
        .filter(k => /^desc_p\d+$/i.test(k))
        .sort((a,b) => parseInt(a.replace(/\D/g,""),10) - parseInt(b.replace(/\D/g,""),10));
      if (descKeys.length){
        paragraphs = descKeys.map(k => data[k]);
      } else if (data.desc_p) {
        paragraphs = [data.desc_p];
      }
    }

    paragraphs
      .filter(p => p != null && String(p).trim() !== "")
      .forEach(p => {
        const el = document.createElement("p");
        el.textContent = String(p).trim();
        descEl.appendChild(el);
      });
  }

  // ---------- HIGHLIGHTS / FEATURES ----------
  const feats = Array.isArray(data.features) ? data.features
               : Array.isArray(data.highlights) ? data.highlights
               : [];
  const list = document.getElementById("apt-highlights");
  if (list){
    list.innerHTML = "";
    feats.forEach(f=>{
      const li = document.createElement("li");
      li.textContent = f;
      list.appendChild(li);
    });
  }

  // ---------- GALLERY ----------
  const gal = document.getElementById("apt-gallery");
  if (gal){
    gal.innerHTML = "";
    if (Array.isArray(data.gallery)){
      data.gallery.forEach((src, i)=>{
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${(data.title || data.olive_h || data.onyx_h || slug)} photo ${i+1}`;
        gal.appendChild(img);
      });
    }
  }

  // ---------- INQUIRY FORM (preferirano) ----------
  const formRendered = renderInquiryForm(slug, lang);

  // ---------- (Opcionalni) FALLBACK NA KALENDAR ----------
  // Ako ne postoji forma ni na default jeziku, a JSON ima "calendar" i u HTML-u postoji stari kalendar markup,
  // možeš vratiti prikaz kalendara (ili ga skroz preskočiti, po želji).
  if (!formRendered) {
    const wrap = document.getElementById("apt-calendar-wrap");
    const iframe = document.getElementById("apt-calendar");
    if (iframe && data.calendar){
      iframe.src = data.calendar;
      if (wrap) wrap.style.display = "";
    } else if (wrap) {
      wrap.style.display = "none";
      if (iframe) iframe.removeAttribute("src");
    }
  }
}

/** Render Zoho formu prema jeziku; vraća true ako je forma prikazana */
function renderInquiryForm(slug, lang){
  const container = document.getElementById('apt-inquiry');
  if(!container) return false;

  const urls = FORM_URLS[slug] || {};
  const src  = urls[lang] || urls[APT_DEFAULT_LANG] || null;

  container.innerHTML = "";
  if (!src){
    // nema forme – vrati false da fallback (kalendar) odluči što dalje
    return false;
  }

  const iframe = document.createElement("iframe");
  iframe.title = `${slug.charAt(0).toUpperCase()+slug.slice(1)} Inquiry`;
  iframe.setAttribute("aria-label", iframe.title);
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.height = "740px"; // fiksna visina
  iframe.style.border = "none";
  iframe.src = src;

  container.appendChild(iframe);

  // NoScript fallback link
  const ns = document.createElement("div");
  ns.innerHTML = `<noscript><p><a href="${src}" target="_blank" rel="noopener">Open inquiry form</a></p></noscript>`;
  container.appendChild(ns);

  return true;
}

// izvoz funkcije
window.loadApartment = loadApartment;

// auto init po slug-u na <body>
document.addEventListener("DOMContentLoaded", ()=>{
  const slug = document.body?.getAttribute("data-apt-slug");
  const lang = (localStorage.getItem("lang") || APT_DEFAULT_LANG).toLowerCase();
  if (slug) loadApartment(slug, lang);
});
