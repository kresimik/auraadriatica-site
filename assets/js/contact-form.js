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
    const m = getMsg(row);
    if (m) m.textContent = msg || '';
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

    clearErr(rows.name); clearErr(rows.email); clearErr(rows.message);

    if (!name.value.trim()) { setErr(rows.name, 'Please enter your name.'); ok = false; }
    if (!email.value.trim() || !emailOk(email.value)) { setErr(rows.email, 'Please enter a valid email.'); ok = false; }
    if (!message.value.trim()) { setErr(rows.message, 'Please enter a message.'); ok = false; }

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
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // honeypot guard
    if (form.querySelector('#cf-company')?.value?.trim()) {
      setStatus('Something went wrong. Please try another channel.', 'err');
      return;
    }

    if (!validate()) return;

    setBusy(true);
    setStatus('Sending…');

    // payload
    const payload = {
      apt: form.getAttribute('data-apt') || 'Apartment',
      name: el('#cf-name').value.trim(),
      email: el('#cf-email').value.trim(),
      phone: el('#cf-phone')?.value?.trim() || '',
      message: el('#cf-message').value.trim()
    };

    try {
      // Ako imaš backend na /api/contact — super:
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatus('Thank you! Your message has been sent.', 'ok');
        form.reset();
      } else {
        // fallback: otvori mail klijent
        const subj = encodeURIComponent(`[${payload.apt}] Inquiry from ${payload.name}`);
        const body = encodeURIComponent(
          `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\n\n${payload.message}`
        );
        window.location.href = `mailto:info@auraadriatica.com?subject=${subj}&body=${body}`;
        setStatus('Opening your email client… If nothing happens, write to info@auraadriatica.com.', 'ok');
      }
    } catch (err) {
      // total-fallback: mailto
      const subj = encodeURIComponent(`[${payload.apt}] Inquiry from ${payload.name}`);
      const body = encodeURIComponent(
        `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone}\n\n${payload.message}`
      );
      window.location.href = `mailto:info@auraadriatica.com?subject=${subj}&body=${body}`;
      setStatus('Opening your email client… If nothing happens, write to info@auraadriatica.com.', 'ok');
    } finally {
      setBusy(false);
    }
  });
})();
