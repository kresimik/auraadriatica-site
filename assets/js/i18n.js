const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};

async function loadLang(lang) {
  try {
    const res = await fetch(`/content/${lang}.json`);
    if (!res.ok) throw new Error("No file");
    translations = await res.json();
    currentLang = lang;
    applyTranslations();
    document.querySelectorAll(".lang button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  } catch (err) {
    console.error("Failed to load lang", lang, err);
  }
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });
  // Update meta description if exists
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && translations["meta_desc"]) {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Load default language
  loadLang(currentLang);

  // Attach events to lang buttons
  document.querySelectorAll(".lang button").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      loadLang(lang);
      localStorage.setItem("lang", lang);
    });
  });

  // Restore saved language
  const saved = localStorage.getItem("lang");
  if (saved) loadLang(saved);
});
