// /assets/js/apt.js
const APT_DEFAULT_LANG = "en";

async function loadApartment(slug, langOpt){
  const slugLc = String(slug || document.body?.getAttribute("data-apt-slug") || "").toLowerCase();
  if (!slugLc) { console.warn("[apt] Missing slug."); return; }

  const lang = (langOpt || localStorage.getItem("lang") || APT_DEFAULT_LANG).toLowerCase();
  const fall = APT_DEFAULT_LANG;

  // ===== Robust path strategy =====
  // 1) /content/{slug}/{lang}.json
  // 2) /content/{lang}.json (global)
  // 3) /content/apartments/{slug}/{lang}.json (legacy)
  // 4) /content/{slug}/en.json
  // 5) /content/en.json (global)
  // 6) /content/apartments/{slug}/en.json (legacy)
  const tryUrls = [
    `/content/${slugLc}/${lang}.json`,
    `/content/${lang}.json`,
    `/content/apartments/${slugLc}/${lang}.json`,
    `/content/${slugLc}/${fall}.json`,
    `/content/${fall}.json`,
    `/content/apartments/${slugLc}/${fall}.json`
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
        // 404 i slično uredno logiramo
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
  // H1 s data-i18n ostavljamo kao i prije
  const h1 = document.querySelector("h1[data-i18n], .hero h1");
  if (h1 && data.title) h1.textContent = data.title;

  // Intro: prvo probaj stare data-i18n ključeve, inače uzmi prvi <section.hero> p
  let heroIntro =
    document.querySelector("[data-i18n='olive_intro'], [data-i18n='onyx_intro']") ||
    document.querySelector(".hero p");
  if (heroIntro && data.intro) heroIntro.textContent = data.intro;

  // ---------- SECTION HEADINGS FROM APARTMENT JSON ----------
  (function () {
    const setTxt = (sel, val) => {
      const el = document.querySelector(sel);
      if (el && typeof val === "string" && val.trim() !== "") el.textContent = val;
    };
    setTxt("[data-i18n='desc_h']",        data.desc_h);
    setTxt("[data-i18n='highlights_h']",  data.highlights_h);
    setTxt("[data-i18n='gallery_h']",     data.gallery_h);

    // inquiry h2 po id-u (ako ga koristiš na nekoj stranici)
    const iqH = document.getElementById("apt-inquiry-h");
    if (iqH && data.inquiry_h) iqH.textContent = data.inquiry_h;

    setTxt("[data-i18n='contact_h']",     data.contact_h);

    // Availability heading je pokriven preko i18n.js (data-i18n="availability_h"),
    // ovdje nije potrebno ništa dodatno.
    // Ako želiš notu iz JSON-a prikazati iznad kalendara:
    const calNote = document.querySelector(".aa-cal-note");
    if (calNote && typeof data.availability_note === "string") {
      calNote.textContent = data.availability_note;
    }
  })();

  // ---------- DESCRIPTION ----------
  const descEl = document.getElementById("apt-desc");
  if (descEl){
    descEl.innerHTML = "";

    let paragraphs = [];
    if (Array.isArray(data.description)) {
      paragraphs = data.description;
    } else if (typeof data.description === "string") {
      // razbij u paragrafe po praznim linijama
      paragraphs = data.description.split(/\n\s*\n/);
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

  // ---------- INQUIRY (Zoho) ----------
  const iqWrap = document.getElementById("apt-inquiry-wrap");
  const iqNote = document.getElementById("apt-inquiry-note");
  const iqBox  = document.getElementById("apt-inquiry");

  if (iqWrap && iqBox){
    const url =
      data[`inquiry_url_${lang}`] ||
      data.inquiry_url_en ||
      data.inquiry_url ||
      null;

    if (url){
      if (data.inquiry_note && iqNote) iqNote.textContent = data.inquiry_note;
      iqWrap.style.display = "";
      iqBox.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-label", `${(data.title || slugLc)} Inquiry`);
      iframe.src = url;
      iframe.loading = "lazy";
      iframe.style.width  = "100%";
      iframe.style.minHeight = "500px";
      iframe.style.border = "none";
      iqBox.appendChild(iframe);
    } else {
      iqWrap.style.display = "none";
      iqBox.innerHTML = "";
    }
  }

  // ---------- CONTACT ----------
  (function(){
    const wrap   = document.getElementById("apt-contact-wrap");
    const mailEl = document.getElementById("apt-contact-email");
    if (!wrap && !mailEl) return;

    try {
      const email =
        data[`contact_email_${lang}`] ||
        data.contact_email ||
        "info@auraadriatica.com";

      if (mailEl) {
        mailEl.setAttribute("href", `mailto:${email}`);
        mailEl.textContent = email;
      }
      if (wrap) wrap.style.display = "";
    } catch (e) {
      console.warn("[apt] contact fill error", e);
    }
  })();

  // ---------- CALENDAR (legacy iframe podrška ako koristiš negdje) ----------
  const calWrap = document.getElementById("apt-calendar-wrap");
  const calIframe = document.getElementById("apt-calendar");
  if (calIframe){
    if (data.calendar){
      calIframe.src = data.calendar;
      if (calWrap) calWrap.style.display = "";
    } else {
      if (calWrap) calWrap.style.display = "none";
      calIframe.removeAttribute("src");
    }
  }
}

// Global
window.loadApartment = loadApartment;

// Init
document.addEventListener("DOMContentLoaded", ()=>{
  const slug = document.body?.getAttribute("data-apt-slug");
  if (slug) loadApartment(slug);
});

// === Auto-resize Zoho iframes ===
window.addEventListener("message", function (event) {
  if (event.data && typeof event.data === "string" && event.data.indexOf("zf_height") > -1) {
    try {
      const parts = event.data.split("&");
      const heightPart = parts.find(p => p.indexOf("zf_height") > -1);
      if (heightPart) {
        const newHeight = heightPart.split("=")[1];
        const iframes = document.querySelectorAll("iframe[src*='zohopublic']");
        iframes && iframes.forEach(frame => {
          frame.style.height = newHeight + "px";
        });
      }
    } catch (e) {
      console.warn("Zoho resize error:", e);
    }
  }
});
