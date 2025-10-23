// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');

  // ----- i18n helpers -----
  const currentLang = () => (document.documentElement.lang || 'en').toLowerCase();
  const t = (k, fb) => {
    const dict = (window.I18N?.[currentLang()]?.contact) || window.I18N?.en?.contact || {};
    return dict[k] || fb || k;
  };

  // ----- DOM helpers -----
  const $ = (sel, root = form) => root.querySelector(sel);
  const row = (inputSel) => $(inputSel)?.closest('.form-group');

  const setErr = (rowEl, msg) => {
    if (!rowEl) return;
    rowEl.classList.add('is-invalid');
    let m = rowEl.querySelector('.err-msg');
    if (!m) { m = document.createElement('div'); m.className = 'err-msg'; rowEl.appendChild(m); }
    m.textContent = msg || '';
  };
  const clearErr = (rowEl) => {
    if (!rowEl) return;
    rowEl.classList.remove('is-invalid');
    const m = rowEl.querySelector('.err-msg');
    if (m) m.textContent = '';
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v||'').trim());

  const validate = () => {
    let ok = true;
    const name = $('#cf-name');
    const email = $('#cf-email');
    const message = $('#cf-message');

    [row('#cf-name'), row('#cf-email'), row('#cf-message')].forEach(clearErr);

    if (!name.value.trim())                        { setErr(row('#cf-name'),    t('val_name','Please enter your name.')); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)){ setErr(row('#cf-email'),   t('val_email','Please enter a valid email.')); ok = false; }
    if (!message.value.trim())                     { setErr(row('#cf-message'), t('val_message','Please enter a message.')); ok = false; }

    return ok;
  };

  const setBusy = (busy) => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.style.opacity = busy ? .8 : 1;
    btn.style.pointerEvents = busy ? 'none' : 'auto';
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
    const note = document.querySelector('.form-note');
    if (note) note.dataset.locked = '1';
  };

  // ===== Turnstile: explicit invisible render =====
  const container = form.querySelector('.cf-turnstile');
  let widgetId = null;

  function renderTurnstile() {
    if (!container || !window.turnstile) return;
    try {
      // Ako je već renderan, ne dupliraj
      if (widgetId !== null) return;
      widgetId = turnstile.render(container, {
        sitekey: container.dataset.sitekey,
        size: 'invisible' // uvijek invisible, bez auto-badge
      });
    } catch (e) {
      console.warn('Turnstile render failed', e);
    }
  }

  // CF skriptu učitavamo s onload=cfOnload&render=explicit
  // Ovo mora biti globalno:
  window.cfOnload = function cfOnload() {
    renderTurnstile();
  };

  // Kao fallback, pokušaj render i na DOMContentLoaded (ako je skripta već tu)
  document.addEventListener('DOMContentLoaded', renderTurnstile);

  // ===== submit =====
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setBusy(true);
    setStatus(t('sending','Sending…'));

    // token
    let token = '';
    try {
      if (!window.turnstile) {
        setStatus(t('verify_unavail','Verification service unavailable. Please refresh the page.'), 'err');
        setBusy(false);
        return;
      }
      // pobrini se da je widget renderan
      if (widgetId === null) renderTurnstile();
      if (widgetId === null) {
        setStatus(t('verify_unavail','Verification service unavailable. Please refresh the page.'), 'err');
        setBusy(false);
        return;
      }

      token = await turnstile.execute(widgetId, { action: 'submit' });
      if (!token) {
        setStatus(t('verify_fail','Verification failed. Please refresh and try again.'), 'err');
        setBusy(false);
        return;
      }
    } catch (_err) {
      setStatus(t('verify_fail','Verification failed. Please refresh and try again.'), 'err');
      setBusy(false);
      return;
    }

    const payload = {
      apt: form.getAttribute('data-apt') || $('#cf-apt')?.value || 'Apartment',
      name: $('#cf-name').value.trim(),
      email: $('#cf-email').value.trim(),
      phone: $('#cf-phone')?.value?.trim() || '',
      message: $('#cf-message').value.trim(),
      token
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus(t('sent_ok','Thank you! Your message has been sent.'), 'ok');
        form.reset();
        try { turnstile.reset(widgetId); } catch {}
      } else {
        // Fallback mailto
        const subj = encodeURIComponent(`[${payload.apt}] Inquiry from ${payload.name}`);
        const body = encodeURIComponent(
          `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\n\n${payload.message}`
        );
        window.location.href = `mailto:info@auraadriatica.com?subject=${subj}&body=${body}`;
        setStatus(t('sent_fail','Sending failed — please try again later.'), 'err');
      }
    } catch (_err) {
      setStatus(t('sent_fail','Sending failed — please try again later.'), 'err');
    } finally {
      setBusy(false);
    }
  });
})();
