async function loadWeather() {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=45.3&longitude=14.27&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe%2FBerlin";

  try {
    const res = await fetch(url);
    const data = await res.json();

    const days = data.daily.time;
    const maxTemps = data.daily.temperature_2m_max;
    const minTemps = data.daily.temperature_2m_min;
    const codes = data.daily.weathercode;

    const tiles = document.getElementById("weather-tiles");
    tiles.innerHTML = "";

    days.forEach((day, i) => {
      const date = new Date(day);
      const options = { weekday: "short" };
      const dayName = date.toLocaleDateString(currentLang || "en", options);

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.innerHTML = `
        <div class="day">${dayName}</div>
        <div class="icon">${iconForCode(codes[i])}</div>
        <div class="temp">${minTemps[i]}° / ${maxTemps[i]}°</div>
      `;
      tiles.appendChild(tile);
    });
  } catch (err) {
    console.error("Weather error", err);
  }
}

function iconForCode(code) {
  // simplified icons
  if ([0].includes(code)) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if ([3].includes(code)) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "❓";
}

document.addEventListener("DOMContentLoaded", loadWeather);
