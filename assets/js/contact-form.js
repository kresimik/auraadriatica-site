// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const el = (sel, root = form) => root.querySelector(sel);

  const rows = {
    name: el('#cf-name')?.closest('.form-row'),
    email: el('#cf-email')?.closest('.form-row'),
    message: el('#cf-message')?.closest('.form-row')
  };

  const getMsg = (row) => row?.querySelector('.err-msg');
  const setErr = (row, msg) => {
    if (!row) return;
    row.classList.add('is-invalid');
    let m = getMsg(row);
    if (!m) {
      m = document.createElement('div');
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

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const validate = () => {
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
  };

  const setBusy = (busy) => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.style.opacity = busy ? 0.7 : 1;
  };
  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (form.querySelector('#cf-company')?.value?.trim()) {
      setStatus('Something went wrong. Please try another channel.', 'err');
      return;
    }
    if (!validate()) return;

    setBusy(true);
    setStatus('Sending…');

    // NEW: read token from hidden input filled by Turnstile callback
    const token = el('#cf-token')?.value?.trim();
    if (!token) {
      setStatus('Missing Turnstile token', 'err');
      setBusy(false);
      return;
    }

    const payload = {
      apt: el('#cf-apt')?.value || 'Apartment',
      name: el('#cf-name').value.trim(),
      email: el('#cf-email').value.trim(),
      phone: el('#cf-phone')?.value?.trim() || '',
      message: el('#cf-message').value.trim(),
      token
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus('Thank you! Your message has been sent.', 'ok');
        form.reset();
        const tokenEl = el('#cf-token');
        if (tokenEl) tokenEl.value = '';
        if (window.turnstile) turnstile.reset();
      } else {
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
