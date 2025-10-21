// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const el = (sel, root = form) => root.querySelector(sel);

  const rows = {
    name: el('#cf-name')?.closest('.form-group'),
    email: el('#cf-email')?.closest('.form-group'),
    message: el('#cf-message')?.closest('.form-group')
  };

  const getMsg = (row) => row?.querySelector('.err-msg');

  const setErr = (row, msg) => {
    if (!row) return;
    row.classList.add('is-invalid');
    let m = getMsg(row);
    if (!m) {
      m = document.createElement('small');
      m.className = 'err-msg';
      row.appendChild(m);
    }
    m.textContent = msg || '';
  };

  const clearErr = (row) => {
    if (!row) return;
    row.classList.remove('is-invalid');
    const m = getMsg(row);
    if (m) m.textContent = '';
  };

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

  function validate () {
    let ok = true;
    const name = el('#cf-name');
    const email = el('#cf-email');
    const message = el('#cf-message');

    clearErr(rows.name);
    clearErr(rows.email);
    clearErr(rows.message);

    if (!name.value.trim()) { setErr(rows.name, 'Please enter your name.'); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)) { setErr(rows.email, 'Please enter a valid email.'); ok = false; }
    if (!message.value.trim()) { setErr(rows.message, 'Please enter a message.'); ok = false; }

    return ok;
  }

  function setBusy(busy) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-loading', busy);
  }

  function setStatus(text, type) {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
  }

  function getTurnstileToken() {
    // 1) pokušaj preko API-ja
    try {
      if (window.turnstile && typeof window.turnstile.getResponse === 'function') {
        const widget = form.querySelector('.cf-turnstile');
        const t = window.turnstile.getResponse(widget);
        if (t) return t;
      }
    } catch (_) {}

    // 2) fallback: hidden input koji Turnstile automatski doda
    const hidden = document.querySelector('input[name="cf-turnstile-response"]');
    if (hidden?.value) return hidden.value;

    return '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setBusy(true);
    setStatus('Sending…');

    const payload = {
      apt: el('#cf-apt')?.value || form.getAttribute('data-apt') || 'Apartment',
      name: el('#cf-name').value.trim(),
      email: el('#cf-email').value.trim(),
      phone: el('#cf-phone')?.value?.trim() || '',
      message: el('#cf-message').value.trim(),
      token: getTurnstileToken()
    };

    if (!payload.token) {
      setBusy(false);
      setStatus('Verification failed. Please refresh the page and try again.', 'err');
      return;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setStatus('Thank you! Your message has been sent.', 'ok');
        form.reset();
        try { window.turnstile?.reset?.(); } catch (_) {}
      } else {
        console.warn('API error', data);
        setStatus('Sending failed — please try again later.', 'err');
      }
    } catch (err) {
      console.error('Send error', err);
      setStatus('Network error — please try again.', 'err');
    } finally {
      setBusy(false);
    }
  });
})();
