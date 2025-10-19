// /functions/api/contact.js

export async function onRequestPost(context) {
  const { request, env } = context;

  const fail = (status, msg) => new Response(
    JSON.stringify({ ok: false, error: msg }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );

  let data;
  try {
    data = await request.json();
  } catch {
    return fail(400, 'Invalid JSON');
  }

  const { name, email, message, token, phone = '', apt = 'Apartment' } = data;
  if (!name || !email || !message) return fail(400, 'Missing required fields');
  if (!token) return fail(400, 'Missing Turnstile token');

  // Verify Turnstile
  const form = new URLSearchParams();
  form.append('secret', env.TURNSTILE_SECRET || '');
  form.append('response', token);
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: form
  }).then(r => r.json()).catch(() => ({}));

  if (!verify.success) return fail(400, 'Turnstile verification failed');

  // Send via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'no-reply@auraadriatica.com',
      to: env.CONTACT_TO || 'info@auraadriatica.com',
      subject: `[${apt}] Inquiry from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}`,
      reply_to: email
    })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return fail(res.status, json?.message || 'Resend error');

  return new Response(JSON.stringify({ ok: true, id: json?.id || null }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
