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
    console.error('Server misconfigured: TURNSTILE_SECRET missing');
    return fail(500, 'Server error. Please email us directly at info@auraadriatica.com');
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
    console.warn('Turnstile verification failed', {
      'error-codes': tJson['error-codes'] || [],
      hostname: tJson.hostname,
      action: tJson.action
    });
    return fail(400, 'Verification failed. Please try again.');
  }

  // --- 3) Resend payload priprema
  if (!env.RESEND_API_KEY) {
    console.error('Server misconfigured: RESEND_API_KEY missing');
    return fail(500, 'Server error. Please email us directly at info@auraadriatica.com');
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

  // Both mails go out under CONTACT_FROM. The owner's copy gets "WEB" appended
  // to the display name so a website inquiry is recognisable at a glance in the
  // inbox; the guest's confirmation keeps the plain brand name, since "WEB" is
  // an internal marker that would only look odd to them.
  const baseFrom = fromOk ? CONTACT_FROM : 'Aura Adriatica <info@auraadriatica.com>';

  const parseFrom = (s) => {
    const m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
    if (!m) return { name: '', addr: s.trim() };
    return { name: m[1].replace(/^"(.*)"$/, '$1').trim(), addr: m[2] };
  };

  const { name: fromName, addr: fromAddr } = parseFrom(baseFrom);
  const notifyName = `${fromName || 'Aura Adriatica'} WEB`;
  // Quote the phrase if it carries any RFC 5322 special, so a display name
  // like "Aura Adriatica, Lovran" cannot break the header.
  const notifyFrom = /[(),.:;<>@\[\]\\"]/.test(notifyName)
    ? `"${notifyName.replace(/(["\\])/g, '\\$1')}" <${fromAddr}>`
    : `${notifyName} <${fromAddr}>`;

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
  const sendMail = (fromValue) => fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromValue,
      to: toArray,
      subject,
      text,
      reply_to: email
    })
  });

  let r, rText, rJson;
  try {
    r = await sendMail(notifyFrom); // "… WEB <addr>" — marks this as a website inquiry
    rText = await r.text();

    // The WEB suffix is cosmetic. If Resend rejects that sender for any reason,
    // retry with CONTACT_FROM exactly as configured rather than losing the
    // inquiry over a display name.
    if (!r.ok && notifyFrom !== baseFrom) {
      console.warn('Resend rejected notifyFrom, retrying with baseFrom', r.status, rText);
      r = await sendMail(baseFrom);
      rText = await r.text();
    }

    try { rJson = JSON.parse(rText); } catch(_) { rJson = null; }
  } catch (e) {
    console.error('Resend fetch failed', String(e));
    return fail(502, 'Could not send your message. Please try again or email us directly.');
  }

  if (!r.ok) {
    // Resend često vraća 422 s objašnjenjem ("Invalid `from`", "Domain not verified", ...)
    console.error('Resend error', r.status, rJson || rText);
    return fail(502, 'Could not send your message. Please try again or email us directly.');
  }

  // --- 5) Confirmation email to guest (best-effort, don't fail the request if it errors)
  // The submitted message is deliberately NOT echoed back: the confirmation goes to
  // whatever address the form supplied, so echoing it would let anyone send arbitrary
  // text to a third party from our domain.
  const confirmFrom = baseFrom; // plain brand name — no internal "WEB" marker
  const subjectLine = apt !== 'Apartment' ? `Apartment ${apt}` : 'our apartments';

  const confirmText = [
    `Dear ${name},`,
    '',
    `Thank you for your inquiry about ${subjectLine}.`,
    'We have received your message and will get back to you within 24 hours.',
    '',
    'Best regards,',
    'Aura Adriatica',
    'Lovran, Opatija Riviera',
    'info@auraadriatica.com | +385 99 221 0910',
    'https://auraadriatica.com'
  ].join('\n');

  // name and apt come from the form, so they must be escaped before going into
  // markup — otherwise a crafted name injects HTML into the guest's mailbox.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // A text-only confirmation is what mail-tester flagged under "your message
  // could be improved": ordinary transactional mail carries both parts.
  const confirmHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f4;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(184,150,90,.25);border-radius:6px;">
<tr><td style="height:3px;background:#b8965a;border-radius:6px 6px 0 0;"></td></tr>
<tr><td style="padding:32px 32px 8px;">
<div style="font:600 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#866327;">Aura Adriatica</div>
<h1 style="margin:12px 0 0;font:300 26px/1.25 Georgia,'Times New Roman',serif;color:#1a3347;">Thank you for your inquiry</h1>
</td></tr>
<tr><td style="padding:16px 32px 8px;font:400 15px/1.7 Helvetica,Arial,sans-serif;color:#4a443c;">
<p style="margin:0 0 14px;">Dear ${esc(name)},</p>
<p style="margin:0 0 14px;">Thank you for your inquiry about <strong style="color:#1a3347;">${esc(subjectLine)}</strong>.</p>
<p style="margin:0;">We have received your message and will get back to you within 24 hours.</p>
</td></tr>
<tr><td style="padding:24px 32px 32px;">
<div style="border-top:1px solid rgba(184,150,90,.25);padding-top:18px;font:400 14px/1.7 Helvetica,Arial,sans-serif;color:#6a6055;">
<div style="font:400 17px/1.3 Georgia,'Times New Roman',serif;color:#1a3347;">Aura Adriatica</div>
<div style="margin-top:4px;">Lovran, Opatija Riviera</div>
<div style="margin-top:10px;">
<a href="mailto:info@auraadriatica.com" style="color:#866327;text-decoration:none;">info@auraadriatica.com</a>
&nbsp;·&nbsp;
<a href="tel:+385992210910" style="color:#866327;text-decoration:none;">+385 99 221 0910</a>
</div>
<div style="margin-top:10px;">
<a href="https://auraadriatica.com" style="color:#866327;text-decoration:none;">auraadriatica.com</a>
</div>
</div>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

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
        html: confirmHtml,
        reply_to: CONTACT_TO_RAW
      })
    });
  } catch (_) {
    // Confirmation failure is non-fatal
  }

  return json({ ok: true, id: (rJson && rJson.id) || null });
}
