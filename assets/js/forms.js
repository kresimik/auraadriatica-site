// /assets/js/form.js
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  function currentLang() {
    return (localStorage.getItem('lang') || 'en').toLowerCase();
  }

  // Minimalne poruke za status (po jezicima)
  const MSG = {
    en: {
      sending: 'Sending…',
      ok: 'Thanks! Your message has been sent.',
      err: 'Sorry, something went wrong. Please try again or email us directly.',
      invalid: 'Please fill in all required fields.'
    },
    hr: {
      sending: 'Šaljem…',
      ok: 'Hvala! Vaša poruka je poslana.',
      err: 'Nažalost, došlo je do greške. Pokušajte ponovno ili nam pišite direktno.',
      invalid: 'Molimo ispunite sva obvezna polja.'
    },
    de: {
      sending: 'Senden…',
      ok: 'Danke! Ihre Nachricht wurde gesendet.',
      err: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt.',
      invalid: 'Bitte füllen Sie alle Pflichtfelder aus.'
    },
    it: {
      sending: 'Invio…',
      ok: 'Grazie! Il tuo messaggio è stato inviato.',
      err: 'Spiacenti, si è verificato un errore. Riprova o scrivici direttamente.',
      invalid: 'Compila tutti i campi obbligatori.'
    },
    sl: {
      sending: 'Pošiljam…',
      ok: 'Hvala! Vaše sporočilo je poslano.',
      err: 'Prišlo je do napake. Poskusite znova ali nam pišite neposredno.',
      invalid: 'Prosimo, izpolnite vsa obvezna polja.'
    }
  };

  function t(key) {
    const lang = currentLang();
    return (MSG[lang] && MSG[lang][key]) || MSG.en[key] || '';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = $('#apt-contact-form');
    if (!form) return;

    const statusEl = $('#form-status');
    const submitBtn = form.querySelector('button[type="submit"]');

    const hiddenApt = $('#apt-hidden-name');
    const hiddenLang = $('#apt-hidden-lang');

    // Inicijalna vrijednost jezika
    if (hiddenLang) hiddenLang.value = currentLang();

    // Inicijalna vrijednost naziva apartmana iz <h1>
    const h1 = document.querySelector('h1[data-i18n]');
    const updateAptName = () => {
      const val = (h1 && h1.textContent.trim()) || (document.body.getAttribute('data-apt-slug') || 'Apartment');
      if (hiddenApt) hiddenApt.value = val;
    };
    updateAptName();

    // Prati promjene naslova (npr. nakon i18n prevođenja / reload JSON-a)
    if (h1) {
      const mo = new MutationObserver(updateAptName);
      mo.observe(h1, { childList: true, characterData: true, subtree: true });
    }

    // Reakcija na promjenu jezika iz izbornika (postoji u headeru)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-menu button[data-lang]');
      if (!btn) return;
      if (hiddenLang) hiddenLang.value = btn.dataset.lang.toLowerCase();
    });

    // Helper: prikaži status
    function setStatus(msg, ok = false) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.style.color = ok ? 'var(--brand-olive)' : 'var(--muted)';
    }

    // Submit handler (AJAX)
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Basic validation
      const name = form.name?.value?.trim();
      const email = form.email?.value?.trim();
      const message = form.message?.value?.trim();

      // Honeypot (ako postoji input name="hp", a korisnik ga je ispunio -> spam)
      const hp = form.hp?.value?.trim();
      if (hp) return; // tiho ignoriraj

      if (!name || !email || !message) {
        setStatus(t('invalid'));
        return;
      }

      // Disable submit
      submitBtn && (submitBtn.disabled = true);
      setStatus(t('sending'));

      // Složi payload
      const fd = new FormData(form);
      fd.set('apartment', hiddenApt ? hiddenApt.value : (document.body.getAttribute('data-apt-slug') || 'Apartment'));
      fd.set('lang', hiddenLang ? hiddenLang.value : currentLang());
      fd.append('page_url', location.href);
      fd.append('user_agent', navigator.userAgent);
      fd.append('timestamp', new Date().toISOString());

      try {
        const res = await fetch(form.action || '/sendmail.php', {
          method: 'POST',
          body: fd,
          headers: { 'X-Requested-With': 'fetch' }
        });

        let ok = false;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await res.json().catch(() => ({}));
          ok = !!json.ok || res.ok;
        } else {
          // plain text or other → uspjeh ako je 2xx
          ok = res.ok;
        }

        if (ok) {
          setStatus(t('ok'), true);
          form.reset();
        } else {
          setStatus(t('err'));
        }
      } catch (err) {
        console.warn('[form] send error', err);
        setStatus(t('err'));
      } finally {
        submitBtn && (submitBtn.disabled = false);
      }
    });
  });
})();
