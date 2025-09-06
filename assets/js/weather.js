function iconSVG(code){
  const sun   = '<svg viewBox="0 0 24 24" width="32" height="32" fill="#4da6ff"><circle cx="12" cy="12" r="5"/></svg>';
  const cloud = '<svg viewBox="0 0 24 24" width="32" height="32" stroke="#6b8e23" stroke-width="2" fill="none"><path d="M6 18h11a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2"/></svg>';
  const rain  = '<svg viewBox="0 0 24 24" width="32" height="32" stroke="#6b8e23" stroke-width="2" fill="none"><path d="M6 16h11a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/></svg>';
  const snow  = '<svg viewBox="0 0 24 24" width="32" height="32" stroke="#4da6ff" stroke-width="2" fill="none"><path d="M6 16h11a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2"/><path d="M9 19h0M12 19h0M15 19h0"/></svg>';
  const storm = '<svg viewBox="0 0 24 24" width="32" height="32" stroke="#6b8e23" stroke-width="2" fill="none"><path d="M6 16h11a4 4 0 0 0 0-8 6 6 0 0 0-11.5 2"/><path d="M10 22l2-4H9l3-6"/></svg>';
  const fog   = '<svg viewBox="0 0 24 24" width="32" height="32" stroke="#999" stroke-width="2" fill="none"><path d="M3 12h18M4 16h16M5 8h14"/></svg>';

  if ([0].includes(code)) return sun;                   // clear
  if ([1,2,3].includes(code)) return cloud;             // partly/overcast
  if ([45,48].includes(code)) return fog;               // fog
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return rain;  // rain
  if ([71,73,75,77,85,86].includes(code)) return snow;  // snow
  if ([95,96,99].includes(code)) return storm;          // thunder
  return cloud;
}

function weekdayName(date, lang) {
  const locales = { hr:'hr-HR', en:'en-GB', de:'de-DE', it:'it-IT', sl:'sl-SI', hu:'hu-HU', cs:'cs-CZ', sk:'sk-SK', uk:'uk-UA' };
  const loc = locales[lang] || 'en-GB';
  return date.toLocaleDateString(loc, { weekday:'short' });
}

async function loadWeather(){
  try{
    const url = "https://api.open-meteo.com/v1/forecast?latitude=45.2967&longitude=14.2722&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FZagreb";
    const res = await fetch(url, { cache:'no-store' });
    if(!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();

    const lang = (localStorage.getItem('lang')||'en').toLowerCase();
    const wrap = document.getElementById("weather-widget");
    wrap.innerHTML = "";

    data.daily.time.forEach((iso, i) => {
      const d = new Date(iso + "T00:00:00");
      const card = document.createElement("div");
      card.className = "weather-day";
      card.innerHTML = `
        <div class="w-day">${weekdayName(d, lang)}</div>
        <div class="w-icon">${iconSVG(data.daily.weathercode[i])}</div>
        <div class="w-temp">${Math.round(data.daily.temperature_2m_min[i])}° / ${Math.round(data.daily.temperature_2m_max[i])}°C</div>
      `;
      wrap.appendChild(card);
    });
  }catch(e){
    console.error(e);
    document.getElementById("weather-widget").innerHTML = "<p>Weather data unavailable.</p>";
  }
}

document.addEventListener("DOMContentLoaded", loadWeather);
