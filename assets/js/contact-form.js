// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const SITEKEY = (form.querySelector('.cf-turnstile')?.getAttribute('data-sitekey')) || '';

  // --- i18n helpers (kao i prije) ---
  const currentLang = () => (document.documentElement.lang || 'en').toLowerCase();
  const t = (k, fb) => {
    const dict = (window.I18N?.[currentLang()]?.contact) || window.I18N?.en?.contact || {};
    return dict[k] || fb || k;
  };

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
    if (!name.value.trim())        { setErr(row('#cf-name'),    t('val_name','Please enter your name.')); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)) { setErr(row('#cf-email'),   t('val_email','Please enter a valid email.')); ok = false; }
    if (!message.value.trim())     { setErr(row('#cf-message'), t('val_message','Please enter a message.')); ok = false; }
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

  // ---------- Turnstile: safe render + execute ----------
  let widgetId = null;

  // Rendera widget ako već nije renderan (prod problem)
  async function ensureWidget() {
    const container = form.querySelector('.cf-turnstile');
    if (!container) throw new Error('Turnstile container not found.');

    // Ako je već renderan, Cloudflare mu na container stavi attribute "data-widget-id"
    if (container.getAttribute('data-widget-id')) {
      widgetId = container.getAttribute('data-widget-id');
      return widgetId;
    }

    // Pričekaj da se skripta učita
    await new Promise((resolve, reject) => {
      const ready = () => resolve();
      if (window.turnstile && typeof window.turnstile.ready === 'function') {
        window.turnstile.ready(ready);
      } else {
        // fallback: čekaj dok se pojavi turnstile
        let tries = 0;
        const iv = setInterval(() => {
          tries++;
          if (window.turnstile && typeof window.turnstile.render === 'function') {
            clearInterval(iv); resolve();
          } else if (tries > 100) { // ~5s
            clearInterval(iv); reject(new Error('Turnstile script not loaded.'));
          }
        }, 50);
      }
    });

    // Render kao invisible (tako da možemo programatski execute)
    const opts = { sitekey: SITEKEY, size: 'invisible' };
    widgetId = window.turnstile.render(container, opts);
    // upiši id i na DOM da idući put znamo da je renderano
    if (widgetId) container.setAttribute('data-widget-id', widgetId);
    return widgetId;
  }

  async function getToken() {
    await ensureWidget();
    if (!window.turnstile || !widgetId) throw new Error('Turnstile not ready.');
    // reset prije execute izbjegne “already executed” poruku i vraća svježi token
    try { window.turnstile.reset(widgetId); } catch {}
    return await window.turnstile.execute(widgetId, { action: 'submit' });
  }

  // ---------- Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setStatus(t('sending','Sending…'));

    // 1) Token
    let token = '';
    try {
      token = await getToken();
      if (!token) throw new Error('empty token');
    } catch (err) {
      setStatus(t('verify_fail','Verification failed. Please refresh and try again.'), 'err');
      setBusy(false);
      return;
    }

    // 2) Payload
    const payload = {
      apt: form.getAttribute('data-apt') || $('#cf-apt')?.value || 'Apartment',
      name: $('#cf-name').value.trim(),
      email: $('#cf-email').value.trim(),
      phone: $('#cf-phone')?.value?.trim() || '',
      message: $('#cf-message').value.trim(),
      token
    };

    // 3) Send
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus(t('sent_ok','Thank you! Your message has been sent.'), 'ok');
        form.reset();
        try { window.turnstile.reset(widgetId); } catch {}
      } else {
        // Fallback na mailto (status ipak pokaži)
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
