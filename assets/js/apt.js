// /assets/js/apt.js
const APT_DEFAULT_LANG = "en";

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

  // HERO (opcionalni override)
  const h1 = document.querySelector("h1[data-i18n]");
  if (h1 && data.title) h1.textContent = data.title;
  const heroIntro = document.querySelector("[data-i18n='olive_intro'], [data-i18n='onyx_intro']");
  if (heroIntro && data.intro) heroIntro.textContent = data.intro;

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
        .sort((a,b) => parseInt(a.match(/\d+/)[0],10) - parseInt(b.match(/\d+/)[0],10));
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

  // ---------- INQUIRY FORM (Zoho) ----------
  // Podržava:
  //   inquiry_url_<lang>  (npr. inquiry_url_hr)
  //   inquiry_url_en      (fallback)
  //   inquiry_url         (krajnji fallback)
  const iqWrap = document.getElementById("apt-inquiry-wrap");
  const iqH    = document.getElementById("apt-inquiry-h");
  const iqNote = document.getElementById("apt-inquiry-note");
  const iqBox  = document.getElementById("apt-inquiry");

  if (iqWrap && iqBox){
    const url =
      data[`inquiry_url_${lang}`] ||
      data.inquiry_url_en ||
      data.inquiry_url ||
      null;

    if (url){
      if (data.inquiry_h && iqH)    iqH.textContent = data.inquiry_h;
      if (data.inquiry_note && iqNote) iqNote.textContent = data.inquiry_note;

      iqWrap.style.display = "";
      iqBox.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-label", `${(data.title || slug)} Inquiry`);
      iframe.src = url;
      iframe.loading = "lazy";
      iframe.style.width  = "100%";
      iframe.style.height = "650px";
      iframe.style.border = "none";
      iqBox.appendChild(iframe);
    } else {
      iqWrap.style.display = "none";
      iqBox.innerHTML = "";
    }
  }

  // ---------- CALENDAR (ostavljen kao fallback; sakrit će se ako nema URL-a) ----------
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

// Globalno:
window.loadApartment = loadApartment;

// Auto init po slug-u
document.addEventListener("DOMContentLoaded", ()=>{
  const slug = document.body?.getAttribute("data-apt-slug");
  if (slug) loadApartment(slug);
});
