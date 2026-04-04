// /assets/js/map.js — Explore page interactive map (Leaflet + OpenStreetMap)
(function () {
  const PLACES = {
    apartment: [
      { name: "Olive & Onyx Apartments", lat: 45.2888, lng: 14.2726, maps: "https://www.google.com/maps/place/Rezine+7H,+Lovran" }
    ],
    restaurant: [
      { name: "Ulika",              lat: 45.2923, lng: 14.2770, maps: "https://www.google.com/maps/search/Restoran+Ulika+Lovran" },
      { name: "Ganeum",             lat: 45.2922, lng: 14.2776, maps: "https://maps.app.goo.gl/E3uFaZdf27YiXXUt5" },
      { name: "Najade",             lat: 45.2904, lng: 14.2767, maps: "https://maps.app.goo.gl/VXj3Le13ZaP5uZR27" },
      { name: "Lovranska Vrata",    lat: 45.2920, lng: 14.2770, maps: "https://www.google.com/maps/search/Lovranska+Vrata+Lovran" },
      { name: "Draga di Lovrana",   lat: 45.2761, lng: 14.2514, maps: "https://maps.app.goo.gl/KRJHHeXPYkrMxbwn6" },
      { name: "Konoba Kali",        lat: 45.2668, lng: 14.2615, maps: "https://www.google.com/maps/search/Konoba+Kali+Medveja" },
      { name: "Zijavica",           lat: 45.2367, lng: 14.2544, maps: "https://maps.app.goo.gl/aqptnU64dpdrEro19" },
      { name: "Johnson Restaurant", lat: 45.2386, lng: 14.2489, maps: "https://maps.app.goo.gl/aobtvfK67GLamKRC8" },
      { name: "Plavi podrum",       lat: 45.3478, lng: 14.3205, maps: "https://maps.app.goo.gl/fehZwnU1Brj9J4Qv7" },
      { name: "Trattoria Mandrać",  lat: 45.3476, lng: 14.3208, maps: "https://www.google.com/maps/search/Trattoria+Mandrac+Volosko" },
      { name: "Bevanda",            lat: 45.3354, lng: 14.3115, maps: "https://www.google.com/maps/search/Bevanda+restaurant+Opatija" },
      { name: "Valle Losca",        lat: 45.3505, lng: 14.3205, maps: "https://maps.app.goo.gl/4Kyh5pqQoDDbubow7" },
      { name: "Ružmarin",           lat: 45.3325, lng: 14.3019, maps: "https://maps.app.goo.gl/cPMscVMU4gnontM97" },
      { name: "Istranka",           lat: 45.3384, lng: 14.3083, maps: "https://maps.app.goo.gl/vA9B6eCD3rv4LkJ78" },
      { name: "Bistro Fortica",     lat: 45.3726, lng: 14.3494, maps: "https://maps.app.goo.gl/1gJWz9zBvvuKYdju5" }
    ],
    beach: [
      { name: "Peharovo",          lat: 45.2877, lng: 14.2733, maps: "https://maps.app.goo.gl/jnKYDnaNymPPRa1K8" },
      { name: "Cipera",            lat: 45.2940, lng: 14.2816, maps: "https://maps.app.goo.gl/nmiMeqtGzRYw9uRc7" },
      { name: "Kvarner (Lovran)",  lat: 45.2993, lng: 14.2820, maps: "https://maps.app.goo.gl/y1teyu9YMguTyPXF7" },
      { name: "Medveja",           lat: 45.2705, lng: 14.2692, maps: "https://maps.app.goo.gl/gzheik8unN1ocQLx9" },
      { name: "Mošćenička Draga",  lat: 45.2370, lng: 14.2548, maps: "https://maps.app.goo.gl/JxDdQnYAmVADEnfF8" },
      { name: "Ičići",             lat: 45.3131, lng: 14.2886, maps: "https://maps.app.goo.gl/oZoNU6jkMLxb3MEg9" },
      { name: "Opatija",           lat: 45.3273, lng: 14.3097, maps: "https://maps.app.goo.gl/djPMCyABH8tkoKe5A" }
    ],
    grocery: [
      { name: "Plodine",  lat: 45.3019, lng: 14.2792, maps: "https://www.google.com/maps/search/Plodine+Lovran" },
      { name: "Konzum",   lat: 45.2929, lng: 14.2749, maps: "https://www.google.com/maps/search/Konzum+Lovran" },
      { name: "Spar",     lat: 45.3441, lng: 14.3110, maps: "https://www.google.com/maps/search/Spar+Opatija" },
      { name: "Lidl",     lat: 45.3584, lng: 14.3314, maps: "https://www.google.com/maps/search/Lidl+Rijeka+Opatija" }
    ]
  };

  const COLORS = {
    apartment:  { bg: "#b8965a", border: "#8a6e3e" },
    restaurant: { bg: "#c0392b", border: "#922b21" },
    beach:      { bg: "#2a7fa5", border: "#1d5f7a" },
    grocery:    { bg: "#27ae60", border: "#1e8449" }
  };

  const EMOJIS = { apartment: "🏠", restaurant: "🍽️", beach: "🏖️", grocery: "🛒" };

  function makeMarker(cat, latlng) {
    const c = COLORS[cat];
    const marker = L.circleMarker(latlng, {
      radius: 9,
      fillColor: c.bg,
      color: c.border,
      weight: 2,
      fillOpacity: 1
    });
    marker.bindTooltip(EMOJIS[cat], {
      permanent: true,
      direction: "center",
      className: "map-emoji",
      offset: [0, 0]
    });
    return marker;
  }

  function initMap() {
    const el = document.getElementById("explore-map");
    if (!el || typeof L === "undefined") return;

    const map = L.map("explore-map", {
      center: [45.295, 14.295],
      zoom: 13,
      scrollWheelZoom: false
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 20
    }).addTo(map);

    setTimeout(() => map.invalidateSize(), 100);

    const layers = { apartment: [], restaurant: [], beach: [], grocery: [] };

    Object.entries(PLACES).forEach(([cat, places]) => {
      places.forEach(p => {
        const marker = makeMarker(cat, [p.lat, p.lng]);
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
