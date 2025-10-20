// /assets/js/contact-form.js
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const statusEl = document.getElementById('cf-status');
  const el = (sel, root = form) => root.querySelector(sel);

  const rowOf = (inputSel) => el(inputSel)?.closest('.form-group');
  const rows = {
    name: rowOf('#cf-name'),
    email: rowOf('#cf-email'),
    message: rowOf('#cf-message')
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

  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

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
    if (btn) btn.disabled = busy;
  };

  const setStatus = (text, type) => {
    if (!statusEl) return;
    statusEl.textContent = text || '';
    statusEl.classList.remove('ok', 'err');
    if (type) statusEl.classList.add(type);
  };

  // --- Turnstile setup (programmatic render) ---
  let widgetId = null;
  let lastToken = '';

  // Čeka token iz callbacka kao Promise
  function getTurnstileToken() {
    return new Promise((resolve, reject) => {
      try {
        if (!window.turnstile) return reject(new Error('Turnstile not loaded'));

        // Ako već imamo svjež token (npr. managed), uzmi ga
        if (lastToken) return resolve(lastToken);

        // Ako widget nije renderan, renderaj kao "managed"
        if (!widgetId) {
          const container = form.querySelector('.cf-turnstile');
          if (!container) return reject(new Error('Turnstile container missing'));
          widgetId = turnstile.render(container, {
            sitekey: container.getAttribute('data-sitekey'),
            action: 'contact',
            callback: (tkn) => {
              lastToken = tkn;
              resolve(tkn);
            },
            'error-callback': () => reject(new Error('Turnstile error')),
            'expired-callback': () => { lastToken = ''; }
          });
        }

        // Pokušaj izvršiti izazov
        turnstile.execute(widgetId);
        // callback će pozvati resolve()
      } catch (e) {
        reject(e);
      }
    });
  }

  // Resetiraj Turnstile nakon uspješnog slanja / ili kad želimo svjež token
  function resetTurnstile() {
    try {
      if (window.turnstile && widgetId) turnstile.reset(widgetId);
      lastToken = '';
    } catch {}
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // honeypot
    if (form.querySelector('#cf-company')?.value?.trim()) {
      setStatus('Something went wrong. Please try another channel.', 'err');
      return;
    }

    if (!validate()) return;

    setBusy(true);
    setStatus('Sending…');

    // --- Token ---
    let token = '';
    try {
      token = await getTurnstileToken();
      if (!token) {
        setStatus('Verification failed. Please refresh and try again.', 'err');
        setBusy(false);
        return;
      }
    } catch (err) {
      console.warn('Turnstile error', err);
      setStatus('Verification failed. Please refresh and try again.', 'err');
      setBusy(false);
      return;
    }

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
        resetTurnstile();
      } else {
        const txt = await res.text().catch(()=>'');
        console.warn('API error', txt);
        setStatus('Sending failed — please try again later.', 'err');
        resetTurnstile();
      }
    } catch (err) {
      console.error('Send error', err);
      setStatus('Sending failed — please try again later.', 'err');
      resetTurnstile();
    } finally {
      setBusy(false);
    }
  });
})();
