// /functions/api/contact.js
export async function onRequestPost(context) {
  const { request, env } = context;

  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });

  const fail = (status, msg, extra = {}) =>
    json(Object.assign({ ok: false, error: msg }, extra), status);

  // --- 1) Parse body
  let data;
  try {
    data = await request.json();
  } catch {
    return fail(400, 'Invalid JSON');
  }

  const { name, email, message, token, phone = '', apt = 'Apartment' } = data || {};
  if (!name || !email || !message) return fail(400, 'Missing required fields');
  if (!token) return fail(400, 'Missing Turnstile token');

  // --- 2) Turnstile verify
  if (!env.TURNSTILE_SECRET) {
    return fail(500, 'Server misconfigured: TURNSTILE_SECRET missing');
  }

  const form = new URLSearchParams();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  // opcionalno bi mogao dodati i IP:
  // form.append('remoteip', request.headers.get('CF-Connecting-IP') || '');

  let tJson = {};
  try {
    const tRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    tJson = await tRes.json();
  } catch {
    return fail(502, 'Turnstile verify fetch failed');
  }

  if (!tJson.success) {
    return fail(400, 'Turnstile verification failed', {
      details: {
        'error-codes': tJson['error-codes'] || [],
        hostname: tJson.hostname,
        action: tJson.action,
        cdata: tJson.cdata
      }
    });
  }

  // --- 3) Resend payload priprema
  if (!env.RESEND_API_KEY) {
    return fail(500, 'Server misconfigured: RESEND_API_KEY missing');
  }

  const CONTACT_FROM = (env.CONTACT_FROM || '').trim();
  const CONTACT_TO_RAW = (env.CONTACT_TO || 'info@auraadriatica.com').trim();

  // Resend preporuka: verified sender i ispravan format
  // dozvolimo "email" ILI "Name <email>"
  const fromOk =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT_FROM) ||
    /^.+<\s*[^\s@]+@[^\s@]+\.[^\s@]+\s*>$/.test(CONTACT_FROM);

  if (!fromOk) {
    // fallback (ako želiš tvrdo failati umjesto fallbacka, vrati 500)
    // return fail(500, 'CONTACT_FROM invalid. Use "Name <user@your-verified-domain>" and verify the domain in Resend.');
  }

  // Resend očekuje array za "to" (sigurnije je uvijek array)
  const toArray = CONTACT_TO_RAW.includes(',')
    ? CONTACT_TO_RAW.split(',').map(s => s.trim()).filter(Boolean)
    : [CONTACT_TO_RAW];

  const subject = `[${apt}] Inquiry from ${name}`;
  const text = [
    `Apartment: ${apt}`,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : '',
    '',
    message
  ].filter(Boolean).join('\n');

  // --- 4) Slanje maila
  let r, rText, rJson;
  try {
    r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromOk ? CONTACT_FROM : 'Aura Adriatica <info@auraadriatica.com>', // fallback
        to: toArray,
        subject,
        text,
        reply_to: email
        // (opcionalno) html: '<strong>..</strong>'
      })
    });
    rText = await r.text();
    try { rJson = JSON.parse(rText); } catch(_) { rJson = null; }
  } catch (e) {
    return fail(502, 'Resend fetch failed', { details: String(e) });
  }

  if (!r.ok) {
    // Resend često vraća 422 s message objašnjenjem ("Invalid `from`", "Domain not verified", "The `to` field is required as an array", ...)
    return fail(r.status, 'Resend error', { response: rJson || rText });
  }

  return json({ ok: true, id: (rJson && rJson.id) || null });
}
