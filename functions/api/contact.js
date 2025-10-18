// functions/api/contact.js
export async function onRequestPost(context) {
  const { request, env } = context;

  // ----- CORS (da može iz browsera) -----
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // ----- Parse body -----
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const name    = (payload.name || "").toString().trim();
  const email   = (payload.email || "").toString().trim();
  const phone   = (payload.phone || "").toString().trim();
  const company = (payload.company || "").toString().trim();
  const apt     = (payload.apt || "").toString().trim();
  const message = (payload.message || "").toString().trim();

  if (!name || !email || !message) {
    return new Response(JSON.stringify({ ok: false, error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // ----- ENV (FROM/TO/API KEY) -----
  const FROM = (env.CONTACT_FROM || "").trim();      // npr. onboarding@resend.dev
  const TO   = (env.CONTACT_TO   || "").trim();      // npr. info@auraadriatica.com
  const KEY  = (env.RESEND_API_KEY || "").trim();    // re_...

  if (!FROM || !TO || !KEY) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Missing env vars",
      debug: { FROM, TO, HAVE_KEY: !!KEY }
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const subject = `[${apt || "Apartment"}] Inquiry from ${name}`;
  const text = `Name: ${name}
Email: ${email}
Phone: ${phone || "—"}
Company: ${company || "—"}
Apartment: ${apt || "—"}

Message:
${message}
`;

  // ----- Direct RESEND REST call -----
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: FROM,                // << OVDJE KORISTIMO ENV
        to: [TO],
        subject,
        text,
        reply_to: email            // da reply ide gostu
      })
    });

    const out = await res.json().catch(() => ({}));

    if (!res.ok) {
      // vratimo sve što je Resend rekao + koji FROM smo koristili
      return new Response(JSON.stringify({
        ok: false,
        status: res.status,
        error: out,
        used: { FROM, TO }
      }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      id: out.id || null,
      used: { FROM, TO }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e), used: { FROM, TO } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
