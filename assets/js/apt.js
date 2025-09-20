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

  // ---------- TITLE + META ----------
  if (data.page_title) document.title = data.page_title;
  if (data.meta_desc){
    let m = document.querySelector('meta[name="description"]');
    if (!m){ m = document.createElement('meta'); m.setAttribute('name','description'); document.head.appendChild(m); }
    m.setAttribute('content', data.meta_desc);
  }

  // ---------- HERO ----------
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
        img.alt = `${(data.title || slug)} photo ${i+1}`;
        gal.appendChild(img);
      });
    }
  }

  // ---------- INQUIRY ----------
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
      if (data.inquiry_h && iqH) iqH.textContent = data.inquiry_h;
      if (data.inquiry_note && iqNote) iqNote.textContent = data.inquiry_note;

      iqWrap.style.display = "";
      iqBox.innerHTML = "";
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-label", `${(data.title || slug)} Inquiry`);
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
    const textEl = document.getElementById("apt-contact-text");
    const mailEl = document.getElementById("apt-contact-email");
    if (!wrap || !textEl) return;

    try {
      const email =
        data[`contact_email_${lang}`] ||
        data.contact_email ||
        "info@auraadriatica.com";

      let note =
        data[`contact_note_${lang}`] ||
        data.contact_note ||
        null;

      if (!note) {
        const aptName = (data.title || slug || "Apartment");
        note = `Interested in ${aptName}? Send us your inquiry directly:`;
      }

      textEl.innerHTML = `${note} <a id="apt-contact-email" href="mailto:${email}">${email}</a>`;
      wrap.style.display = "";
    } catch (e) {
      console.warn("[apt] contact fill error", e);
    }
  })();

  // ---------- CALENDAR ----------
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
