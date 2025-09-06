async function loadWeather() {
  try {
    // open-meteo API: Lovran (lat 45.2967, lon 14.2722)
    const url = "https://api.open-meteo.com/v1/forecast?latitude=45.2967&longitude=14.2722&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FBerlin";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather fetch failed");
    const data = await res.json();

    const days = data.daily.time;
    const max = data.daily.temperature_2m_max;
    const min = data.daily.temperature_2m_min;
    const codes = data.daily.weathercode;

    const wrap = document.getElementById("weather-widget");
    wrap.innerHTML = "";

    days.forEach((d, i) => {
      const card = document.createElement("div");
      card.className = "weather-day";

      const date = new Date(d);
      const options = { weekday: "short" };
      const weekday = date.toLocaleDateString(undefined, options);

      card.innerHTML = `
        <div class="w-day">${weekday}</div>
        <div class="w-icon">${iconForCode(codes[i])}</div>
        <div class="w-temp">${min[i]}° / ${max[i]}°C</div>
      `;
      wrap.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    document.getElementById("weather-widget").innerHTML = "<p>Weather data unavailable.</p>";
  }
}

function iconForCode(code) {
  // minimal set (Open-Meteo codes)
  if ([0].includes(code)) return "☀️";
  if ([1,2].includes(code)) return "⛅";
  if ([3].includes(code)) return "☁️";
  if ([45,48].includes(code)) return "🌫️";
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return "🌧️";
  if ([71,73,75,77,85,86].includes(code)) return "❄️";
  if ([95,96,99].includes(code)) return "⛈️";
  return "❓";
}

document.addEventListener("DOMContentLoaded", loadWeather);
