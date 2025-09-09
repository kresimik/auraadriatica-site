/* Apartment page bootstrap
   - initApt('olive') / initApt('onyx')
   - loads /content/apartments/<slug>/<lang>.json with fallback to 'en'
   - renders intro, features, gallery
   - shows availability calendar (custom or Zoho iframe fallback)
*/

function initApt(slug){
  const getLang = () => (localStorage.getItem('lang') || 'en').toLowerCase();

  const qs = (sel) => document.querySelector(sel);
  const setText = (sel, txt) => { const el = qs(sel); if (el && typeof txt === 'string') el.textContent = txt; };
  const setHTML = (el, html) => { if (el) el.innerHTML = html; };

  const elIntro   = document.getElementById('apt-intro');
  const elFeat    = document.getElementById('apt-features');
  const elGal     = document.getElementById('apt-gallery');
  const elWrapCal = document.getElementById('apt-calendar-wrap');
  const elCal     = document.getElementById('apt-calendar'); // kod nas <div>, ali može i iframe

  // Loading state
  if (elIntro && !elIntro.textContent) elIntro.textContent = 'Loading…';
  if (elFeat)  setHTML(elFeat, '<span class="tag">…</span>');
  if (elGal)   setHTML(elGal,  '');

  const fetchJson = async (lang) => {
    const url = `/content/apartments/${slug}/${lang}.json`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw Object.assign(new Error('JSON not found'), { code: res.status, lang });
    return res.json();
  };

  const loadWithFallback = async () => {
    const lang = getLang();
    try {
      return await fetchJson(lang);
    } catch (e) {
      if (lang !== 'en') {
        try { return await fetchJson('en'); }
        catch (_) { throw e; }
      }
      throw e;
    }
  };

  loadWithFallback()
    .then((data) => {
      // ---- Title / meta
      if (data.page_title) document.title = data.page_title;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && data.meta_desc) metaDesc.setAttribute('content', data.meta_desc);

      // H1 override
      if (data.title) setText('h1[data-i18n]', data.title);

      // Hero subtitle
      const heroP = document.querySelector('.hero p');
      if (heroP) {
        const altIntro = data[`${slug}_intro`] || data.intro_short || data.intro;
        if (altIntro) heroP.textContent = altIntro;
      }

      // Intro long
      if (elIntro) elIntro.textContent = data.intro || '';

      // Features
      if (elFeat) {
        elFeat.innerHTML = '';
        if (Array.isArray(data.features)) {
          data.features.forEach(f => {
            const t = document.createElement('span');
            t.className = 'tag';
            t.textContent = f;
            elFeat.appendChild(t);
          });
        }
      }

      // Gallery
      if (elGal) {
        elGal.innerHTML = '';
        if (Array.isArray(data.gallery)) {
          data.gallery.forEach(src => {
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = data.title || slug;
            img.src = src;
            elGal.appendChild(img);

            // preload
            const l = new Image();
            l.src = src;
          });
        }
      }

      // Calendar
      if (elWrapCal) elWrapCal.style.display = 'none';
      if (elCal && elWrapCal) {
        if (Array.isArray(data.availability) && data.availability.length) {
          // naš mini kalendar
          elWrapCal.style.display = 'block';
          const savedLang = getLang();
          const accent = (slug === 'olive') ? 'var(--brand-olive)' : 'var(--brand-onyx)';
          window.renderAvailabilityCalendar(elCal, {
            ranges: data.availability,
            months: 3,
            locale: {
              hr:'hr-HR', en:'en-GB', de:'de-DE', it:'it-IT', sl:'sl-SI',
              hu:'hu-HU', cs:'cs-CZ', sk:'sk-SK', uk:'uk-UA'
            }[savedLang] || undefined,
            accent
          });
        } else if (data.calendar && /^https:\/\//i.test(data.calendar)) {
          // fallback na Zoho iframe
          const iframe = document.createElement('iframe');
          iframe.src = data.calendar;
          iframe.className = 'calendar-iframe';
          iframe.loading = 'lazy';
          elCal.innerHTML = '';
          elCal.appendChild(iframe);
          elWrapCal.style.display = 'block';
        }
      }
    })
    .catch((err) => {
      console.warn('APT JSON load error:', err);
      if (elIntro) elIntro.textContent = 'Content currently unavailable.';
      if (elFeat)  elFeat.innerHTML   = '';
      if (elGal)   elGal.innerHTML    = '';
      if (elWrapCal) elWrapCal.style.display = 'none';
    });
}
