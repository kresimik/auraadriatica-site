async function loadApartment(which) {
  const lang = (localStorage.getItem("lang") || "en").toLowerCase();
  const path = `/content/apartments/${which}/${lang}.json`;

  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Missing content: ${path}`);
    const data = await res.json();

    // Title & intro
    const h1 = document.querySelector("h1[data-i18n]");
    if (h1) h1.textContent = data.title || h1.textContent;

    const intro = document.querySelector(".hero p");
    if (intro) intro.textContent = data.intro || intro.textContent;

    // Description
    const descHost = document.getElementById("apt-description");
    if (descHost && data.description) descHost.textContent = data.description;

    // Features
    const featHost = document.getElementById("apt-features");
    if (featHost && Array.isArray(data.features)) {
      featHost.innerHTML = "";
      data.features.forEach(f => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = f;
        featHost.appendChild(span);
      });
    }

    // Gallery
    const galHost = document.getElementById("apt-gallery");
    if (galHost && Array.isArray(data.gallery)) {
      galHost.innerHTML = "";
      data.gallery.forEach(src => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = data.title || "Apartment photo";
        galHost.appendChild(img);
      });
    }

    // Calendar
    const iframe = document.querySelector(".calendar-iframe");
    if (iframe && data.calendar) iframe.src = data.calendar;

  } catch (e) {
    console.error(e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Detect which apartment page we're on
  if (location.pathname.includes("/olive")) loadApartment("olive");
  if (location.pathname.includes("/onyx")) loadApartment("onyx");
});
