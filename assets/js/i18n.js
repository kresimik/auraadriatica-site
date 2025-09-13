// i18n.js — central translations loader + dropdown sync (no reload)
const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};
const langCache = Object.create(null);

async function fetchLangFile(lang) {
  if (langCache[lang]) return langCache[lang];
  const res = await fetch(`/content/${lang}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Missing lang file: ${lang}`);
  const json = await res.json();
  langCache[lang] = json;
  return json;
}

async function loadLang(lang) {
  try {
    translations = await fetchLangFile(lang);
    currentLang = lang;
  } catch (err) {
    console.warn(`⚠️ ${err.message}. Falling back to ${DEFAULT_LANG}.`);
    if (lang !== DEFAULT_LANG) {
      translations = await fetchLangFile(DEFAULT_LANG);
      currentLang = DEFAULT_LANG;
    } else {
      console.error("❌ Failed to load default language file.");
      return;
    }
  }
  applyTranslations();
  updateDropdown(currentLang);
  updateDocumentLang(currentLang);
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = translations[key];
    if (val == null) return;
    if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;
  });

  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && translations["meta_desc"]) {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

function updateDropdown(lang) {
  document.querySelectorAll(".lang-menu button[data-lang]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  document.querySelectorAll(".current-lang").forEach(el => {
    el.textContent = lang.toUpperCase();
  });
}

function updateDocumentLang(lang) {
  const html = document.documentElement;
  if (html) html.setAttribute("lang", lang);
}

// public API
window.setLang = async function setLang(lang) {
  localStorage.setItem("lang", lang);
  await loadLang(lang);
};

document.addEventListener("DOMContentLoaded", () => {
  const saved = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  loadLang(saved);

  // Global event delegation for ANY language menu
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".lang-menu button[data-lang]");
    if (!btn) return;
    const lang = btn.dataset.lang;
    await window.setLang(lang);
    // Ako explore.js postoji i expose-a loadExplore, napuni explore sadržaj
    if (typeof window.loadExplore === "function") {
      await window.loadExplore(lang);
    }
  });
});
