// /functions/api/contact.js — Cloudflare Pages Function

export const onRequestGet = async () => {
  // Jednostavan ping da vidiš radi li funkcija
  return new Response(JSON.stringify({ ok: true, route: "/api/contact" }), {
    headers: { "content-type": "application/json" },
    status: 200
  });
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    const { name, email, message, phone = "", apt = "Apartment" } = payload;
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 400, headers: { "content-type": "application/json" }
      });
    }

    // ---- Resend poziv ----
    const subject = `[${apt}] Inquiry from ${name}`;
    const text =
`Name: ${name}
Email: ${email}
Phone: ${phone}

Message:
${message}`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,     // npr. "Aura Adriatica <no-reply@auraadriatica.com>"
        to: [env.RESEND_TO],       // npr. "info@auraadriatica.com"
        subject,
        text,
        reply_to: email
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "Resend error");
      return new Response(JSON.stringify({ ok: false, error: errText }), {
        status: 502, headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { "content-type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Server error" }), {
      status: 500, headers: { "content-type": "application/json" }
    });
  }
};
