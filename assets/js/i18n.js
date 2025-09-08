const DEFAULT_LANG = "en";
let currentLang = DEFAULT_LANG;
let translations = {};

async function loadLang(lang) {
  try {
    const res = await fetch(`/content/${lang}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("No file");
    translations = await res.json();
    currentLang = lang;
    applyTranslations();

    // Osvježi stanje gumba u dropdownu
    document.querySelectorAll(".lang-menu button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    const cur = document.querySelector(".current-lang");
    if (cur) cur.textContent = lang.toUpperCase();

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
  const metaDesc = document.querySelector("meta[name='description']");
  if (metaDesc && translations["meta_desc"]) {
    metaDesc.setAttribute("content", translations["meta_desc"]);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Restore saved language ili default
  const saved = localStorage.getItem("lang") || DEFAULT_LANG;
  loadLang(saved);

  // Attach events na gumbe iz dropdowna
  document.querySelectorAll(".lang-menu button").forEach(btn => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      localStorage.setItem("lang", lang);
      loadLang(lang);
    });
  });
});
