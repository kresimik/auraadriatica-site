// /assets/js/apt.js
const APT_DEFAULT_LANG = "en";

async function loadApartment(slug, langOpt) {
  const lang = (langOpt || localStorage.getItem("lang") || APT_DEFAULT_LANG).toLowerCase();
  const fall = APT_DEFAULT_LANG;

  const tryUrls = [
    `/content/apartments/${slug}/${lang}.json`,
    lang !== fall ? `/content/apartments/${slug}/${fall}.json` : null
  ].filter(Boolean);

  let data = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
        break;
      } else {
        console.warn(`[apt] Fetch failed ${res.status} for ${url}`);
      }
    } catch (e) {
      console.warn(`[apt] Error fetching ${url}`, e);
    }
  }
  if (!data) {
    console.warn(`[apt] Missing JSON for ${slug}/${lang}`);
    return;
  }

  // <title> + meta description
  if (data.page_title) document.title = data.page_title;
  if (data.meta_desc) {
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement('meta');
      m.setAttribute('name', 'description');
      document.head.appendChild(m);
    }
    m.setAttribute('content', data.meta_desc);
  }

  // Optional hero override
  const h1 = document.querySelector("h1[data-i18n]");
  if (h1 && data.title) h1.textContent = data.title;
  const heroIntro = document.querySelector("[data-i18n='olive_intro'], [data-i18n='onyx_intro']");
  if (heroIntro && data.intro) heroIntro.textContent = data.intro;

  // ----- Description -----
  const descEl = document.getElementById("apt-desc");
  if (descEl) {
    descEl.innerHTML = "";
    const desc = data.description ?? data.intro ?? "";

    if (Array.isArray(desc)) {
      desc.forEach(p => {
        const el = document.createElement("p");
        el.textContent = (p || "").toString().trim();
        if (el.textContent) descEl.appendChild(el);
      });
    } else if (typeof desc === "string") {
      desc.split(/\n\s*\n/).forEach(p => {
        const el = document.createElement("p");
        el.textContent = p.trim();
        if (el.textContent) descEl.appendChild(el);
      });
    }
  }

  // ----- Highlights -----
  const list = document.getElementById("apt-highlights");
  if (list) {
    list.innerHTML = "";
    if (Array.isArray(data.features)) {
      data.features.forEach(f => {
        const li = document.createElement("li");
        li.textContent = f;
        list.appendChild(li);
      });
    }
  }

  // ----- Gallery -----
  const gal = document.getElementById("apt-gallery");
  if (gal) {
    gal.innerHTML = "";
    if (Array.isArray(data.gallery)) {
      data.gallery.forEach((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `${data.title || slug} photo ${i + 1}`;
        gal.appendChild(img);
      });
    }
  }

  // ----- Calendar -----
  const wrap = document.getElementById("apt-calendar-wrap");
  const iframe = document.getElementById("apt-calendar");
  if (iframe) {
    if (data.calendar) {
      iframe.src = data.calendar;
      if (wrap) wrap.style.display = "";
    } else {
      if (wrap) wrap.style.display = "none";
      iframe.removeAttribute("src");
    }
  }
}

// expose for manual calls / language switch hooks
window.loadApartment = loadApartment;

// auto-init based on body[data-apt-slug]
document.addEventListener("DOMContentLoaded", () => {
  const slug = document.body?.getAttribute("data-apt-slug");
  if (slug) loadApartment(slug);
});
