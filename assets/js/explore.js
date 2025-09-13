/* Explore page bootstrap
   - Tries: /content/explore/<lang>.json
   - Fallback: /content/<lang>.json (if dedicated file is missing)
   - Populates hero, about and lists (do, beaches, trips, food)
*/

const DEFAULT_LANG = "en";

async function loadExplore(lang) {
  const tryUrls = [
    `/content/explore/${lang}.json`,
    `/content/${lang}.json`
  ];

  let data = null;
  let usedUrl = null;

  // Try to fetch the JSON
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
        usedUrl = url;
        break;
      }
    } catch (err) {
      console.warn("[Explore] Fetch failed:", url, err);
    }
  }

  if (!data) {
    console.error("[Explore] No data found for lang:", lang, " Tried:", tryUrls);
    return;
  }
  console.log("[Explore] Loaded:", usedUrl);

  // Helpers
  const getEl = id => document.getElementById(id);
  const setText = (id, val) => {
    const el = getEl(id);
    if (el && typeof val === "string") el.textContent = val;
  };
  const renderList = (id, items) => {
    const el = getEl(id);
    if (!el) {
      console.warn("[Explore] Missing element #" + id);
      return;
    }
    el.innerHTML = "";
    if (Array.isArray(items)) {
      items.forEach(x => {
        const li = document.createElement("li");
        li.textContent = x;
        el.appendChild(li);
      });
    }
  };

  // Map keys between dedicated explore.json and fallback site.json
  const get = (primary, fallback) => data[primary] ?? data[fallback];

  // Hero
  setText("ex-hero-title", get("hero_title", "explore_h"));
  setText("ex-hero-sub",   get("hero_sub",   "explore_intro"));

  // About
  setText("ex-about", get("about_h", "explore_about_h"));
  setText("ex-intro", get("about_p", "explore_about_p"));

  // Lists
  renderList("ex-do-list",      get("do",      "explore_do_list"));
  renderList("ex-beaches-list", get("beaches", "explore_beaches_list"));
  renderList("ex-trips-list",   get("trips",   "explore_trips_list"));
  renderList("ex-food-list",    get("food",    "explore_food_list"));
}

// Init after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const lang = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  loadExplore(lang);
});
