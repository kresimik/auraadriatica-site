// /functions/api/contact.js

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ ok:false, error:'Method Not Allowed' }), { status:405 });
    }
  try{
    const body = await request.json();
    const {
      apt, name, email, phone, dates, message, tsToken
    } = body || {};

    // Basic validation
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok:false, error:'Missing fields' }), { status:400 });
    }

    // --- Turnstile verify ---
    if (!tsToken) {
      return new Response(JSON.stringify({ ok:false, error:'Missing Turnstile token' }), { status:400 });
    }
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const formData = new URLSearchParams();
    formData.append('secret', env.TURNSTILE_SECRET);
    formData.append('response', tsToken);
    if (ip) formData.append('remoteip', ip);

    const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData
    });
    const tsJson = await tsRes.json();

    if (!tsJson.success) {
      return new Response(JSON.stringify({ ok:false, error:'Turnstile failed', details:tsJson }), { status:403 });
    }

    // --- Send email via Resend ---
    const FROM_ADDR = 'Aura Adriatica <no-reply@auraadriatica.com>'; // verified sender/domain in Resend
    const TO_ADDR   = 'info@auraadriatica.com';

    const subject = `Novi upit${apt ? ' — ' + apt : ''} (web)`;
    const lines = [
      apt ? `Apartman: ${apt}` : null,
      `Ime: ${name}`,
      `Email: ${email}`,
      phone ? `Telefon: ${phone}` : null,
      dates ? `Datumi: ${dates}` : null,
      '',
      'Poruka:',
      message
    ].filter(Boolean);

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
        <h2 style="margin:0 0 10px 0">Novi upit ${apt ? '— ' + apt : ''}</h2>
        <p><strong>Ime:</strong> ${escapeHtml(name)}<br/>
           <strong>Email:</strong> ${escapeHtml(email)}<br/>
           ${phone ? `<strong>Telefon:</strong> ${escapeHtml(phone)}<br/>` : ''}
           ${dates ? `<strong>Datumi:</strong> ${escapeHtml(dates)}<br/>` : ''}
           ${apt ? `<strong>Apartman:</strong> ${escapeHtml(apt)}<br/>` : ''}
        </p>
        <p style="white-space:pre-wrap"><strong>Poruka:</strong>\n${escapeHtml(message)}</p>
      </div>`.trim();

    const text = lines.join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_ADDR,
        to: [TO_ADDR],
        reply_to: [email],
        subject,
        html,
        text
      })
    });

    const out = await res.json().catch(()=> ({}));
    if (!res.ok) {
      return new Response(JSON.stringify({ ok:false, status:res.status, error: out }), { status: res.status });
    }

    return new Response(JSON.stringify({ ok:true, id: out.id || null }), { status:200 });

  }catch(err){
    return new Response(JSON.stringify({ ok:false, error:String(err) }), { status:500 });
  }
}

function escapeHtml(s=''){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
