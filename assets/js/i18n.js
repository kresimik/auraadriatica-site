// i18n.js — global translations loader with fallback + dropdown sync

const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};
const langCache = Object.create(null); // simple in-memory cache

async function fetchLangFile(lang) {
  // Return from cache if available
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
      // keep saved pref as the user's choice even if file is missing
    } else {
      // If even default fails, give up gracefully
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

    // If element explicitly allows HTML, inject as HTML, otherwise text
    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });

  // Optional: meta description translation via key "meta_desc"
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && translations["meta_desc"]) {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

function updateDropdown(lang) {
  // Toggle active state in any language menu on the page
  document.querySelectorAll(".lang-menu button[data-lang]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  // Update visible current-lang label(s)
  document.querySelectorAll(".current-lang").forEach(el => {
    el.textContent = lang.toUpperCase();
  });
}

function updateDocumentLang(lang) {
  // Set <html lang="..."> for a11y/SEO
  const html = document.documentElement;
  if (html) html.setAttribute("lang", lang);
}

// Expose small helper if you want to call from inline scripts
window.setLang = function setLang(lang) {
  localStorage.setItem("lang", lang);
  loadLang(lang);
};

document.addEventListener("DOMContentLoaded", () => {
  // Restore saved language or default
  const saved = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  loadLang(saved);

  // Event delegation for any dropdown on the page
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".lang-menu button[data-lang]");
    if (!btn) return;
    const lang = btn.dataset.lang;
    localStorage.setItem("lang", lang);
    loadLang(lang);
  });
});
