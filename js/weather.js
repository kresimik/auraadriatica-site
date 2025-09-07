// Minimal, čisto, sve boje dolaze iz CSS-a (brand blue).
// Prikazuje 7-dnevnu prognozu za Lovran/Ičići (Open-Meteo).

document.addEventListener("DOMContentLoaded", () => {
  const widget = document.getElementById("weather-widget");
  if (!widget) return;

  const lat = 45.291;  // Lovran/Ičići approx
  const lon = 14.276;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FBerlin`;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.daily) return;

      const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

      const grid = document.createElement("div");
      grid.className = "wx-grid";

      data.daily.time.forEach((iso, i) => {
        const d = new Date(iso);
        const card = document.createElement("div");
        card.className = "wx-card";

        const day = document.createElement("div");
        day.className = "wx-day";
        day.textContent = daysShort[d.getDay()];
        card.appendChild(day);

        const icon = document.createElement("div");
        icon.className = "wx-icon";
        icon.innerHTML = iconForCode(data.daily.weathercode[i]);
        card.appendChild(icon);

        const temp = document.createElement("div");
        temp.className = "wx-temp";
        temp.textContent = `${data.daily.temperature_2m_min[i]}° / ${data.daily.temperature_2m_max[i]}°C`;
        card.appendChild(temp);

        grid.appendChild(card);
      });

      widget.innerHTML = "";
      widget.appendChild(grid);
    })
    .catch(console.error);

  // SVG ikone — koriste currentColor ⇒ boju zadaje CSS (brand blue)
  function iconForCode(code){
    // Sun (clear)
    const sun = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="24" cy="24" r="8" fill="currentColor"/>
        <line x1="24" y1="4"  x2="24" y2="12"/>
        <line x1="24" y1="36" x2="24" y2="44"/>
        <line x1="4"  y1="24" x2="12" y2="24"/>
        <line x1="36" y1="24" x2="44" y2="24"/>
        <line x1="9"  y1="9"  x2="14" y2="14"/>
        <line x1="34" y1="34" x2="39" y2="39"/>
        <line x1="9"  y1="39" x2="14" y2="34"/>
        <line x1="34" y1="14" x2="39" y2="9"/>
      </svg>`;

    // Partly cloudy
    const sunCloud = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="16" cy="16" r="5" fill="currentColor"/>
        <path d="M28 34H16a6 6 0 1 1 3.5-11 7 7 0 0 1 13.5 3H35a5 5 0 0 1 0 10h-7z" fill="none"/>
      </svg>`;

    // Cloud
    const cloud = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M30 36H16a8 8 0 1 1 4.5-14.7A9 9 0 0 1 39 23h1a7 7 0 0 1 0 14h-10z"/>
      </svg>`;

    // Rain
    const rain = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M30 30H16a8 8 0 1 1 4.5-14.7A9 9 0 0 1 39 17h1a7 7 0 0 1 0 13h-10z"/>
        <line x1="18" y1="34" x2="18" y2="42"/>
        <line x1="24" y1="34" x2="24" y2="42"/>
        <line x1="30" y1="34" x2="30" y2="42"/>
      </svg>`;

    // Snow (simple)
    const snow = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M30 30H16a8 8 0 1 1 4.5-14.7A9 9 0 0 1 39 17h1a7 7 0 0 1 0 13h-10z"/>
        <text x="18" y="41" font-size="12" fill="currentColor">*</text>
        <text x="26" y="41" font-size="12" fill="currentColor">*</text>
      </svg>`;

    // Thunder
    const thunder = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M30 28H16a8 8 0 1 1 4.5-14.7A9 9 0 0 1 39 15h1a7 7 0 0 1 0 13h-10z"/>
        <polygon points="24,20 30,20 24,32 30,32 22,44 24,34 18,34" fill="currentColor" stroke="none"/>
      </svg>`;

    // Fog / mist
    const fog = `
      <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="8" y1="20" x2="40" y2="20"/>
        <line x1="8" y1="26" x2="40" y2="26"/>
        <line x1="8" y1="32" x2="40" y2="32"/>
      </svg>`;

    // Mape Open-Meteo weathercode -> ikona
    if ([0].includes(code)) return sun;                           // jasno
    if ([1, 2, 3].includes(code)) return sunCloud;                // pretežno/umjereno oblačno
    if ([45, 48].includes(code)) return fog;                      // magla
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return rain;   // kišica/kiša/pljuskovi
    if ([71, 73, 75, 85, 86].includes(code)) return snow;         // snijeg
    if ([95, 96, 99].includes(code)) return thunder;              // grmljavina
    return cloud;                                                 // default: oblačno
  }
});
