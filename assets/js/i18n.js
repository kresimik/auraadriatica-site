// i18n.js — translations + language dropdown toggle (single source of truth)

const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};
const langCache = Object.create(null); // in-memory cache

// ---------- fetch + load ----------
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

// ---------- apply to DOM ----------
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = translations[key];
    if (val == null) return;
    if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;
  });

  // Optional: translate meta description if key exists
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && translations["meta_desc"]) {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

function updateDropdown(lang) {
  // active state
  document.querySelectorAll(".lang-menu button[data-lang]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  // visible code
  document.querySelectorAll(".current-lang").forEach(el => {
    el.textContent = lang.toUpperCase();
  });
}

function updateDocumentLang(lang) {
  const html = document.documentElement;
  if (html) html.setAttribute("lang", lang);
}

// Expose setLang globally
window.setLang = async function setLang(lang) {
  localStorage.setItem("lang", lang);
  await loadLang(lang);

  // If a page has dynamic content hook (e.g. explore.js defines window.loadExplore),
  // call it after translations so the page-specific content refreshes too.
  if (typeof window.loadExplore === "function") {
    try { await window.loadExplore(lang.toLowerCase()); } catch {}
  }
};

// ---------- Dropdown open/close UX (no per-page inline needed) ----------
function wireLanguageDropdowns() {
  const dds = document.querySelectorAll(".lang-dropdown");
  if (!dds.length) return;

  dds.forEach(dd => {
    const btn  = dd.querySelector(".lang-toggle");
    const menu = dd.querySelector(".lang-menu");
    if (!btn || !menu) return;

    const open  = () => { menu.hidden = false; btn.setAttribute("aria-expanded","true"); };
    const close = () => { menu.hidden = true;  btn.setAttribute("aria-expanded","false"); };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });

    // Pick a language (delegation inside menu)
    menu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-lang]");
      if (!b) return;
      const lang = b.dataset.lang;
      await window.setLang(lang);
      close();
    });

    // Close when clicking outside / pressing Escape
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  // initial language
  const saved = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  await loadLang(saved);

  // wire dropdowns once
  wireLanguageDropdowns();

  // Also support language picks from *any* other menu on the page via delegation:
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".lang-menu button[data-lang]");
    if (!btn) return;
    const lang = btn.dataset.lang;
    await window.setLang(lang);
  });
});
