/* Explore page bootstrap
   - Primary: /content/explore/<lang>.json
   - Fallback: /content/<lang>.json (legacy global ključevi)
   - Popunjava hero, about, headings i liste (do, beaches, trips, food)
*/
const DEFAULT_LANG_EXPLORE = "en";

async function loadExplore(lang) {
  const tryUrls = [
    `/content/explore/${lang}.json`,
    `/content/${lang}.json`,
  ];

  let data = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) { data = await res.json(); break; }
    } catch (_) {}
  }
  if (!data) {
    console.error("Explore load failed for lang:", lang);
    return;
  }

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el && typeof val === "string") el.textContent = val;
  };
  const renderList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    if (Array.isArray(items)) {
      items.forEach((x) => {
        const li = document.createElement("li");
        li.textContent = x;
        el.appendChild(li);
      });
    }
  };
  const get = (primary, fallback) => data[primary] ?? data[fallback];

  // Hero
  setText("ex-hero-title", get("hero_title", "explore_h"));
  setText("ex-hero-sub",   get("hero_sub",   "explore_intro"));

  // About
  setText("ex-about", get("about_h", "explore_about_h"));
  setText("ex-intro", get("about_p", "explore_about_p"));

  // Headings (prefer dedicated)
  setText("ex-do",      get("do_h",      "explore_do_h"));
  setText("ex-beaches", get("beaches_h", "explore_beaches_h"));
  setText("ex-trips",   get("trips_h",   "explore_trips_h"));
  setText("ex-food",    get("food_h",    "explore_food_h"));

  // Lists
  renderList("ex-do-list",      get("do",      "explore_do_list"));
  renderList("ex-beaches-list", get("beaches", "explore_beaches_list"));
  renderList("ex-trips-list",   get("trips",   "explore_trips_list"));
  renderList("ex-food-list",    get("food",    "explore_food_list"));
}

// Expose za i18n dropdown
window.loadExplore = loadExplore;

document.addEventListener("DOMContentLoaded", () => {
  const lang = (localStorage.getItem("lang") || DEFAULT_LANG_EXPLORE).toLowerCase();
  loadExplore(lang);
});
