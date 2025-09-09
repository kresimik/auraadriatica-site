/* Weather widget – Lovran 7-day (Open-Meteo)
   Renders into #weather-widget using brand-blue SVG icons (inherit currentColor)
   Requires CSS selectors from style.css: .weather .wx-grid .wx-card .wx-day .wx-icon .wx-temp
*/

(function(){
  const mount = document.getElementById('weather-widget');
  if (!mount) return;

  // Lovran approx coords
  const LAT = 45.291;
  const LON = 14.272;
  const TZ  = 'Europe/Zagreb';

  // Map Open-Meteo WMO codes to simple icon keys
  const codeToKey = (code) => {
    if ([0].includes(code)) return 'clear';
    if ([1,2].includes(code)) return 'partly';
    if ([3].includes(code)) return 'cloudy';
    if ([45,48].includes(code)) return 'fog';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([95,96,99].includes(code)) return 'storm';
    return 'cloudy';
  };

  // Minimal SVG icons
  const icons = {
    clear:  `<svg width="36" height="36" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" fill="none"><path d="M12 1v3"/><path d="M12 20v3"/><path d="M4.22 4.22l2.12 2.12"/><path d="M17.66 17.66l2.12 2.12"/><path d="M1 12h3"/><path d="M20 12h3"/><path d="M4.22 19.78l2.12-2.12"/><path d="M17.66 6.34l2.12-2.12"/></g></svg>`,
    partly:`<svg width="36" height="36" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="9" r="3" fill="currentColor"/><path d="M1 9h2M8 2v2M14 9h2M3.6 4.6l1.4 1.4M11 4.6l1.4-1.4"/></g><path d="M7 18h9a3 3 0 0 0 0-6 5 5 0 0 0-9 2" fill="currentColor"/></svg>`,
    cloudy:`<svg width="36" height="36" viewBox="0 0 24 24"><path d="M7 18h10a3 3 0 0 0 0-6 5.5 5.5 0 0 0-10.5 1" fill="currentColor"/></svg>`,
    rain:  `<svg width="36" height="36" viewBox="0 0 24 24"><path d="M7 16h10a3 3 0 0 0 0-6 5.5 5.5 0 0 0-10.5 1" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path d="M9 19l-1 2"/><path d="M12 19l-1 2"/><path d="M15 19l-1 2"/></g></svg>`,
    snow:  `<svg width="36" height="36" viewBox="0 0 24 24"><path d="M7 16h10a3 3 0 0 0 0-6 5.5 5.5 0 0 0-10.5 1" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path d="M9 19v2"/><path d="M12 19v2"/><path d="M15 19v2"/></g></svg>`,
    fog:   `<svg width="36" height="36" viewBox="0 0 24 24"><path d="M7 16h10a3 3 0 0 0 0-6 5.5 5.5 0 0 0-10.5 1" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"><path d="M4 19h16"/><path d="M6 21h12"/></g></svg>`,
    storm: `<svg width="36" height="36" viewBox="0 0 24 24"><path d="M7 15h10a3 3 0 0 0 0-6 5.5 5.5 0 0 0-10.5 1" fill="currentColor"/><path d="M11 14l-2 4h2l-1 4 4-6h-2l1-2z" fill="currentColor"/></svg>`
  };

  const dayName = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  };

  const fmtTemp = (t) => Math.round(t);

  const buildCard = (date, code, tmin, tmax) => {
    const key = codeToKey(code);

    // odredi klasu po temperaturi
    const hot = tmax >= 25 ? 'hot' : '';
    const cold = tmax <= 15 ? 'cold' : '';
    const tempClass = hot || cold ? ` class="wx-temp ${hot||cold}"` : ' class="wx-temp"';

    return `
      <div class="wx-card">
        <div class="wx-day">${dayName(date)}</div>
        <div class="wx-icon">${icons[key] || icons.cloudy}</div>
        <div${tempClass}>
          <strong>${fmtTemp(tmax)}°</strong> / <span>${fmtTemp(tmin)}°</span>
        </div>
      </div>
    `;
  };

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude:  LAT,
    longitude: LON,
    timezone:  TZ,
    daily:     'weathercode,temperature_2m_max,temperature_2m_min'
  }).toString();

  fetch(url.toString(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Network')))
    .then(data => {
      const d = data && data.daily;
      if (!d || !d.time) throw new Error('No data');

      let html = '<div class="wx-grid">';
      for (let i = 0; i < d.time.length; i++){
        html += buildCard(d.time[i], d.weathercode[i], d.temperature_2m_min[i], d.temperature_2m_max[i]);
      }
      html += '</div>';
      mount.innerHTML = html;
    })
    .catch(err => {
      console.warn('Weather error:', err);
      mount.innerHTML = `<p style="color:#666">Weather unavailable at the moment.</p>`;
    });
})();
