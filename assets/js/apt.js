function initApt(slug){
  const lang = (localStorage.getItem('lang')||'en').toLowerCase();
  const url  = `/content/apartments/${slug}/${lang}.json`;

  fetch(url, { cache:'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject('No JSON'))
    .then(data => {
      // title / intro
      if (data.title) {
        const h1 = document.querySelector('h1[data-i18n]');
        if (h1) h1.textContent = data.title;
      }
      if (data.intro) {
        const intro = document.getElementById('apt-intro');
        if (intro) intro.textContent = data.intro;
      }
      // features
      const fWrap = document.getElementById('apt-features');
      if (fWrap && Array.isArray(data.features)) {
        fWrap.innerHTML = '';
        data.features.forEach(x=>{
          const t=document.createElement('span');
          t.className='tag'; t.textContent=x;
          fWrap.appendChild(t);
        });
      }
      // gallery
      const gWrap = document.getElementById('apt-gallery');
      if (gWrap && Array.isArray(data.gallery)) {
        gWrap.innerHTML='';
        data.gallery.forEach(src=>{
          const img=document.createElement('img');
          img.src = src; img.alt = data.title || slug;
          gWrap.appendChild(img);
        });
      }
      // calendar (only if HTTPS and embeddable)
      const w = document.getElementById('apt-calendar-wrap');
      const i = document.getElementById('apt-calendar');
      if (data.calendar && /^https:\/\//i.test(data.calendar) && w && i) {
        i.src = data.calendar;
        w.style.display = 'block';
      } else if (w) {
        w.style.display = 'none';
      }
    })
    .catch(err => {
      console.warn('APT JSON load error:', err);
      const w = document.getElementById('apt-calendar-wrap');
      if (w) w.style.display = 'none';
    });
}
