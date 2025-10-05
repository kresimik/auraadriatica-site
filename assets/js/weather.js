/* Weather widget — Lovran 7-day (Open-Meteo)
   Renders into #weather-widget
   - lokalizirani nazivi dana (preko Intl.DateTimeFormat i tvog lang-a)
   - Today / Tomorrow (lokalizirano)
   - dva-tonska SVG ikonografija (preuzeta iz postojeće verzije)
*/
(function(){
  const mount = document.getElementById('weather-widget');
  if (!mount) return;

  // --- Lokacija (Lovran) + vremenska zona ---
  const LAT = 45.291, LON = 14.272, TZ = 'Europe/Zagreb';

  // --- Jezik i locale ---
  const saved = (localStorage.getItem('lang') || 'en').toLowerCase();
  const LOCALE_MAP = {
    hr: 'hr-HR', en: 'en-GB', de: 'de-DE', it: 'it-IT', sl: 'sl-SI',
    hu: 'hu-HU', cs: 'cs-CZ', sk: 'sk-SK', uk: 'uk-UA'
  };
  const LOCALE = LOCALE_MAP[saved] || 'en-GB';

  // Lokalizirane oznake "danas/sutra"
  const TODAY_TMR = {
    'hr-HR': { today: 'Danas', tomorrow: 'Sutra' },
    'de-DE': { today: 'Heute', tomorrow: 'Morgen' },
    'it-IT': { today: 'Oggi', tomorrow: 'Domani' },
    'sl-SI': { today: 'Danes', tomorrow: 'Jutri' },
    'hu-HU': { today: 'Ma', tomorrow: 'Holnap' },
    'cs-CZ': { today: 'Dnes', tomorrow: 'Zítra' },
    'sk-SK': { today: 'Dnes', tomorrow: 'Zajtra' },
    'uk-UA': { today: 'Сьогодні', tomorrow: 'Завтра' },
    'en-GB': { today: 'Today', tomorrow: 'Tomorrow' }
  }[LOCALE] || { today: 'Today', tomorrow: 'Tomorrow' };

  // --- Ikone ---
  const soft = 'rgba(77,166,255,.22)';
  const icons = {
    clear:
      `<svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="12" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" opacity=".95">
          <path d="M32 6v8"/><path d="M32 50v8"/>
          <path d="M6 32h8"/><path d="M50 32h8"/>
          <path d="M12 12l6 6"/><path d="M46 46l6 6"/>
          <path d="M12 52l6-6"/><path d="M46 18l6-6"/>
        </g>
        <circle cx="32" cy="32" r="18" fill="${soft}"/>
      </svg>`,
    partly:
      `<svg width="40" height="40" viewBox="0 0 64 64">
        <circle cx="22" cy="22" r="10" fill="currentColor"/>
        <circle cx="22" cy="22" r="16" fill="${soft}"/>
        <g>
          <path d="M22 46h20a8 8 0 0 0 0-16 14 14 0 0 0-26 5"
                fill="currentColor" opacity=".95"/>
          <path d="M14 46h24" stroke="currentColor" stroke-width="4" opacity=".35"/>
        </g>
      </svg>`,
    cloudy:
      `<svg width="40" height="40" viewBox="0 0 64 64">
        <path d="M18 44h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/>
        <path d="M14 48h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/>
      </svg>`,
    rain:
      `<svg width="40" height="40" viewBox="0 0 64 64">
        <path d="M18 40h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/>
        <path d="M14 44h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/>
        <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="4" opacity=".9">
          <path d="M22 48l-4 8"/><path d="M32 48l-4 8"/><path d="M42 48l-4 8"/>
        </g>
      </svg>`,
    snow:
      `<svg width="40" height="40" viewBox="0 0 64 64">
        <path d="M18 40h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/>
        <path d="M14 44h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <path d="M22 48v8"/><path d="M28 48v8"/><path d="M34 48v8"/>
        </g>
      </svg>`,
    fog:
      `<svg width="40" height="40" viewBox="0 0 64 64">
        <path d="M18 38h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/>
        <path d="M14 42h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".7">
          <path d="M12 48h40"/><path d="M16 54h32"/>
        </g>
      </svg>`,
    storm:
      `<svg width="40" height="40" viewBox="0 0 64 64">
        <path d="M18 38h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/>
        <path d="M14 42h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/>
        <path d="M30 40l-8 14h6l-4 10 14-18h-6l4-6z" fill="currentColor" opacity=".95"/>
      </svg>`
  };

  // --- WMO kod → tip ikone ---
  function codeToKey(code){
    if (code === 0) return 'clear';
    if ([1,2].includes(code)) return 'partly';
    if (code === 3) return 'cloudy';
    if ([45,48].includes(code)) return 'fog';
    if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return 'rain';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([95,96,99].includes(code)) return 'storm';
    return 'cloudy';
  }

  // --- Formatteri ---
  const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' });
  const todayISO = new Date().toISOString().slice(0,10);
  const tomorrowISO = new Date(Date.now()+86400000).toISOString().slice(0,10);

  function dayLabel(iso){
    if (iso === todayISO)   return TODAY_TMR.today;
    if (iso === tomorrowISO) return TODAY_TMR.tomorrow;
    const d = new Date(iso + 'T12:00:00');
    // Neka bude npr. "Pon" umjesto "pon" — capitalizacija prve oznake ovisi o locale-u
    let s = dayFmt.format(d);
    // Ponekad locale vrati točku ("pon.") — makni ju radi čistoće
    s = s.replace(/\.$/, '');
    // Osiguraj početno veliko slovo (za slučaj nekih locale-a)
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const fmtTemp = (t) => `${Math.round(t)}°`;

  function buildCard(dateISO, code, tmin, tmax){
    const key = codeToKey(code);
    return `
      <div class="wx-card">
        <div class="wx-day">${dayLabel(dateISO)}</div>
        <div class="wx-icon">${icons[key] || icons.cloudy}</div>
        <div class="wx-temp">
          <strong>${fmtTemp(tmax)}</strong> / <span>${fmtTemp(tmin)}</span>
        </div>
      </div>
    `;
  }

  // --- Fetch ---
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude:  LAT,
    longitude: LON,
    timezone:  TZ,
    daily:     'weathercode,temperature_2m_max,temperature_2m_min',
    forecast_days: '7'
  }).toString();

  // Prikaži lightweight skeleton dok čekaš
  mount.innerHTML = `
    <div class="wx-grid">
      ${Array.from({length:7}).map(()=>`
        <div class="wx-card" style="opacity:.6">
          <div class="wx-day">—</div>
          <div class="wx-icon"><div style="width:40px;height:40px;background:rgba(0,0,0,.06);border-radius:8px"></div></div>
          <div class="wx-temp"><strong>—</strong> / <span>—</span></div>
        </div>`).join('')}
    </div>
  `;

  fetch(url.toString(), { cache: 'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Network')))
    .then(data => {
      const d = data && data.daily;
      if (!d || !d.time || !d.weathercode) throw new Error('No data');
      const len = Math.min(d.time.length, 7);
      let html = '<div class="wx-grid">';
      for (let i = 0; i < len; i++){
        html += buildCard(
          d.time[i],
          Number(d.weathercode[i]),
          Number(d.temperature_2m_min[i]),
          Number(d.temperature_2m_max[i])
        );
      }
      html += '</div>';
      mount.innerHTML = html;
    })
    .catch(err => {
      console.warn('Weather error:', err);
      mount.innerHTML = `<p style="color:var(--muted)">Weather unavailable at the moment.</p>`;
    });

})();
