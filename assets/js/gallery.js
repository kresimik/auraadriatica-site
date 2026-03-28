// Lightweight gallery lightbox + keyboard nav + focus trap + counter (n/total)
(function(){
  const grid = document.getElementById('gallery') || document.getElementById('apt-gallery');
  if(!grid) return;

  const overlay = document.getElementById('glightbox');
  const img     = document.getElementById('glbImg');
  const cap     = document.getElementById('glbCap');
  const btnClose = document.getElementById('glbClose');
  const btnPrev  = document.getElementById('glbPrev');
  const btnNext  = document.getElementById('glbNext');

  if (!overlay || !img || !cap || !btnClose || !btnPrev || !btnNext) return;

  let idx = 0;
  let lastActive = null;

  // Live query — works even when apt.js repopulates the grid dynamically
  function getItems(){ return Array.from(grid.querySelectorAll('.g-item')); }

  function setCounter(list){
    const caption = list[idx].getAttribute('data-caption') || '';
    cap.textContent = caption
      ? `${idx + 1} / ${list.length} — ${caption}`
      : `${idx + 1} / ${list.length}`;
  }

  function openAt(i){
    const list = getItems();
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    const a = list[idx];
    img.src = a.getAttribute('data-full') || a.getAttribute('href');
    img.alt = a.getAttribute('data-caption') || '';
    setCounter(list);
    overlay.hidden = false;
    overlay.classList.add('is-open');
    lastActive = document.activeElement;
    btnClose.focus({preventScroll:true});
    document.body.style.overflow = 'hidden';
  }
  function close(){
    overlay.classList.remove('is-open');
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (lastActive && lastActive.focus) lastActive.focus({preventScroll:true});
  }
  function prev(){ openAt(idx - 1); }
  function next(){ openAt(idx + 1); }

  // Click grid items
  grid.addEventListener('click', (e)=>{
    const a = e.target.closest('.g-item');
    if (!a) return;
    e.preventDefault();
    openAt(getItems().indexOf(a));
  });

  // Nav buttons
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);

  // Keyboard
  window.addEventListener('keydown', (e)=>{
    if (overlay.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'ArrowRight') next();
  });

  // Close on backdrop click
  overlay.addEventListener('click', (e)=>{
    if (e.target === overlay) close();
  });

  // Prevent scroll on wheel in overlay
  overlay.addEventListener('wheel', (e)=>{ if(!overlay.hidden) e.preventDefault(); }, {passive:false});

  // Called by apt.js after gallery repopulation (no-op — live query handles it)
  window.initAptLightbox = function(){};
})();
