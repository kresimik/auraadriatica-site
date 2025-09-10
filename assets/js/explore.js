// /assets/js/explore.js
(function(){
  const getLang = () => (localStorage.getItem('lang') || 'en').toLowerCase();
  const qs = (s) => document.querySelector(s);

  const fillList = (id, arr) => {
    const ul = document.getElementById(id);
    if (!ul) return;
    ul.innerHTML = '';
    if (Array.isArray(arr)) {
      arr.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
    }
  };

  const fetchJson = async (lang) => {
    const url = `/content/explore/${lang}.json`;
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) throw Object.assign(new Error('JSON not found'), { code: res.status, lang });
    return res.json();
  };

  const load = async () => {
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

  document.addEventListener('DOMContentLoaded', () => {
    load().then(data => {
      // Hero
      if (data.title) qs('#ex-hero-title').textContent = data.title;
      if (data.subtitle) qs('#ex-hero-sub').textContent = data.subtitle;

      // Intro
      if (data.intro) qs('#ex-intro').textContent = data.intro;

      // Lists
      fillList('ex-do-list',      data.things_to_do);
      fillList('ex-beaches-list', data.beaches);
      fillList('ex-trips-list',   data.day_trips);
      fillList('ex-food-list',    data.food);
    }).catch(err => {
      console.warn('Explore load error:', err);
    });
  });
})();
