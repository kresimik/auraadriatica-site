document.addEventListener('DOMContentLoaded', () => {
  const dd   = document.querySelector('.lang-dropdown');
  if (!dd) return; // nema dropdowna na ovoj stranici

  const btn  = dd.querySelector('.lang-toggle');
  const menu = dd.querySelector('.lang-menu');
  const cur  = dd.querySelector('.current-lang');

  // sigurnosni osigurač da CSS sakrije meni
  if (!menu.hasAttribute('hidden')) menu.setAttribute('hidden', '');

  // otvori/zatvori
  function open(){ menu.removeAttribute('hidden'); btn.setAttribute('aria-expanded','true'); }
  function close(){ menu.setAttribute('hidden',''); btn.setAttribute('aria-expanded','false'); }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hasAttribute('hidden') ? open() : close();
  });

  // klik na stavku
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (!b) return;
    const lang = (b.dataset.lang || 'en').toLowerCase();
    localStorage.setItem('lang', lang);
    if (cur) cur.textContent = lang.toUpperCase();
    menu.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    close();
    location.reload(); // povuci odgovarajući JSON
  });

  // klik izvan + ESC
  document.addEventListener('click', (e) => { if (!dd.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // inicijalni prikaz
  const saved = (localStorage.getItem('lang') || 'en').toUpperCase();
  if (cur) cur.textContent = saved;
  menu.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.textContent === saved));
});
