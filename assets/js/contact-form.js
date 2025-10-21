<script>
// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
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
    // spriječi da i18n pregazi note nakon prvog manualnog statusa
    const note = document.querySelector('.form-note');
    if (note) note.dataset.locked = '1';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setBusy(true);
    setStatus(t('sending','Sending…'));

    // Turnstile token (jedan widget u formi)
    let token = '';
    try {
      const widget = form.querySelector('.cf-turnstile');
      if (!window.turnstile || !widget) {
        setStatus(t('verify_unavail','Verification service unavailable. Please refresh the page.'), 'err');
        setBusy(false);
        return;
      }
      token = await turnstile.execute(widget, { action: 'submit' });
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
        try { turnstile.reset(); } catch {}
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
    }
  });
})();
</script>
