/* Weather widget – Lovran 7-day (Open-Meteo)
   Renders into #weather-widget using colorful SVG icons
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

  // Colorful SVG icons
  const icons = {
    clear: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="14" fill="#FFD93B"/>
        <g stroke="#FFD93B" stroke-width="4">
          <line x1="32" y1="4" x2="32" y2="14"/>
          <line x1="32" y1="50" x2="32" y2="60"/>
          <line x1="4" y1="32" x2="14" y2="32"/>
          <line x1="50" y1="32" x2="60" y2="32"/>
          <line x1="12" y1="12" x2="20" y2="20"/>
          <line x1="44" y1="44" x2="52" y2="52"/>
          <line x1="12" y1="52" x2="20" y2="44"/>
          <line x1="44" y1="20" x2="52" y2="12"/>
        </g>
      </svg>`,
    partly: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <circle cx="24" cy="24" r="12" fill="#FFD93B"/>
        <ellipse cx="38" cy="34" rx="16" ry="12" fill="#90A4AE"/>
      </svg>`,
    cloudy: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <ellipse cx="26" cy="38" rx="16" ry="12" fill="#90A4AE"/>
        <ellipse cx="42" cy="36" rx="16" ry="12" fill="#B0BEC5"/>
      </svg>`,
    rain: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <ellipse cx="32" cy="26" rx="18" ry="12" fill="#90A4AE"/>
        <line x1="20" y1="40" x2="20" y2="54" stroke="#2196F3" stroke-width="4" stroke-linecap="round"/>
        <line x1="32" y1="42" x2="32" y2="58" stroke="#2196F3" stroke-width="4" stroke-linecap="round"/>
        <line x1="44" y1="40" x2="44" y2="54" stroke="#2196F3" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
    snow: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <ellipse cx="32" cy="26" rx="18" ry="12" fill="#B0BEC5"/>
        <g stroke="#00BCD4" stroke-width="3" stroke-linecap="round">
          <line x1="20" y1="42" x2="20" y2="52"/>
          <line x1="32" y1="44" x2="32" y2="56"/>
          <line x1="44" y1="42" x2="44" y2="52"/>
        </g>
      </svg>`,
    fog: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <ellipse cx="32" cy="26" rx="18" ry="12" fill="#CFD8DC"/>
        <line x1="16" y1="44" x2="48" y2="44" stroke="#90A4AE" stroke-width="4" stroke-linecap="round"/>
        <line x1="20" y1="52" x2="52" y2="52" stroke="#90A4AE" stroke-width="4" stroke-linecap="round"/>
      </svg>`,
    storm: `
      <svg width="42" height="42" viewBox="0 0 64 64">
        <ellipse cx="32" cy="26" rx="18" ry="12" fill="#90A4AE"/>
        <polygon points="28,38 36,38 30,50 38,50 28,62" fill="#FFD93B"/>
      </svg>`
  };

  const dayName = (iso) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  };

  const fmtTemp = (t) => `${Math.round(t)}°`;

  const buildCard = (date, code, tmin, tmax) => {
    const key = codeToKey(code);
    return `
      <div class="wx-card">
        <div class="wx-day">${dayName(date)}</div>
        <div class="wx-icon">${icons[key] || icons.cloudy}</div>
        <div class="wx-temp">
          <strong>${fmtTemp(tmax)}</strong> / <span>${fmtTemp(tmin)}</span>
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
