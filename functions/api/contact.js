// /functions/api/contact.js

// Guest confirmation, in the language of the page the inquiry came from.
// Greetings are deliberately gender-neutral (Dobar dan / Guten Tag / Gentile /
// Kedves …) — the form does not ask, and guessing from a name gets it wrong.
// `about(apt)` gets "Olive"/"Onyx" or null for the general contact page.
const CONFIRM = {
  en: { name: 'English', subject: 'We received your inquiry — Aura Adriatica', heading: 'Thank you for your inquiry',
        greet: (n) => n ? `Dear ${n},` : 'Dear guest,',
        about: (a) => a ? `Thank you for your inquiry about Apartment ${a}.` : 'Thank you for your inquiry about our apartments.',
        received: 'We have received your message and will get back to you within 24 hours.',
        signoff: 'Best regards,', place: 'Lovran, Opatija Riviera' },
  hr: { name: 'Croatian', subject: 'Zaprimili smo vaš upit — Aura Adriatica', heading: 'Hvala na upitu',
        greet: (n) => n ? `Dobar dan, ${n},` : 'Dobar dan,',
        about: (a) => a ? `Hvala vam na upitu za apartman ${a}.` : 'Hvala vam na upitu za naše apartmane.',
        received: 'Vašu smo poruku zaprimili i javit ćemo vam se u roku od 24 sata.',
        signoff: 'Srdačan pozdrav,', place: 'Lovran, Opatijska rivijera' },
  de: { name: 'German', subject: 'Wir haben Ihre Anfrage erhalten — Aura Adriatica', heading: 'Vielen Dank für Ihre Anfrage',
        greet: (n) => n ? `Guten Tag ${n},` : 'Guten Tag,',
        about: (a) => a ? `Vielen Dank für Ihre Anfrage zum Apartment ${a}.` : 'Vielen Dank für Ihre Anfrage zu unseren Apartments.',
        received: 'Wir haben Ihre Nachricht erhalten und melden uns innerhalb von 24 Stunden bei Ihnen.',
        signoff: 'Herzliche Grüße', place: 'Lovran, Riviera von Opatija' },
  it: { name: 'Italian', subject: 'Abbiamo ricevuto la sua richiesta — Aura Adriatica', heading: 'Grazie per la sua richiesta',
        greet: (n) => n ? `Gentile ${n},` : 'Gentile ospite,',
        about: (a) => a ? `Grazie per la sua richiesta per l'appartamento ${a}.` : 'Grazie per la sua richiesta sui nostri appartamenti.',
        received: 'Abbiamo ricevuto il suo messaggio e le risponderemo entro 24 ore.',
        signoff: 'Cordiali saluti,', place: 'Lovran, Riviera di Opatija' },
  sl: { name: 'Slovenian', subject: 'Prejeli smo vaše povpraševanje — Aura Adriatica', heading: 'Hvala za povpraševanje',
        greet: (n) => n ? `Pozdravljeni, ${n},` : 'Pozdravljeni,',
        about: (a) => a ? `Hvala za vaše povpraševanje za apartma ${a}.` : 'Hvala za vaše povpraševanje za naše apartmaje.',
        received: 'Vaše sporočilo smo prejeli in se vam bomo oglasili v 24 urah.',
        signoff: 'Lep pozdrav,', place: 'Lovran, Opatijska riviera' },
  hu: { name: 'Hungarian', subject: 'Megkaptuk érdeklődését — Aura Adriatica', heading: 'Köszönjük érdeklődését',
        greet: (n) => n ? `Kedves ${n},` : 'Kedves Vendégünk,',
        about: (a) => a ? `Köszönjük érdeklődését az ${a} apartman iránt.` : 'Köszönjük érdeklődését apartmanjaink iránt.',
        received: 'Üzenetét megkaptuk, és 24 órán belül válaszolunk.',
        signoff: 'Üdvözlettel:', place: 'Lovran, Opatijai Riviéra' },
  cs: { name: 'Czech', subject: 'Váš dotaz jsme obdrželi — Aura Adriatica', heading: 'Děkujeme za váš dotaz',
        greet: (n) => n ? `Dobrý den, ${n},` : 'Dobrý den,',
        about: (a) => a ? `Děkujeme za váš dotaz na apartmán ${a}.` : 'Děkujeme za váš dotaz na naše apartmány.',
        received: 'Vaši zprávu jsme obdrželi a ozveme se vám do 24 hodin.',
        signoff: 'S pozdravem', place: 'Lovran, Opatijská riviéra' },
  sk: { name: 'Slovak', subject: 'Váš dopyt sme prijali — Aura Adriatica', heading: 'Ďakujeme za váš dopyt',
        greet: (n) => n ? `Dobrý deň, ${n},` : 'Dobrý deň,',
        about: (a) => a ? `Ďakujeme za váš dopyt na apartmán ${a}.` : 'Ďakujeme za váš dopyt na naše apartmány.',
        received: 'Vašu správu sme prijali a ozveme sa vám do 24 hodín.',
        signoff: 'S pozdravom', place: 'Lovran, Opatijská riviéra' },
  uk: { name: 'Ukrainian', subject: 'Ми отримали ваш запит — Aura Adriatica', heading: 'Дякуємо за ваш запит',
        greet: (n) => n ? `Доброго дня, ${n}!` : 'Доброго дня!',
        about: (a) => a ? `Дякуємо за ваш запит щодо апартаментів ${a}.` : 'Дякуємо за ваш запит щодо наших апартаментів.',
        received: 'Ми отримали ваше повідомлення і відповімо протягом 24 годин.',
        signoff: 'З повагою,', place: 'Ловран, Опатійська Рив\'єра' }
};

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
  // Single-line fields end up in a subject line; never let CR/LF through.
  const line = (v, max) => str(v, max).replace(/[\r\n\t]+/g, ' ');
  const name    = line(data?.name,    120);
  const email   = line(data?.email,   254);
  const message = str(data?.message, 4000);
  const token   = str(data?.token,   2048);
  const phone   = line(data?.phone,   30);
  // apt is echoed into the guest confirmation, which goes to whatever address
  // the form supplied — so it is a closed set, never free text.
  const APTS = { olive: 'Olive', onyx: 'Onyx' };
  const apt  = APTS[line(data?.apt, 20).toLowerCase()] || 'Apartment';
  // Language of the page the inquiry came from — also a closed set.
  const lang = Object.prototype.hasOwnProperty.call(CONFIRM, line(data?.lang, 5).toLowerCase())
    ? line(data?.lang, 5).toLowerCase() : 'en';

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
  } catch (e) {
    console.error('Turnstile verify fetch failed', String(e));
    return fail(502, 'Verification is temporarily unavailable. Please try again.');
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
  // Header lines, then a blank line, then the message. (The blank line used to
  // be dropped by filter(Boolean) along with the empty phone field.)
  const text = [
    `Apartment: ${apt}`,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : '',
    `Language: ${CONFIRM[lang].name} (${lang}) — the guest's confirmation went out in this language`
  ].filter(Boolean).join('\n') + '\n\n' + message;

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
  const L = CONFIRM[lang];
  const aptName = apt !== 'Apartment' ? apt : null;   // whitelisted Olive/Onyx or null
  const siteUrl = lang === 'en' ? 'https://auraadriatica.com/' : `https://auraadriatica.com/${lang}/`;

  // The confirmation goes to an address we cannot verify, so the one piece of
  // visitor text in it must not be able to carry a message. Only greet by name
  // when it looks like a name — letters, spaces, . ' ’ - — otherwise "guest".
  // That stops "John, your booking failed, pay at evil.example" being relayed
  // from our domain to a third party.
  // A dot followed straight by letters is a domain ("evil.example"), not an
  // initial ("Mr. Smith"); and a real name is a handful of words, not a sentence.
  const looksLikeName =
    /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,59}$/u.test(name) &&
    !/\.\p{L}/u.test(name) &&
    name.split(/\s+/).length <= 5;
  const greetName = looksLikeName ? name : null;   // null -> the language's no-name greeting

  const confirmText = [
    L.greet(greetName),
    '',
    L.about(aptName),
    L.received,
    '',
    L.signoff,
    'Aura Adriatica',
    L.place,
    'info@auraadriatica.com | +385 99 221 0910',
    siteUrl
  ].join('\n');

  // name and apt come from the form, so they must be escaped before going into
  // markup — otherwise a crafted name injects HTML into the guest's mailbox.
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  // The apartment name is bold in the HTML part. aptName is the whitelisted
  // Olive/Onyx, so swapping it back in after escaping is safe.
  const aboutHtml = aptName
    ? esc(L.about(aptName)).replace(aptName, `<strong style="color:#1a3347;">${aptName}</strong>`)
    : esc(L.about(null));

  // A text-only confirmation is what mail-tester flagged under "your message
  // could be improved": ordinary transactional mail carries both parts.
  const confirmHtml = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf8f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f4;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(184,150,90,.25);border-radius:6px;">
<tr><td style="height:3px;background:#b8965a;border-radius:6px 6px 0 0;"></td></tr>
<tr><td style="padding:32px 32px 8px;">
<div style="font:600 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#866327;">Aura Adriatica</div>
<h1 style="margin:12px 0 0;font:300 26px/1.25 Georgia,'Times New Roman',serif;color:#1a3347;">${esc(L.heading)}</h1>
</td></tr>
<tr><td style="padding:16px 32px 8px;font:400 15px/1.7 Helvetica,Arial,sans-serif;color:#4a443c;">
<p style="margin:0 0 14px;">${esc(L.greet(greetName))}</p>
<p style="margin:0 0 14px;">${aboutHtml}</p>
<p style="margin:0;">${esc(L.received)}</p>
</td></tr>
<tr><td style="padding:24px 32px 32px;">
<div style="border-top:1px solid rgba(184,150,90,.25);padding-top:18px;font:400 14px/1.7 Helvetica,Arial,sans-serif;color:#6a6055;">
<div style="font:400 17px/1.3 Georgia,'Times New Roman',serif;color:#1a3347;">Aura Adriatica</div>
<div style="margin-top:4px;">${esc(L.place)}</div>
<div style="margin-top:10px;">
<a href="mailto:info@auraadriatica.com" style="color:#866327;text-decoration:none;">info@auraadriatica.com</a>
&nbsp;·&nbsp;
<a href="tel:+385992210910" style="color:#866327;text-decoration:none;">+385 99 221 0910</a>
</div>
<div style="margin-top:10px;">
<a href="${siteUrl}" style="color:#866327;text-decoration:none;">auraadriatica.com</a>
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
        subject: L.subject,
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
