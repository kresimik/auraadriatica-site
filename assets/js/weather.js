
(function(){
  const coords = { lat: 45.291, lon: 14.276 }; // Lovran approx
  const tz = 'Europe/Zagreb';
  const api = (lang)=>`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=${encodeURIComponent(tz)}&forecast_days=7`;

  const codeToIcon = (code)=>{
    if(code===0) return '☀️';
    if(code===1 || code===2) return '🌤️';
    if(code===3) return '☁️';
    if(code===45 || code===48) return '🌫️';
    if([51,53,55].includes(code)) return '🌦️';
    if([61,63,65,80,81,82].includes(code)) return '🌧️';
    if([71,73,75,85,86].includes(code)) return '🌨️';
    if([95,96,99].includes(code)) return '⛈️';
    return '❓';
  };

  const dayName = (dateStr, lang)=>{
    try{
      const d = new Date(dateStr+'T00:00:00');
      return d.toLocaleDateString(lang||'en', { weekday: 'short' });
    }catch{ return dateStr; }
  };

  async function getForecast(lang){
    const res = await fetch(api(lang));
    const j = await res.json();
    return j && j.daily ? j.daily : null;
  }

  async function renderWeather(lang){
    const mount = document.getElementById('weather-tiles');
    if(!mount) return;
    mount.innerHTML = '<div class="small">Loading…</div>';
    try{
      const daily = await getForecast(lang);
      if(!daily){ mount.textContent = '—'; return; }
      const html = daily.time.map((t, i)=>{
        const icon = codeToIcon(daily.weathercode[i]);
        const tmax = Math.round(daily.temperature_2m_max[i]);
        const tmin = Math.round(daily.temperature_2m_min[i]);
        return `<div class="tile">
          <div class="day">${dayName(t, lang)}</div>
          <div class="icon">${icon}</div>
          <div class="temps"><span class="tmax">${tmax}°</span> / <span class="tmin">${tmin}°</span></div>
        </div>`;
      }).join('');
      mount.innerHTML = html;
    }catch(e){
      console.error(e);
      mount.innerHTML = '<div class="small">Weather unavailable.</div>';
    }
  }

  window.renderWeather = renderWeather;
  document.addEventListener('DOMContentLoaded', ()=> renderWeather(localStorage.getItem('lang')||'en'));
})();
