// /assets/js/map.js — Explore page interactive map (Leaflet + OpenStreetMap)
(function () {
  const PLACES = {
    apartment: [
      { name: "Olive & Onyx Apartments", lat: 45.2937, lng: 14.2527, maps: "https://www.google.com/maps/place/Rezine+7H,+Lovran" }
    ],
    restaurant: [
      { name: "Ganeum",                      lat: 45.2975, lng: 14.2601, maps: "https://maps.app.goo.gl/E3uFaZdf27YiXXUt5" },
      { name: "Najade",                      lat: 45.2970, lng: 14.2593, maps: "https://maps.app.goo.gl/VXj3Le13ZaP5uZR27" },
      { name: "Lovranska Vrata",             lat: 45.2981, lng: 14.2617, maps: "https://www.google.com/maps/search/Lovranska+Vrata+Lovran" },
      { name: "Draga di Lovrana",            lat: 45.2822, lng: 14.2658, maps: "https://maps.app.goo.gl/KRJHHeXPYkrMxbwn6" },
      { name: "Konoba Kali",                 lat: 45.2664, lng: 14.2450, maps: "https://www.google.com/maps/search/Konoba+Kali+Medveja" },
      { name: "Zijavica",                    lat: 45.2450, lng: 14.2408, maps: "https://maps.app.goo.gl/aqptnU64dpdrEro19" },
      { name: "Johnson Restaurant",          lat: 45.2444, lng: 14.2403, maps: "https://maps.app.goo.gl/aobtvfK67GLamKRC8" },
      { name: "Plavi podrum",                lat: 45.3319, lng: 14.3011, maps: "https://maps.app.goo.gl/fehZwnU1Brj9J4Qv7" },
      { name: "Trattoria Mandrać",           lat: 45.3317, lng: 14.3008, maps: "https://www.google.com/maps/search/Trattoria+Mandrac+Volosko" },
      { name: "Bevanda",                     lat: 45.3383, lng: 14.3075, maps: "https://www.google.com/maps/search/Bevanda+restaurant+Opatija" },
      { name: "Valle Losca",                 lat: 45.3375, lng: 14.3069, maps: "https://maps.app.goo.gl/4Kyh5pqQoDDbubow7" },
      { name: "Ružmarin",                    lat: 45.3369, lng: 14.3058, maps: "https://maps.app.goo.gl/cPMscVMU4gnontM97" },
      { name: "Istranka",                    lat: 45.3372, lng: 14.3064, maps: "https://maps.app.goo.gl/vA9B6eCD3rv4LkJ78" },
      { name: "Bistro Fortica",              lat: 45.3706, lng: 14.3492, maps: "https://maps.app.goo.gl/1gJWz9zBvvuKYdju5" }
    ],
    beach: [
      { name: "Peharovo",            lat: 45.2953, lng: 14.2547, maps: "https://maps.app.goo.gl/jnKYDnaNymPPRa1K8" },
      { name: "Cipera",              lat: 45.2947, lng: 14.2533, maps: "https://maps.app.goo.gl/nmiMeqtGzRYw9uRc7" },
      { name: "Kvarner (Lovran)",    lat: 45.2981, lng: 14.2614, maps: "https://maps.app.goo.gl/y1teyu9YMguTyPXF7" },
      { name: "Medveja",             lat: 45.2664, lng: 14.2453, maps: "https://maps.app.goo.gl/gzheik8unN1ocQLx9" },
      { name: "Mošćenička Draga",   lat: 45.2444, lng: 14.2386, maps: "https://maps.app.goo.gl/JxDdQnYAmVADEnfF8" },
      { name: "Ičići",               lat: 45.3175, lng: 14.2931, maps: "https://maps.app.goo.gl/oZoNU6jkMLxb3MEg9" },
      { name: "Opatija",             lat: 45.3383, lng: 14.3072, maps: "https://maps.app.goo.gl/djPMCyABH8tkoKe5A" }
    ]
  };

  const COLORS = {
    apartment:  { bg: "#b8965a", border: "#8a6e3e" },
    restaurant: { bg: "#c0392b", border: "#922b21" },
    beach:      { bg: "#2a7fa5", border: "#1d5f7a" }
  };

  function makeIcon(cat) {
    const c = COLORS[cat];
    const emoji = cat === "apartment" ? "🏠" : cat === "restaurant" ? "🍽️" : "🏖️";
    return L.divIcon({
      className: "",
      html: `<div style="
        background:${c.bg};border:2px solid ${c.border};
        width:30px;height:30px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.25);
        cursor:pointer;">${emoji}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -18]
    });
  }

  function initMap() {
    const el = document.getElementById("explore-map");
    if (!el || typeof L === "undefined") return;

    const map = L.map("explore-map", {
      center: [45.300, 14.280],
      zoom: 12,
      scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    const layers = { apartment: [], restaurant: [], beach: [] };

    Object.entries(PLACES).forEach(([cat, places]) => {
      places.forEach(p => {
        const marker = L.marker([p.lat, p.lng], { icon: makeIcon(cat) });
        marker.bindPopup(`
          <div style="font-family:'Jost',sans-serif;min-width:140px;">
            <strong style="font-size:.95rem;color:#0e0e0e;">${p.name}</strong><br>
            <a href="${p.maps}" target="_blank" rel="noopener"
               style="font-size:.8rem;color:#b8965a;text-decoration:none;border-bottom:1px solid rgba(184,150,90,.4);">
              Directions ↗
            </a>
          </div>`, { maxWidth: 200 });
        marker.addTo(map);
        layers[cat].push(marker);
      });
    });

    // Filter buttons
    document.querySelectorAll(".map-filter").forEach(btn => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".map-filter").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        const cat = this.dataset.cat;
        Object.entries(layers).forEach(([c, markers]) => {
          markers.forEach(m => {
            if (cat === "all" || cat === c) {
              if (!map.hasLayer(m)) map.addLayer(m);
            } else {
              if (map.hasLayer(m)) map.removeLayer(m);
            }
          });
        });
      });
    });
  }

  // Load Leaflet CSS + JS dynamically, then init
  function loadLeaflet(cb) {
    if (typeof L !== "undefined") { cb(); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = cb;
    document.head.appendChild(script);
  }

  document.addEventListener("DOMContentLoaded", () => {
    // Lazy-load map only when section is in view
    const el = document.getElementById("explore-map");
    if (!el) return;
    const obs = new IntersectionObserver((entries, o) => {
      if (entries[0].isIntersecting) {
        o.disconnect();
        loadLeaflet(initMap);
      }
    }, { rootMargin: "200px" });
    obs.observe(el);
  });
})();
