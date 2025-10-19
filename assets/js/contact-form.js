// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const $ = (sel, root = form) => root.querySelector(sel);

  const rows = {
    name: $('#cf-name')?.closest('.form-group'),
    email: $('#cf-email')?.closest('.form-group'),
    message: $('#cf-message')?.closest('.form-group'),
  };

  const getMsg = (row) => row?.querySelector('.err-msg');
  const setErr = (row, msg) => {
    if (!row) return;
    row.classList.add('is-invalid');
    let m = getMsg(row);
    if (!m) { m = document.createElement('div'); m.className = 'err-msg'; row.appendChild(m); }
    m.textContent = msg || '';
  };
  const clearErr = (row) => { if (!row) return; row.classList.remove('is-invalid'); const m = getMsg(row); if (m) m.textContent = ''; };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const setBusy = (busy) => { const btn = form.querySelector('button[type="submit"]'); if (btn){ btn.disabled = busy; btn.style.opacity = busy ? .7 : 1; btn.style.pointerEvents = busy ? 'none':'auto'; } };
  const setStatus = (t, type) => { if (!statusEl) return; statusEl.textContent = t || ''; statusEl.classList.remove('ok','err'); if (type) statusEl.classList.add(type); };

  const validate = () => {
    let ok = true;
    const name = $('#cf-name'), email = $('#cf-email'), message = $('#cf-message');
    clearErr(rows.name); clearErr(rows.email); clearErr(rows.message);
    if (!name.value.trim()) { setErr(rows.name, 'Please enter your name.'); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)) { setErr(rows.email, 'Please enter a valid email.'); ok = false; }
    if (!message.value.trim()) { setErr(rows.message, 'Please enter a message.'); ok = false; }
    return ok;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // honeypot
    if ($('#cf-company')?.value?.trim()) {
      setStatus('Something went wrong. Please try another channel.', 'err');
      return;
    }
    if (!validate()) return;

    // Turnstile token iz hidden inputa
    const token = document.getElementById('cf-token')?.value || '';
    if (!token) {
      setStatus('Please complete the verification and try again.', 'err');
      return;
    }

    setBusy(true);
    setStatus('Sending…');

    const payload = {
      apt: $('#cf-apt')?.value || form.getAttribute('data-apt') || 'Apartment',
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
        setStatus('Thank you! Your message has been sent.', 'ok');
        form.reset();
        // resetiraj i Turnstile widget (ako je global dostupan)
        try { window.turnstile && window.turnstile.reset(); } catch {}
      } else {
        const data = await res.json().catch(()=>({}));
        setStatus(data?.error || 'Could not send. Please try again.', 'err');
      }
    } catch (err) {
      setStatus('Network error. Please try again.', 'err');
    } finally {
      setBusy(false);
    }
  });
})();
