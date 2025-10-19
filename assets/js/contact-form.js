(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const el = (sel, root = form) => root.querySelector(sel);

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('', '');

    if (form.querySelector('#cf-company')?.value?.trim()) {
      setStatus('Something went wrong. Please try another channel.', 'err');
      return;
    }

    const name = el('#cf-name').value.trim();
    const email = el('#cf-email').value.trim();
    const message = el('#cf-message').value.trim();
    const token = el('#cf-token')?.value?.trim();

    if (!name || !emailOk(email) || !message) {
      setStatus('Please fill out all required fields correctly.', 'err');
      return;
    }
    if (!token) {
      setStatus('Missing Turnstile token.', 'err');
      return;
    }

    setStatus('Sending…');
    const payload = {
      apt: el('#cf-apt')?.value || 'Apartment',
      name, email,
      phone: el('#cf-phone')?.value?.trim() || '',
      message, token
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setStatus('Thank you! Your message has been sent.', 'ok');
        form.reset();
        if (window.turnstile) turnstile.reset();
      } else {
        setStatus(json.error || 'Sending failed — please try again later.', 'err');
      }
    } catch (err) {
      console.error(err);
      setStatus('Network error — please try again.', 'err');
    }
  });
})();
