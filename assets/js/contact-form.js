// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const SITEKEY =
    form.querySelector('[data-sitekey]')?.getAttribute('data-sitekey') // ako je ostao stari markup
    || '0x4AAAAAAB7dSzYE1I-UlV1x'; // tvoj site key (možeš i ostaviti ovako)

  // --- i18n helpers ---
  const currentLang = () => (document.documentElement.lang || 'en').toLowerCase();
  const t = (k, fb) => {
    const dict = (window.I18N?.[currentLang()]?.contact) || window.I18N?.en?.contact || {};
    return dict[k] || fb || k;
  };

  const $ = (sel, root = form) => root.querySelector(sel);
  const rowOf = (inputSel) => $(inputSel)?.closest('.form-group');

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
    [rowOf('#cf-name'), rowOf('#cf-email'), rowOf('#cf-message')].forEach(clearErr);
    if (!name.value.trim())        { setErr(rowOf('#cf-name'),    t('val_name','Please enter your name.')); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)) { setErr(rowOf('#cf-email'),   t('val_email','Please enter a valid email.')); ok = false; }
    if (!message.value.trim())     { setErr(rowOf('#cf-message'), t('val_message','Please enter a message.')); ok = false; }
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

  // ---------- Turnstile: programmatic render + callback token ----------
  let widgetId = null;
  let tsToken = '';

  // callbacki koje Turnstile zove
  window.__tsOk = function(token) {
    tsToken = token || '';
  };
  window.__tsExpired = function() {
    tsToken = '';
  };
  window.__tsError = function() {
    tsToken = '';
  };

  // Render widgeta kad je skripta spremna
  function renderTurnstile() {
    const box = document.getElementById('cf-turnstile');
    if (!box) return;

    // ako je već renderan, nemoj duplo
    if (box.getAttribute('data-widget-id')) {
      widgetId = box.getAttribute('data-widget-id');
      return;
    }
    if (!window.turnstile || typeof window.turnstile.render !== 'function') return;

    widgetId = window.turnstile.render('#cf-turnstile', {
      sitekey: SITEKEY,
      callback: '__tsOk',
      'expired-callback': '__tsExpired',
      'error-callback': '__tsError',
      theme: 'light'
      // (bez size:'invisible' – koristimo managed widget i callback)
    });

    if (widgetId) box.setAttribute('data-widget-id', widgetId);
  }

  function ensureTurnstileReady() {
    return new Promise((resolve, reject) => {
      let tries = 0;
      const done = () => { try { renderTurnstile(); resolve(); } catch(e){ reject(e); } };

      if (window.turnstile && typeof window.turnstile.ready === 'function') {
        window.turnstile.ready(done);
      } else {
        const iv = setInterval(() => {
          tries++;
          if (window.turnstile && typeof window.turnstile.render === 'function') {
            clearInterval(iv); done();
          } else if (tries > 120) { // ~6s
            clearInterval(iv); reject(new Error('Turnstile script not loaded.'));
          }
        }, 50);
      }
    });
  }

  // Pokušaj rendera čim DOM postoji
  document.addEventListener('DOMContentLoaded', () => {
    ensureTurnstileReady().catch(() => {});
  });

  // ---------- Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setStatus(t('sending','Sending…'));

    try {
      await ensureTurnstileReady();
    } catch {
      setStatus(t('verify_fail','Verification failed. Please refresh and try again.'), 'err');
      setBusy(false);
      return;
    }

    // Moramo imati token iz callbacka
    if (!tsToken) {
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
      token: tsToken
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
        tsToken = '';
        try {
          if (widgetId && window.turnstile?.reset) window.turnstile.reset(widgetId);
        } catch {}
      } else {
        const subj = encodeURIComponent(`[${payload.apt}] Inquiry from ${payload.name}`);
        const body = encodeURIComponent(
          `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\n\n${payload.message}`
        );
        window.location.href = `mailto:info@auraadriatica.com?subject=${subj}&body=${body}`;
        setStatus(t('sent_fail','Sending failed — please try again later.'), 'err');
      }
    } catch {
      setStatus(t('sent_fail','Sending failed — please try again later.'), 'err');
    } finally {
      setBusy(false);
    }
  });
})();
