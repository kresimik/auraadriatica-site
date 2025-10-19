// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const el = (sel, root = form) => root.querySelector(sel);

  // error helpers
  const getMsg = (row) => row?.querySelector('.err-msg');
  const setErr = (row, msg) => {
    if (!row) return;
    row.classList.add('is-invalid');
    let m = getMsg(row);
    if (!m) { m = document.createElement('small'); m.className = 'err-msg'; row.appendChild(m); }
    m.textContent = msg || '';
  };
  const clearErr = (row) => {
    if (!row) return;
    row.classList.remove('is-invalid');
    const m = getMsg(row);
    if (m) m.textContent = '';
  };

  // rows map (uses .form-group in your HTML)
  const rows = {
    name: el('#cf-name')?.closest('.form-group'),
    email: el('#cf-email')?.closest('.form-group'),
    message: el('#cf-message')?.closest('.form-group')
  };

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());

  const validate = () => {
    let ok = true;
    const name = el('#cf-name');
    const email = el('#cf-email');
    const message = el('#cf-message');

    clearErr(rows.name);
    clearErr(rows.email);
    clearErr(rows.message);

    if (!name.value.trim()) {
      setErr(rows.name, 'Please enter your name.');
      ok = false;
    }
    if (!email.value.trim() || !emailOk(email.value)) {
      setErr(rows.email, 'Please enter a valid email.');
      ok = false;
    }
    if (!message.value.trim()) {
      setErr(rows.message, 'Please enter a message.');
      ok = false;
    }
    return ok;
  };

  const setBusy = (busy) => {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = busy;
    btn.dataset.orig = btn.dataset.orig || btn.innerHTML;
    btn.innerHTML = busy
      ? 'Sending… <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : btn.dataset.orig;
    btn.style.opacity = busy ? 0.7 : 1;
    btn.style.pointerEvents = busy ? 'none' : 'auto';
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
  };

  // Turnstile: read token from the hidden input Turnstile injects
  const getTurnstileToken = () => {
    const inp = document.querySelector('input[name="cf-turnstile-response"]');
    return (inp && inp.value) ? inp.value.trim() : '';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // honeypot
    if (form.querySelector('#cf-company')?.value?.trim()) {
      setStatus('Something went wrong. Please try another channel.', 'err');
      return;
    }

    if (!validate()) return;

    // ensure Turnstile token is present
    const token = getTurnstileToken();
    if (!token) {
      setStatus('Please complete the verification and try again (Turnstile).', 'err');
      return;
    }

    setBusy(true);
    setStatus('Sending…');

    const payload = {
      apt: el('#cf-apt')?.value || form.getAttribute('data-apt') || 'Apartment',
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
        try { window.turnstile && window.turnstile.reset(); } catch(_) {}
      } else {
        // graceful fallback to mailto
        const subj = encodeURIComponent(`[${payload.apt}] Inquiry — ${payload.name}`);
        const body = encodeURIComponent(
          `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\n\n${payload.message}`
        );
        window.location.href = `mailto:info@auraadriatica.com?subject=${subj}&body=${body}`;
        setStatus('Opening your email client… If nothing happens, please email info@auraadriatica.com.', 'ok');
      }
    } catch (err) {
      console.error('Send error', err);
      const subj = encodeURIComponent(`[${payload.apt}] Inquiry — ${payload.name}`);
      const body = encodeURIComponent(
        `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\n\n${payload.message}`
      );
      window.location.href = `mailto:info@auraadriatica.com?subject=${subj}&body=${body}`;
      setStatus('Opening your email client… If nothing happens, please email info@auraadriatica.com.', 'ok');
    } finally {
      setBusy(false);
    }
  });
})();
