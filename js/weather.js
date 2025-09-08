// Weather widget – Lovran (Open-Meteo), brand-blue ikone
// Uključi na index.html: <script src="/assets/js/weather.js" defer></script>

(function(){
  const mount = document.getElementById('weather-widget');
  if(!mount) return;

  // Lovran (otprilike)
  const LAT = 45.290;
  const LON = 14.272;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FBelgrade`;

  // brand-blue ikonice (SVG)
  const ICONS = {
    sun:       '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>',
    cloud:     '<svg viewBox="0 0 24 24"><path d="M6 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.31 2"/></svg>',
    cloud_sun: '<svg viewBox="0 0 24 24"><path d="M6 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.31 2"/><circle cx="5" cy="5" r="2.5"/></svg>',
    rain:      '<svg viewBox="0 0 24 24"><path d="M6 16h10a4 4 0 0 0 0-8 6 6 0 0 0-11.31 2"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>',
    thunder:   '<svg viewBox="0 0 24 24"><path d="M6 16h10a4 4 0 0 0 0-8 6 6 0 0 0-11.31 2"/><path d="M13 12l-3 6h3l-1 4 4-7h-3l1-3z"/></svg>',
    snow:      '<svg viewBox="0 0 24 24"><path d="M12 2v20M4 6l16 12M4 18L20 6"/></svg>',
    fog:       '<svg viewBox="0 0 24 24"><path d="M3 9h18M3 12h18M3 15h18"/></svg>'
  };

  // Open-Meteo weathercode mapa → ikona
  function iconFor(code){
    // referenca: https://open-meteo.com/en/docs
    if (code === 0) return ICONS.sun;                                // clear
    if (code === 1 || code === 2) return ICONS.cloud_sun;            // mainly/partly clear
    if (code === 3) return ICONS.cloud;                              // overcast
    if (code === 45 || code === 48) return ICONS.fog;                // fog
    if ([51,53,55,61,63,65,80,81,82].includes(code)) return ICONS.rain;     // drizzle/rain
    if ([71,73,75,77,85,86].includes(code)) return ICONS.snow;              // snow
    if ([95,96,99].includes(code)) return ICONS.thunder;                    // thunder
    return ICONS.cloud;
  }

  function dayName(ts){
    const d = new Date(ts);
    return d.toLocaleDateString((localStorage.getItem('lang')||'en'), { weekday: 'short' });
  }

  fetch(url)
    .then(r => r.json())
    .then(data => {
      const { daily } = data;
      if(!daily) return;

      const frag = document.createDocumentFragment();
      for (let i=0; i<daily.time.length; i++){
        const el = document.createElement('div');
        el.className = 'day';
        el.innerHTML = `
          <div class="name">${dayName(daily.time[i])}</div>
          <div class="icon">${iconFor(daily.weathercode[i])}</div>
          <div class="temps">
            <span>${Math.round(daily.temperature_2m_min[i])}°</span>
            <small> / ${Math.round(daily.temperature_2m_max[i])}°C</small>
          </div>
        `;
        frag.appendChild(el);
      }
      mount.innerHTML = '';
      mount.appendChild(frag);
    })
    .catch(console.error);
})();
