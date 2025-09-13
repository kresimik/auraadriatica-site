// i18n.js — global translations loader with fallback + dropdown sync + safety guards

const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};
const langCache = Object.create(null); // simple in-memory cache

function isPlainText(val) {
  return typeof val === "string" || typeof val === "number";
}

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

  // Let page-level scripts (e.g., explore.js) react to language changes
  document.dispatchEvent(new CustomEvent("lang:changed", { detail: { lang: currentLang } }));
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    // Allow specific nodes to be managed by page scripts
    if (el.hasAttribute("data-i18n-skip")) return;

    const key = el.getAttribute("data-i18n");
    if (!key) return;

    const val = translations[key];
    if (val == null) return;

    // Only write plain text (no arrays/objects)
    if (el.hasAttribute("data-i18n-html")) {
      if (isPlainText(val)) el.innerHTML = String(val);
    } else {
      if (isPlainText(val)) el.textContent = String(val);
    }
  });

  // Optional: meta description translation via key "meta_desc"
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && isPlainText(translations["meta_desc"])) {
    metaDesc.setAttribute("content", String(translations["meta_desc"]));
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

// Expose small helper if you want to call from inline scripts
window.setLang = function setLang(lang) {
  localStorage.setItem("lang", lang);
  loadLang(lang);
};

document.addEventListener("DOMContentLoaded", () => {
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
