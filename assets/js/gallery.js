// Lightweight gallery lightbox + keyboard nav + focus trap + counter (n/total)
(function(){
  const grid = document.getElementById('gallery');
  if(!grid) return;

  const items = Array.from(grid.querySelectorAll('.g-item'));
  const overlay = document.getElementById('glightbox');
  const img = document.getElementById('glbImg');
  const cap = document.getElementById('glbCap');
  const btnClose = document.getElementById('glbClose');
  const btnPrev = document.getElementById('glbPrev');
  const btnNext = document.getElementById('glbNext');

  let idx = 0;
  let lastActive = null;

  function setCounter(){
    cap.textContent = `${idx + 1} / ${items.length}`;
  }

  function openAt(i){
    idx = (i + items.length) % items.length;
    const a = items[idx];
    const full = a.getAttribute('data-full') || a.getAttribute('href');
    img.src = full;
    setCounter();
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
    openAt(items.indexOf(a));
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

  // Prevent scroll on wheel in overlay (optional)
  overlay.addEventListener('wheel', (e)=>{ if(!overlay.hidden) e.preventDefault(); }, {passive:false});
})();
