document.addEventListener("DOMContentLoaded", () => {
  const widget = document.getElementById("weather-widget");
  if (!widget) return;

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=45.3&longitude=14.3&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FBerlin`)
    .then(r => r.json())
    .then(data => {
      if (!data || !data.daily) return;

      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const today = new Date();
      widget.innerHTML = "";

      const grid = document.createElement("div");
      grid.className = "wx-grid";

      data.daily.time.forEach((d,i)=>{
        const date = new Date(d);
        const card = document.createElement("div");
        card.className = "wx-card";

        // Dan
        const day = document.createElement("div");
        day.className = "wx-day";
        day.textContent = days[date.getDay()];
        card.appendChild(day);

        // Ikona
        const icon = document.createElement("div");
        icon.className = "wx-icon";
        icon.innerHTML = weatherIcon(data.daily.weathercode[i]); 
        card.appendChild(icon);

        // Temp
        const temp = document.createElement("div");
        temp.className = "wx-temp";
        temp.textContent = `${data.daily.temperature_2m_min[i]}° / ${data.daily.temperature_2m_max[i]}°C`;
        card.appendChild(temp);

        grid.appendChild(card);
      });

      widget.appendChild(grid);
    })
    .catch(console.error);

  function weatherIcon(code){
    // minimalni set ikona — SVG boja se definira u CSS-u (var(--brand-blue))
    if ([0].includes(code)) return `<svg width="28" height="28" fill="currentColor"><circle cx="14" cy="14" r="8"/></svg>`;
    if ([1,2,3].includes(code)) return `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="14" cy="14" r="8"/></svg>`;
    if ([45,48].includes(code)) return `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="20" x2="23" y2="20"/></svg>`;
    if ([51,61,80].includes(code)) return `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="18" x2="8" y2="24"/><line x1="14" y1="18" x2="14" y2="24"/><line x1="20" y1="18" x2="20" y2="24"/></svg>`;
    if ([71,85].includes(code)) return `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><text x="5" y="20" font-size="12">*</text></svg>`;
    if ([95,96,99].includes(code)) return `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><polygon points="14,4 18,20 10,20"/></svg>`;
    return `<svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><circle cx="14" cy="14" r="10"/></svg>`;
  }
});
