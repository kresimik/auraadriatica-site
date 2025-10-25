// /assets/js/apt.js
const APT_DEFAULT_LANG = "en";

async function loadApartment(slug, langOpt){
  const slugLc = String(slug || document.body?.getAttribute("data-apt-slug") || "").toLowerCase();
  if (!slugLc) { console.warn("[apt] Missing slug."); return; }

  const lang = (langOpt || localStorage.getItem("lang") || APT_DEFAULT_LANG).toLowerCase();
  const fall = APT_DEFAULT_LANG;

  // ===== Prioritet: /content/apartments/{slug}/{lang}.json =====
  const tryUrls = [
    `/content/apartments/${slugLc}/${lang}.json`,
    `/content/apartments/${slugLc}/${fall}.json`,
    `/content/${lang}.json`,
    `/content/${fall}.json`
  ];

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
  if(!data){
    console.warn(`[apt] Missing JSON for ${slugLc}/${lang}. Tried:`, tryUrls);
    return;
  }
  console.log(`[apt] Loaded ${usedUrl}`);

  // ---------- TITLE + META ----------
  if (data.page_title) document.title = data.page_title;
  if (data.meta_desc){
    let m = document.querySelector('meta[name="description"]');
    if (!m){
      m = document.createElement('meta');
      m.setAttribute('name','description');
      document.head.appendChild(m);
    }
    m.setAttribute('content', data.meta_desc);
  }

  // ---------- HERO ----------
  const h1 = document.querySelector("h1[data-i18n], .hero h1");
  if (h1 && data.title) h1.textContent = data.title;

  let heroIntro =
    document.querySelector("[data-i18n='olive_intro'], [data-i18n='onyx_intro']") ||
    document.querySelector(".hero p");
  if (heroIntro && data.intro) heroIntro.textContent = data.intro;

  // ---------- HEADINGS ----------
  const setTxt = (sel, val) => {
    const el = document.querySelector(sel);
    if (el && typeof val === "string" && val.trim() !== "") el.textContent = val;
  };
  setTxt("[data-i18n='desc_h']",        data.desc_h);
  setTxt("[data-i18n='highlights_h']",  data.highlights_h);
  setTxt("[data-i18n='gallery_h']",     data.gallery_h);
  setTxt("[data-i18n='contact_h']",     data.contact_h);
  setTxt("[data-i18n='availability_h']", data.availability_h);

  const calNote = document.querySelector(".aa-cal-note, #apt-availability-note");
  if (calNote && typeof data.availability_note === "string") {
    calNote.textContent = data.availability_note;
  }

  // ---------- DESCRIPTION ----------
  const descEl = document.getElementById("apt-desc");
  if (descEl){
    descEl.innerHTML = "";
    let paragraphs = Array.isArray(data.description)
      ? data.description
      : (typeof data.description === "string"
          ? data.description.split(/\n\s*\n/) : []);
    paragraphs
      .filter(p => p && String(p).trim() !== "")
      .forEach(p => {
        const el = document.createElement("p");
        el.textContent = String(p).trim();
        descEl.appendChild(el);
      });
  }

  // ---------- FEATURES ----------
  const feats = Array.isArray(data.features) ? data.features : [];
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
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = `${(data.title || slugLc)} photo ${i+1}`;
        gal.appendChild(img);
      });
    }
  }

  // ---------- CONTACT ----------
  const mailEl = document.getElementById("apt-contact-email");
  if (mailEl){
    const email =
      data[`contact_email_${lang}`] ||
      data.contact_email ||
      "info@auraadriatica.com";
    mailEl.setAttribute("href", `mailto:${email}`);
    mailEl.textContent = email;
  }
}

// Global
window.loadApartment = loadApartment;

// Auto-init
document.addEventListener("DOMContentLoaded", ()=>{
  const slug = document.body?.getAttribute("data-apt-slug");
  if (slug) loadApartment(slug);
});
