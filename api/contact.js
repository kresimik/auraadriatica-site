// /functions/api/contact.js  — Cloudflare Pages Function
// Pošalje e-mail preko Resend API-ja
export const onRequestPost = async ({ request, env }) => {
  try {
    const payload = await request.json();

    // osnovna validacija + honeypot provjera (ako si šalješ i "company", dodaj uvjet)
    const { name, email, message, phone = "", apt = "Apartment" } = payload || {};
    if (!name || !email || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing fields" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    // pripremi email
    const subject = `[${apt}] Inquiry from ${name}`;
    const text =
`Name: ${name}
Email: ${email}
Phone: ${phone}

Message:
${message}`;

    // Poziv prema Resend API-ju
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,         // npr. "Aura Adriatica <no-reply@auraadriatica.com>"
        to: [env.RESEND_TO],           // npr. "info@auraadriatica.com"
        subject,
        text,
        reply_to: email                // da možeš direktno odgovoriti gostu
      })
    });

    if (!res.ok) {
      const errTxt = await res.text().catch(()=> "Resend error");
      return new Response(JSON.stringify({ ok: false, error: errTxt }), {
        status: 502,
        headers: { "content-type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Server error" }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};
