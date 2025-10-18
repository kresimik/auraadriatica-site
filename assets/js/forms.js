// /assets/js/form.js
// Lightweight AJAX contact form handler for /api/send.php
// Expects JSON response: { ok: true } or { ok: false, error: "..." }

(function () {
  'use strict';

  // Helper: create an element for status messages
  function createStatusEl() {
    const el = document.createElement('div');
    el.className = 'form-status';
    el.setAttribute('role', 'status');
    el.style.marginTop = '0.75rem';
    return el;
  }

  // Validate basic email
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  // Finds forms to auto-wire:
  // - any with class .js-ajax-form
  // - or id #contact-form (backwards compat)
  const forms = Array.from(document.querySelectorAll('.js-ajax-form'));
  const fallback = document.getElementById('contact-form');
  if (fallback && !forms.includes(fallback)) forms.push(fallback);

  if (!forms.length) return; // nothing to do

  forms.forEach(form => {
    // avoid double-binding
    if (form.__ajaxBound) return;
    form.__ajaxBound = true;

    // ensure we have a status node
    let statusEl = form.querySelector('.form-status');
    if (!statusEl) {
      statusEl = createStatusEl();
      form.appendChild(statusEl);
    }

    // Submit handler
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      statusEl.textContent = '';
      statusEl.className = 'form-status';
      statusEl.style.color = '';

      // gather fields (flexible: will pick inputs that exist)
      const name = (form.querySelector('[name="name"]') || {}).value || '';
      const email = (form.querySelector('[name="email"]') || {}).value || '';
      const subject = (form.querySelector('[name="subject"]') || {}).value || '';
      const message = (form.querySelector('[name="message"]') || {}).value || '';
      const apt = (form.querySelector('[name="apt"]') || {}).value || '';
      const dates = (form.querySelector('[name="dates"]') || {}).value || '';

      // simple client-side validation
      const errors = [];
      if (!name.trim()) errors.push('Please enter your name.');
      if (!email.trim() || !isValidEmail(email)) errors.push('Please enter a valid email.');
      if (!message.trim()) errors.push('Please enter a message.');

      if (errors.length) {
        statusEl.style.color = '#c0392b';
        statusEl.innerHTML = errors.map(x => `<div>${x}</div>`).join('');
        return;
      }

      // disable buttons to avoid duplicate submissions
      const submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.origText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';
      }

      // show inline spinner / pending
      statusEl.style.color = '#1f6feb';
      statusEl.textContent = 'Sending…';

      // payload — JSON by default
      const payload = {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        apt: apt.trim(),
        dates: dates.trim()
      };

      // primary: POST JSON to /api/send.php
      // fallback: if 405 or non-JSON response, try FormData POST
      const endpoint = form.dataset.endpoint || '/api/send.php';

      try {
        // Try JSON request first
        let resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store'
        });

        // If 405 Method Not Allowed or 415 etc, try a form-encoded fallback
        if (resp.status === 405 || resp.status === 415 || resp.status === 400) {
          // try FormData fallback
          const fd = new FormData();
          Object.keys(payload).forEach(k => fd.append(k, payload[k]));
          resp = await fetch(endpoint, { method: 'POST', body: fd, cache: 'no-store' });
        }

        const text = await resp.text();
        let data;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (err) {
          // not JSON — throw to be handled below
          throw new Error('Invalid server response');
        }

        if (data && data.ok) {
          statusEl.style.color = '#1b7a3a';
          statusEl.innerHTML = data.message || 'Message sent — thank you!';
          // optional: reset form
          form.reset();
        } else {
          const errMsg = (data && data.error) ? data.error : 'Server error, please try again later.';
          statusEl.style.color = '#c0392b';
          statusEl.textContent = errMsg;
        }
      } catch (err) {
        console.warn('[form] submit error', err);
        statusEl.style.color = '#c0392b';
        // if response text was non-JSON, include a helpful hint
        statusEl.textContent = 'Could not send message. Please try again or contact us at info@auraadriatica.com';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.origText || 'Send';
        }
      }
    });
  });

})();
