// /assets/js/faq.js
const FAQ_DEFAULT_LANG = "en";

async function loadFaq(langOpt) {
  const lang = (langOpt || localStorage.getItem("lang") || FAQ_DEFAULT_LANG).toLowerCase();
  let data = null;
  for (const url of [`/content/${lang}.json`, `/content/${FAQ_DEFAULT_LANG}.json`]) {
    try {
      const res = await fetch(url, { cache: "default" });
      if (res.ok) { data = await res.json(); break; }
    } catch(e) {}
  }
  if (!data || !Array.isArray(data.faq)) return;

  const list = document.getElementById("faq-list");
  if (!list) return;
  list.innerHTML = "";
  data.faq.forEach(item => {
    const det = document.createElement("details");
    det.className = "faq-item";
    const sum = document.createElement("summary");
    sum.className = "faq-q";
    sum.textContent = item.q;
    const ans = document.createElement("p");
    ans.className = "faq-a";
    ans.textContent = item.a;
    det.appendChild(sum);
    det.appendChild(ans);
    list.appendChild(det);
  });
}

window.loadFaq = loadFaq;

document.addEventListener("DOMContentLoaded", () => loadFaq());
