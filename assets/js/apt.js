// Normalize current JSON (desc_p1/2, highlights, olive_h …) to the standard schema
const norm = {
  page_title: data.page_title,
  meta_desc:  data.meta_desc,

  title: data.title || data.olive_h || "Olive Apartment",
  intro: data.intro || data.olive_intro || "",

  // Accept array or build from desc_p1/desc_p2/desc_p3…
  description: Array.isArray(data.description)
    ? data.description
    : (data.description
        ? data.description
        : [data.desc_p1, data.desc_p2, data.desc_p3, data.desc_p4].filter(Boolean)
      ),

  // “highlights” → “features”
  features: Array.isArray(data.features) ? data.features : (data.highlights || []),

  // Gallery passthrough
  gallery: Array.isArray(data.gallery) ? data.gallery : [],

  calendar: data.calendar || ""
};

// from here on, use `norm` instead of `data`:
if (norm.page_title) document.title = norm.page_title;
if (norm.meta_desc) { /* … set meta description … */ }

const h1 = document.querySelector("h1[data-i18n]");
if (h1 && norm.title) h1.textContent = norm.title;

// Description
const descEl = document.getElementById("apt-desc");
if (descEl){
  descEl.innerHTML = "";
  let paragraphs = [];
  if (Array.isArray(norm.description)) paragraphs = norm.description;
  else if (typeof norm.description === "string") {
    paragraphs = norm.description.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);
  }
  if (!paragraphs.length && norm.intro) paragraphs = [norm.intro];
  paragraphs.forEach(p=>{ const el=document.createElement("p"); el.textContent=p; descEl.appendChild(el); });
}

// Features
const list = document.getElementById("apt-highlights");
if (list){
  list.innerHTML = "";
  (norm.features || []).forEach(f=>{ const li=document.createElement("li"); li.textContent=f; list.appendChild(li); });
}

// Gallery
const gal = document.getElementById("apt-gallery");
if (gal){
  gal.innerHTML = "";
  (norm.gallery || []).forEach((src,i)=>{
    const img=document.createElement("img");
    img.src=src; img.alt=`${norm.title || 'Apartment'} photo ${i+1}`;
    gal.appendChild(img);
  });
}

// Calendar
const wrap = document.getElementById("apt-calendar-wrap");
const iframe = document.getElementById("apt-calendar");
if (iframe){
  if (norm.calendar){ iframe.src = norm.calendar; if (wrap) wrap.style.display = ""; }
  else { if (wrap) wrap.style.display = "none"; iframe.removeAttribute("src"); }
}
