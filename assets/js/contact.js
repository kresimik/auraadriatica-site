// /assets/js/contact.js
(function(){
  const q = new URLSearchParams(location.search);
  const apt = q.get('apt') || '';

  const aptHidden = document.getElementById('cf-apt');
  const aptBadge  = document.getElementById('apt-badge');
  const aptBadgeText = document.getElementById('apt-badge-text');

  if (aptHidden) aptHidden.value = apt;
  if (apt && aptBadge && aptBadgeText){
    aptBadgeText.textContent = apt;
    aptBadge.hidden = false;
  }

  const form   = document.getElementById('contact-form');
  const status = document.getElementById('cf-status');
  const submit = document.getElementById('cf-submit');

  const setStatus = (msg, cls) => {
    if (!status) return;
    status.textContent = msg || '';
    status.classList.remove('ok','err');
    if (cls) status.classList.add(cls);
  };

  const markInvalid = (el, msg) => {
    const row = el.closest('.form-row');
    if (row) row.classList.add('is-invalid');
    const small = row && row.querySelector('.err-msg');
    if (small) small.textContent = msg || '';
  };

  const clearInvalid = (el) => {
    const row = el.closest('.form-row');
    if (row) row.classList.remove('is-invalid');
    const small = row && row.querySelector('.err-msg');
    if (small) small.textContent = '';
  };

  ['cf-name','cf-email','cf-message'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', ()=> clearInvalid(el));
  });

  if (!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    setStatus('', null);

    // honeypot
    const hp = document.getElementById('cf-company');
    if (hp && hp.value.trim() !== ''){
      setStatus('Greška. Pokušajte ponovno.', 'err');
      return;
    }

    const name  = document.getElementById('cf-name');
    const email = document.getElementById('cf-email');
    const phone = document.getElementById('cf-phone');
    const dates = document.getElementById('cf-dates');
    const msg   = document.getElementById('cf-message');

    let ok = true;
    if (!name.value.trim()){ markInvalid(name, 'Unesite ime.'); ok = false; }
    if (!email.value.trim() || !/^\S+@\S+\.\S+$/.test(email.value)){ markInvalid(email, 'Unesite ispravan email.'); ok = false; }
    if (!msg.value.trim()){ markInvalid(msg, 'Unesite poruku.'); ok = false; }
    if (!ok) return;

    submit.disabled = true;

    try{
      const payload = {
        apt: apt || undefined,
        name: name.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim() || undefined,
        dates: dates.value.trim() || undefined,
        message: msg.value.trim()
      };

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok){
        const txt = await res.text().catch(()=> '');
        throw new Error(`API error ${res.status}: ${txt || res.statusText}`);
      }

      const json = await res.json().catch(()=> ({}));
      if (!json || json.ok !== true){
        throw new Error(json && json.error ? json.error : 'Neuspjeh slanja.');
      }

      setStatus('Hvala! Poruka je poslana. Uskoro se javljamo. 📨', 'ok');
      form.reset();
    }catch(err){
      console.warn('[contact] submit error', err);
      setStatus('Ups. Trenutno ne možemo poslati poruku. Pokušajte kasnije ili javite se na info@auraadriatica.com.', 'err');
    }finally{
      submit.disabled = false;
    }
  });
})();
