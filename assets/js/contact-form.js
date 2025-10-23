// ===== Turnstile: explicit invisible render =====
const container = form.querySelector('.cf-turnstile');
let widgetId = null;

function renderTurnstile() {
  if (!container || !window.turnstile) return;
  try {
    if (widgetId !== null) return; // već renderano
    widgetId = turnstile.render(container, {
      sitekey: container.dataset.sitekey,
      size: 'invisible'
    });
  } catch (e) {
    console.warn('Turnstile render failed', e);
  }
}

// 1) onload callback koji poziva render (Turnstile ga zove kad se lib učita)
window.cfOnload = function cfOnload() {
  renderTurnstile();
};

// 2) Fallback: pokušaj renderirati i nakon load-a DOM-a
document.addEventListener('DOMContentLoaded', renderTurnstile);

// 3) Još jedan fallback: kratko “pollanje” dok se turnstile ne pojavi
(function pollTurnstile(maxMs = 8000, step = 200) {
  let waited = 0;
  const iv = setInterval(() => {
    if (widgetId !== null) { clearInterval(iv); return; }
    if (window.turnstile)  { renderTurnstile(); clearInterval(iv); return; }
    waited += step;
    if (waited >= maxMs) clearInterval(iv);
  }, step);
})();
