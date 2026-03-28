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

  // Ensure all fields are strings (prevent type coercion attacks)
  const str = (v, max) => String(v ?? '').trim().slice(0, max);
  const name    = str(data?.name,    120);
  const email   = str(data?.email,   254);
  const message = str(data?.message, 4000);
  const token   = str(data?.token,   2048);
  const phone   = str(data?.phone,   30);
  const apt     = str(data?.apt,     60) || 'Apartment';

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!name || name.length < 2)  return fail(400, 'Please enter your name.');
  if (!emailOk)                  return fail(400, 'Please enter a valid email address.');
  if (!message || message.length < 5) return fail(400, 'Please enter a message.');
  if (!token)                    return fail(400, 'Missing Turnstile token.');

  // --- 2) Turnstile verify
  if (!env.TURNSTILE_SECRET) {
    return fail(500, 'Server misconfigured: TURNSTILE_SECRET missing');
  }

  const form = new URLSearchParams();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const remoteIp = request.headers.get('CF-Connecting-IP') || '';
  if (remoteIp) form.append('remoteip', remoteIp);

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

  // --- 5) Confirmation email to guest (best-effort, don't fail the request if it errors)
  const confirmFrom = fromOk ? CONTACT_FROM : 'Aura Adriatica <info@auraadriatica.com>';
  const confirmText = [
    `Dear ${name},`,
    '',
    `Thank you for your inquiry about ${apt !== 'Apartment' ? `Apartment ${apt}` : 'our apartments'}.`,
    'We have received your message and will get back to you within 24 hours.',
    '',
    'Your message:',
    '---',
    message,
    '---',
    '',
    'Best regards,',
    'Aura Adriatica',
    'Lovran, Opatija Riviera',
    'info@auraadriatica.com | +385 99 221 0910',
    'https://auraadriatica.com'
  ].join('\n');

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: confirmFrom,
        to: [email],
        subject: `We received your inquiry — Aura Adriatica`,
        text: confirmText,
        reply_to: CONTACT_TO_RAW
      })
    });
  } catch (_) {
    // Confirmation failure is non-fatal
  }

  return json({ ok: true, id: (rJson && rJson.id) || null });
}
