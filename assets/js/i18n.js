// i18n.js — translations + language dropdown (single source of truth)

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
  const wanted = (lang || DEFAULT_LANG).toLowerCase();
  try {
    translations = await fetchLangFile(wanted);
    currentLang = wanted;
  } catch (err) {
    console.warn(`⚠️ ${err.message}. Falling back to ${DEFAULT_LANG}.`);
    // fall back to default if custom missing
    translations = await fetchLangFile(DEFAULT_LANG);
    currentLang = DEFAULT_LANG;
  }

  applyTranslations();
  updateDropdown(currentLang);
  updateDocumentLang(currentLang);
}

// ---------- apply to DOM ----------
function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = translations[key];

    // Only apply strings (prevents arrays/objects from being dumped as text)
    if (typeof val !== "string") return;

    if (el.hasAttribute("data-i18n-html")) {
      el.innerHTML = val;
    } else {
      el.textContent = val;
    }
  });

  // Optional: translate <meta name="description">
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && typeof translations["meta_desc"] === "string") {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

function updateDropdown(lang) {
  const lc = (lang || "").toLowerCase();
  // toggle active state
  document.querySelectorAll(".lang-menu button[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang?.toLowerCase() === lc);
  });
  // visible current code(s)
  document.querySelectorAll(".current-lang").forEach((el) => {
    el.textContent = lc.toUpperCase();
  });
}

function updateDocumentLang(lang) {
  const html = document.documentElement;
  if (html) html.setAttribute("lang", (lang || DEFAULT_LANG).toLowerCase());
}

// Expose setLang globally
window.setLang = async function setLang(lang) {
  const lc = (lang || DEFAULT_LANG).toLowerCase();
  localStorage.setItem("lang", lc);
  await loadLang(lc);

  // Page hooks (optional)
  if (typeof window.loadExplore === "function") {
    try { await window.loadExplore(lc); } catch {}
  }
  if (typeof window.loadApt === "function") {
    try { await window.loadApt(lc); } catch {}
  }
};

// ---------- Dropdown wiring (no per-page inline needed) ----------
function wireLanguageDropdowns() {
  document.querySelectorAll(".lang-dropdown").forEach((dd) => {
    const btn = dd.querySelector(".lang-toggle");
    const menu = dd.querySelector(".lang-menu");
    if (!btn || !menu) return;

    const open  = () => { menu.hidden = false; btn.setAttribute("aria-expanded", "true");  };
    const close = () => { menu.hidden = true;  btn.setAttribute("aria-expanded", "false"); };

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });

    // Pick a language
    menu.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-lang]");
      if (!b) return;
      await window.setLang(b.dataset.lang);
      close();
    });

    // Close on outside click / Esc
    document.addEventListener("click", (e) => { if (!dd.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  });
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", async () => {
  const saved = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  await loadLang(saved);
  wireLanguageDropdowns();
});
