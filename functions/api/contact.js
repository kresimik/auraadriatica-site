// /functions/api/contact.js
export const onRequestPost = async ({ request, env }) => {
  try {
    // CORS (ako ćeš zvati s drugih domena, ovdje dodaj origin po potrebi)
    const headers = {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
    };

    // OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, phone, company, apt, message } = body;

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields.' }), {
        status: 400,
        headers,
      });
    }

    // Pripremi sadržaj maila
    const subject = `[${apt || 'Website'}] Inquiry from ${name}`;
    const text =
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      (phone ? `Phone: ${phone}\n` : '') +
      (company ? `Company: ${company}\n` : '') +
      (apt ? `Apartment: ${apt}\n` : '') +
      `\nMessage:\n${message}\n`;

    // Slanje preko Resend REST API-ja
    // NOTE: za produkciju koristi verificirani sender (npr. no-reply@auraadriatica.com).
    // Dok ne verificiraš domain/sender u Resend, koristi onboarding sender:
    // from: 'onboarding@resend.dev'
    const fromAddress = env.RESEND_FROM || 'onboarding@resend.dev';
    const toAddress = env.CONTACT_TO || 'info@auraadriatica.com';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toAddress],
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ ok: false, error: err || 'Resend error' }), {
        status: 502,
        headers,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

// (neobvezno) GET → healthcheck
export const onRequestGet = async () =>
  new Response(JSON.stringify({ ok: true, route: '/api/contact' }), {
    headers: { 'content-type': 'application/json' },
  });
