// /assets/js/map.js — Explore page interactive map (Leaflet + OpenStreetMap)
(function () {
  const PLACES = {
    apartment: [
      { name: "Olive & Onyx Apartments", lat: 45.2888, lng: 14.2726, maps: "https://www.google.com/maps/place/Rezine+7H,+Lovran" }
    ],
    restaurant: [
      { name: "Ganeum",             lat: 45.2926, lng: 14.2800, maps: "https://maps.app.goo.gl/E3uFaZdf27YiXXUt5" },
      { name: "Najade",             lat: 45.2921, lng: 14.2792, maps: "https://maps.app.goo.gl/VXj3Le13ZaP5uZR27" },
      { name: "Lovranska Vrata",    lat: 45.2932, lng: 14.2816, maps: "https://www.google.com/maps/search/Lovranska+Vrata+Lovran" },
      { name: "Draga di Lovrana",   lat: 45.2760, lng: 14.2514, maps: "https://maps.app.goo.gl/KRJHHeXPYkrMxbwn6" },
      { name: "Konoba Kali",        lat: 45.2615, lng: 14.2649, maps: "https://www.google.com/maps/search/Konoba+Kali+Medveja" },
      { name: "Zijavica",           lat: 45.2401, lng: 14.2607, maps: "https://maps.app.goo.gl/aqptnU64dpdrEro19" },
      { name: "Johnson Restaurant", lat: 45.2395, lng: 14.2602, maps: "https://maps.app.goo.gl/aobtvfK67GLamKRC8" },
      { name: "Plavi podrum",       lat: 45.3270, lng: 14.3210, maps: "https://maps.app.goo.gl/fehZwnU1Brj9J4Qv7" },
      { name: "Trattoria Mandrać",  lat: 45.3268, lng: 14.3207, maps: "https://www.google.com/maps/search/Trattoria+Mandrac+Volosko" },
      { name: "Bevanda",            lat: 45.3334, lng: 14.3274, maps: "https://www.google.com/maps/search/Bevanda+restaurant+Opatija" },
      { name: "Valle Losca",        lat: 45.3326, lng: 14.3268, maps: "https://maps.app.goo.gl/4Kyh5pqQoDDbubow7" },
      { name: "Ružmarin",           lat: 45.3320, lng: 14.3257, maps: "https://maps.app.goo.gl/cPMscVMU4gnontM97" },
      { name: "Istranka",           lat: 45.3323, lng: 14.3263, maps: "https://maps.app.goo.gl/vA9B6eCD3rv4LkJ78" },
      { name: "Bistro Fortica",     lat: 45.3657, lng: 14.3691, maps: "https://maps.app.goo.gl/1gJWz9zBvvuKYdju5" }
    ],
    beach: [
      { name: "Peharovo",          lat: 45.2904, lng: 14.2746, maps: "https://maps.app.goo.gl/jnKYDnaNymPPRa1K8" },
      { name: "Cipera",            lat: 45.2898, lng: 14.2732, maps: "https://maps.app.goo.gl/nmiMeqtGzRYw9uRc7" },
      { name: "Kvarner (Lovran)",  lat: 45.2932, lng: 14.2813, maps: "https://maps.app.goo.gl/y1teyu9YMguTyPXF7" },
      { name: "Medveja",           lat: 45.2705, lng: 14.2692, maps: "https://maps.app.goo.gl/gzheik8unN1ocQLx9" },
      { name: "Mošćenička Draga",  lat: 45.2372, lng: 14.2545, maps: "https://maps.app.goo.gl/JxDdQnYAmVADEnfF8" },
      { name: "Ičići",             lat: 45.3126, lng: 14.3130, maps: "https://maps.app.goo.gl/oZoNU6jkMLxb3MEg9" },
      { name: "Opatija",           lat: 45.3334, lng: 14.3271, maps: "https://maps.app.goo.gl/djPMCyABH8tkoKe5A" }
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
      html: `<div style="background:${c.bg};border:2px solid ${c.border};width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 6px rgba(0,0,0,.25);cursor:pointer;">${emoji}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -18]
    });
  }

  function initMap() {
    const el = document.getElementById("explore-map");
    if (!el || typeof L === "undefined") return;

    const map = L.map("explore-map", {
      center: [45.295, 14.295],
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
        marker.bindPopup(
          `<div style="font-family:'Jost',sans-serif;min-width:140px;">` +
          `<strong style="font-size:.95rem;color:#0e0e0e;">${p.name}</strong><br>` +
          `<a href="${p.maps}" target="_blank" rel="noopener" style="font-size:.8rem;color:#b8965a;text-decoration:none;border-bottom:1px solid rgba(184,150,90,.4);">Directions ↗</a>` +
          `</div>`, { maxWidth: 200 }
        );
        marker.addTo(map);
        layers[cat].push(marker);
      });
    });

    document.querySelectorAll(".map-filter").forEach(btn => {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".map-filter").forEach(b => b.classList.remove("active"));
        this.classList.add("active");
        const cat = this.dataset.cat;
        Object.entries(layers).forEach(([c, markers]) => {
          markers.forEach(m => {
            if (cat === "all" || cat === c) { if (!map.hasLayer(m)) map.addLayer(m); }
            else { if (map.hasLayer(m)) map.removeLayer(m); }
          });
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", initMap);
})();
