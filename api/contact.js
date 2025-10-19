// /functions/api/contact.js
// Cloudflare Pages Function (route: /api/contact)
// - Verifies Cloudflare Turnstile token (env.TURNSTILE_SECRET)
// - Sends email via Resend (env.RESEND_API_KEY, env.CONTACT_FROM, env.CONTACT_TO)

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

const emailOk = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export async function onRequestPost({ request, env }) {
  try {
    // 1) Parse body
    const data = await request.json().catch(() => ({}));
    const { apt = "Apartment", name = "", email = "", phone = "", message = "", token = "" } = data || {};

    // 2) Basic validations
    if (!name.trim()) return bad("Missing name");
    if (!emailOk(email)) return bad("Invalid email");
    if (!message.trim()) return bad("Message required");

    // 3) Turnstile verification (required)
    if (!env.TURNSTILE_SECRET) {
      return bad("Server misconfigured: TURNSTILE_SECRET missing", 500);
    }
    if (!token) {
      return bad("Turnstile token missing", 400);
    }

    const form = new URLSearchParams();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", token);

    const tRes = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const tJson = await tRes.json().catch(() => ({}));
    if (!tJson.success) {
      return bad("Turnstile verification failed", 403);
    }

    // 4) Prepare email (Resend)
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const CONTACT_TO = env.CONTACT_TO || "info@auraadriatica.com";
    // mora biti verified sender u Resend-u (domain ili specific address)
    const CONTACT_FROM = env.CONTACT_FROM || "Aura Adriatica <info@auraadriatica.com>";

    if (!RESEND_API_KEY) return bad("Server misconfigured: RESEND_API_KEY missing", 500);

    const subject = `[${apt}] Inquiry from ${name}`;
    const text = [
      `Apartment: ${apt}`,
      `Name: ${name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : "",
      "",
      message
    ].filter(Boolean).join("\n");

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#1b2a4a;">
        <h2 style="margin:0 0 8px 0;">${escapeHtml(subject)}</h2>
        <p><strong>Apartment:</strong> ${escapeHtml(apt)}</p>
        <p><strong>Name:</strong> ${escapeHtml(name)}<br/>
           <strong>Email:</strong> ${escapeHtml(email)}${phone ? `<br/><strong>Phone:</strong> ${escapeHtml(phone)}` : ""}</p>
        <hr style="border:none;border-top:1px solid #e6eef7;margin:16px 0"/>
        <pre style="white-space:pre-wrap;font:inherit;margin:0">${escapeHtml(message)}</pre>
      </div>
    `;

    const r = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM,         // npr. "Aura Adriatica <info@auraadriatica.com>"
        to: [CONTACT_TO],           // npr. "info@auraadriatica.com"
        subject,
        text,
        html,
        reply_to: email             // da klik na Reply ide gostu
      })
    });

    // Resend returns 200 on success
    if (!r.ok) {
      const errTxt = await r.text().catch(() => "");
      return bad({ status: r.status, body: errTxt || "Resend error" }, 502);
    }

    return json({ ok: true, sent: true });

  } catch (e) {
    return bad(`Server error: ${e?.message || String(e)}`, 500);
  }
}

// small helper to avoid HTML injection in email
function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
