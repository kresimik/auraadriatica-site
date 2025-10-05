/* Weather widget — Lovran 7-day (Open-Meteo)
   Renders into #weather-widget

   Što radi:
   - Lokalizira nazive dana prema odabranom jeziku (localStorage.lang)
   - Prva dva dana prikazuje Today/Tomorrow (lokalizirano)
   - Ima skeleton dok učitava
   - Elegantan, kompaktan UI kartica
   - Re-render na promjenu jezika bez reloada stranice
*/
(function WeatherWidget(){
  const mount = document.getElementById('weather-widget');
  if (!mount) return;

  // Lovran
  const LAT = 45.291, LON = 14.272, TZ = 'Europe/Zagreb';

  // Jezik / locale
  function getLocale() {
    const saved = (localStorage.getItem('lang') || 'en').toLowerCase();
    const MAP = { hr:'hr-HR', en:'en-GB', de:'de-DE', it:'it-IT', sl:'sl-SI', hu:'hu-HU', cs:'cs-CZ', sk:'sk-SK', uk:'uk-UA' };
    return MAP[saved] || 'en-GB';
  }
  function labelsFor(locale){
    const map = {
      'hr-HR':{today:'Danas', tomorrow:'Sutra'},
      'de-DE':{today:'Heute', tomorrow:'Morgen'},
      'it-IT':{today:'Oggi', tomorrow:'Domani'},
      'sl-SI':{today:'Danes', tomorrow:'Jutri'},
      'hu-HU':{today:'Ma', tomorrow:'Holnap'},
      'cs-CZ':{today:'Dnes', tomorrow:'Zítra'},
      'sk-SK':{today:'Dnes', tomorrow:'Zajtra'},
      'uk-UA':{today:'Сьогодні', tomorrow:'Завтра'},
      'en-GB':{today:'Today', tomorrow:'Tomorrow'}
    };
    return map[locale] || map['en-GB'];
  }

  // Ikone (two-tone)
  const soft = 'rgba(77,166,255,.16)';
  const icons = {
    clear:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="12" fill="currentColor"/><g stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none" opacity=".95"><path d="M32 6v8"/><path d="M32 50v8"/><path d="M6 32h8"/><path d="M50 32h8"/><path d="M12 12l6 6"/><path d="M46 46l6 6"/><path d="M12 52l6-6"/><path d="M46 18l6-6"/></g><circle cx="32" cy="32" r="18" fill="${soft}"/></svg>`,
    partly:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><circle cx="22" cy="22" r="10" fill="currentColor"/><circle cx="22" cy="22" r="16" fill="${soft}"/><g><path d="M22 46h20a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor" opacity=".95"/><path d="M14 46h24" stroke="currentColor" stroke-width="4" opacity=".35"/></g></svg>`,
    cloudy:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 44h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/><path d="M14 48h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/></svg>`,
    rain:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 40h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/><path d="M14 44h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="4" opacity=".9"><path d="M22 48l-4 8"/><path d="M32 48l-4 8"/><path d="M42 48l-4 8"/></g></svg>`,
    snow:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 40h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/><path d="M14 44h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M22 48v8"/><path d="M28 48v8"/><path d="M34 48v8"/></g></svg>`,
    fog:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 38h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/><path d="M14 42h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".7"><path d="M12 48h40"/><path d="M16 54h32"/></g></svg>`,
    storm:`<svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><path d="M18 38h26a10 10 0 0 0 0-20 18 18 0 0 0-34 6" fill="${soft}"/><path d="M14 42h28a8 8 0 0 0 0-16 14 14 0 0 0-26 5" fill="currentColor"/><path d="M30 40l-8 14h6l-4 10 14-18h-6l4-6z" fill="currentColor" opacity=".95"/></svg>`
  };
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

  // Formatteri
  function fmtSetup(){
    const LOCALE = getLocale();
    return {
      LOCALE,
      dayFmt: new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }),
      lab: labelsFor(LOCALE)
    };
  }
  const todayISO = () => new Date().toISOString().slice(0,10);
  const tomorrowISO = () => new Date(Date.now()+86400000).toISOString().slice(0,10);
  const t = n => `${Math.round(n)}°`;

  function dayLabel(iso, dayFmt, lab){
    if (iso === todayISO()) return lab.today;
    if (iso === tomorrowISO()) return lab.tomorrow;
    let s = dayFmt.format(new Date(iso + 'T12:00:00'));
    s = s.replace(/\.$/, '');                  // npr. "pon."
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // Skeleton
  function showSkeleton(){
    mount.innerHTML = `
      <div class="wx-grid" aria-busy="true">
        ${Array.from({length:7}).map(()=>`
          <article class="wx-card wx-skel" aria-hidden="true">
            <div class="wx-day">—</div>
            <div class="wx-icon"><div class="wx-ph"></div></div>
            <div class="wx-temp"><strong>—</strong> / <span>—</span></div>
          </article>`).join('')}
      </div>`;
  }

  function card(iso, code, tmin, tmax, dayFmt, lab){
    const key = codeToKey(code);
    return `
      <article class="wx-card" aria-label="${iso}">
        <div class="wx-day">${dayLabel(iso, dayFmt, lab)}</div>
        <div class="wx-icon">${icons[key] || icons.cloudy}</div>
        <div class="wx-temp">
          <strong>${t(tmax)}</strong>
          <span class="wx-sep">/</span>
          <span>${t(tmin)}</span>
        </div>
      </article>`;
  }

  // Render
  function render(data){
    const d = data && data.daily;
    if (!d || !d.time || !d.weathercode) throw new Error('No data');

    const { dayFmt, lab } = fmtSetup();
    const len = Math.min(d.time.length, 7);
    let html = '<div class="wx-grid">';
    for (let i=0;i<len;i++){
      html += card(
        d.time[i],
        Number(d.weathercode[i]),
        Number(d.temperature_2m_min[i]),
        Number(d.temperature_2m_max[i]),
        dayFmt, lab
      );
    }
    html += '</div>';
    mount.innerHTML = html;
  }

  // Fetch
  const baseURL = new URL('https://api.open-meteo.com/v1/forecast');
  baseURL.search = new URLSearchParams({
    latitude: LAT, longitude: LON, timezone: TZ,
    daily: 'weathercode,temperature_2m_max,temperature_2m_min',
    forecast_days: '7'
  }).toString();

  async function loadAndRender(){
    showSkeleton();
    try{
      const r = await fetch(baseURL.toString(), { cache:'no-store' });
      if (!r.ok) throw new Error('Network');
      const json = await r.json();
      render(json);
    }catch(e){
      console.warn('Weather error:', e);
      mount.innerHTML = `<p class="wx-error">Weather unavailable at the moment.</p>`;
    }
  }

  // Init
  loadAndRender();

  // Re-render na promjenu jezika (isti event koji koristiš za i18n dropdown)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.lang-menu button[data-lang]');
    if (!btn) return;
    // Pričekaj da tvoj i18n promijeni localStorage.lang pa re-render
    setTimeout(loadAndRender, 0);
  });
})();
