// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');

  // --- i18n helpers ---------------------------------------------------------
  const currentLang = () => (document.documentElement.lang || 'en').toLowerCase();
  const t = (k, fb) => {
    const dict = (window.I18N?.[currentLang()]?.contact) || window.I18N?.en?.contact || {};
    return dict[k] || fb || k;
  };

  // Primijeni prijevode na elemente forme
  function applyContactI18n(lang) {
    const L = (window.I18N?.[lang]?.contact) || window.I18N?.en?.contact || {};

    // Labels
    const $ = (sel, root = form) => root.querySelector(sel);
    const setTxt = (sel, key, fb) => { const el = $(sel); if (el) el.textContent = L[key] || fb || el.textContent; };
    setTxt('label[for="cf-name"]',    'name_label',    'Name');
    setTxt('label[for="cf-email"]',   'email_label',   'Email');
    setTxt('label[for="cf-phone"]',   'phone_label',   'Phone (optional)');
    setTxt('label[for="cf-message"]', 'message_label', 'Message');

    // Placeholders
    const name = $('#cf-name');
    const email = $('#cf-email');
    const phone = $('#cf-phone');
    const message = $('#cf-message');
    if (name)    name.placeholder    = L.name_ph    || 'Your name';
    if (email)   email.placeholder   = L.email_ph   || 'name@example.com';
    if (phone)   phone.placeholder   = L.phone_ph   || '+385…';
    if (message) message.placeholder = L.message_ph || 'Dates, number of guests, questions…';

    // Gumb
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.firstChild.nodeValue = (L.send_btn || 'Send message') + ' ';

    // Napomena (ne diraj ako je lockana porukom statusa)
    if (statusEl && statusEl.dataset.locked !== '1') {
      statusEl.textContent = L.note_after || 'We reply within 24h.';
      statusEl.classList.remove('ok', 'err');
    }
  }

  // Izložimo za pozive izvan ovog fajla
  window.applyContactI18n = function (lang) {
    try { applyContactI18n(lang || currentLang()); } catch {}
  };

  // Primijeni na load (mali delay da DOM bude spreman)
  setTimeout(() => window.applyContactI18n(currentLang()), 0);

  // --- DOM utils & validacija ----------------------------------------------
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

    if (!name.value.trim())                          { setErr(row('#cf-name'),    t('val_name','Please enter your name.')); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)){ setErr(row('#cf-email'),   t('val_email','Please enter a valid email.')); ok = false; }
    if (!message.value.trim())                       { setErr(row('#cf-message'), t('val_message','Please enter a message.')); ok = false; }

    return ok;
  };

  const setBusy = (busy) => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.ariaBusy = busy ? 'true' : 'false';
    btn.style.opacity = busy ? .85 : 1;
    btn.style.pointerEvents = busy ? 'none' : 'auto';
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
    // Zaključaj note da i18n više ne pregazi ručni status
    statusEl.dataset.locked = '1';
  };

  // --- Submit ---------------------------------------------------------------
  let inFlight = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (inFlight) return; // anti-double-click

    if (!validate()) return;

    // Turnstile token (jedan widget u formi)
    if (!window.turnstile) {
      setStatus(t('verify_unavail','Verification service unavailable. Please refresh the page.'), 'err');
      return;
    }

    setBusy(true);
    inFlight = true;
    setStatus(t('sending','Sending…'));

    let token = '';
    try {
      const widget = form.querySelector('.cf-turnstile');
      token = await turnstile.execute(widget, { action: 'submit' });
      if (!token) throw new Error('no_token');
    } catch (_err) {
      setStatus(t('verify_fail','Verification failed. Please refresh and try again.'), 'err');
      setBusy(false);
      inFlight = false;
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

      // Ako backend šalje detaljnu grešku, probaj pročitati
      let errText = '';
      if (!res.ok) {
        try {
          const j = await res.json();
          errText = (j && (j.error || j.message)) ? String(j.error || j.message) : '';
        } catch { /* ignore */ }
      }

      if (res.ok) {
        setStatus(t('sent_ok','Thank you! Your message has been sent.'), 'ok');
        form.reset();
        try { turnstile.reset(); } catch {}
        // nakon uspjeha dozvoli i18n da opet preuzme note
        if (statusEl) { delete statusEl.dataset.locked; }
      } else if (/turnstile/i.test(errText)) {
        setStatus(t('verify_fail','Verification failed. Please refresh and try again.'), 'err');
      } else {
        // Fallback mailto (i dalje pokažemo status)
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
      inFlight = false;
    }
  });
})();
