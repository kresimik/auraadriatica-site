
(function(){
  const buttonsSelector = '.lang [data-lang]';
  const transAttr = 'data-i18n';
  const defaultLang = localStorage.getItem('lang') || 'en';

  async function loadLang(lang){
    try{
      const res = await fetch(`/content/${lang}.json?v=${Date.now()}`);
      const dict = await res.json();
      document.documentElement.lang = lang;
      document.querySelectorAll(`[${transAttr}]`).forEach(el=>{
        const key = el.getAttribute(transAttr);
        const val = getByPath(dict, key);
        if(typeof val === 'string'){ el.textContent = val; }
      });
      if(dict.info_list && Array.isArray(dict.info_list)){
        const ul = document.querySelector('#guest-info-list');
        if(ul){
          ul.innerHTML='';
          dict.info_list.forEach(item=>{
            const li = document.createElement('li');
            li.textContent = item.item || item;
            ul.appendChild(li);
          });
        }
      }
      if(dict.weather_h) {
        const wh = document.getElementById('weather-title'); if(wh) wh.textContent = dict.weather_h;
      }
      if(dict.weather_note) {
        const wn = document.getElementById('weather-note'); if(wn) wn.textContent = dict.weather_note;
      }
      localStorage.setItem('lang', lang);
    }catch(e){ console.error('i18n load error', e); }
  }

  function getByPath(obj, path){
    if(!obj) return null;
    if(!path) return null;
    if(obj[path] !== undefined) return obj[path];
    return path.split('.').reduce((acc,key)=> acc && acc[key] !== undefined ? acc[key] : null, obj);
  }

  window.switchLang = function(lang){
    document.querySelectorAll(buttonsSelector).forEach(b=>b.classList.toggle('active', b.getAttribute('data-lang')===lang));
    loadLang(lang).then(()=>{
      if(window.renderWeather) window.renderWeather(lang);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll(buttonsSelector).forEach(btn=>{
      btn.addEventListener('click', ()=> switchLang(btn.getAttribute('data-lang')));
    });
    switchLang(defaultLang);
  });
})();
