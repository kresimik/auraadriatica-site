/* Explore page bootstrap
   - učitava content/explore/<lang>.json
   - puni liste i tekstove
*/

const DEFAULT_LANG = "en";

async function loadExplore(lang) {
  try {
    const res = await fetch(`/content/explore/${lang}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error("No file");
    const data = await res.json();

    // Hero
    if (data.hero_title) document.getElementById("ex-hero-title").textContent = data.hero_title;
    if (data.hero_sub)   document.getElementById("ex-hero-sub").textContent   = data.hero_sub;

    // About
    if (data.about_h) document.getElementById("ex-about").textContent = data.about_h;
    if (data.about_p) document.getElementById("ex-intro").textContent = data.about_p;

    // Things to do
    renderList("ex-do-list", data.do);

    // Beaches
    renderList("ex-beaches-list", data.beaches);

    // Day trips
    renderList("ex-trips-list", data.trips);

    // Food
    renderList("ex-food-list", data.food);

  } catch (err) {
    console.error("Explore load failed", err);
  }
}

function renderList(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  if (Array.isArray(items)) {
    items.forEach(x => {
      const li = document.createElement("li");
      li.textContent = x;
      el.appendChild(li);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saved = (localStorage.getItem("lang") || DEFAULT_LANG).toLowerCase();
  loadExplore(saved);
});
