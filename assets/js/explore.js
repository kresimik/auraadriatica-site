/* Explore page bootstrap
   - Primary: /content/explore/<lang>.json
   - Fallback: /content/<lang>.json (legacy global ključevi)
   - Popunjava hero, about, headings i liste (do, beaches, trips, food)
*/
const DEFAULT_LANG_EXPLORE = "en";

async function loadExplore(lang) {
  const v = '20261106';
  const tryUrls = [
    `/content/explore/${lang}.json?v=${v}`,
    `/content/${lang}.json?v=${v}`,
  ];

  let data = null;
  for (const url of tryUrls) {
    try {
      const res = await fetch(url, { cache: "default" });
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
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  const renderList = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    if (Array.isArray(items)) {
      items.forEach((x) => {
        const li = document.createElement("li");
        // One flex item next to the dash, so a link stays inside its sentence
        const text = document.createElement("span");
        li.appendChild(text);
        let last = 0, m;
        linkRe.lastIndex = 0;
        while ((m = linkRe.exec(x)) !== null) {
          if (m.index > last) text.appendChild(document.createTextNode(x.slice(last, m.index)));
          const a = document.createElement("a");
          a.textContent = m[1];
          // Only http(s) — keeps javascript:/data: out if content is ever edited elsewhere
          a.href = /^https?:\/\//i.test(m[2]) ? m[2] : "#";
          a.target = "_blank";
          a.rel = "noopener";
          text.appendChild(a);
          last = m.index + m[0].length;
        }
        if (last < x.length) text.appendChild(document.createTextNode(x.slice(last)));
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
  setText("ex-family",  get("family_h",  "explore_family_h"));

  // Lists
  renderList("ex-do-list",      get("do",      "explore_do_list"));
  renderList("ex-beaches-list", get("beaches", "explore_beaches_list"));
  renderList("ex-trips-list",   get("trips",   "explore_trips_list"));
  // The first food entry introduces the others
  const food = get("food", "explore_food_list");
  if (Array.isArray(food)) {
    setText("ex-food-intro", food[0]);
    renderList("ex-food-list", food.slice(1));
  }
  renderList("ex-family-list",  get("family",  "explore_family_list"));
}

// Expose za i18n dropdown
window.loadExplore = loadExplore;

document.addEventListener("DOMContentLoaded", () => {
  const lang = (localStorage.getItem("lang") || DEFAULT_LANG_EXPLORE).toLowerCase();
  loadExplore(lang);
});
