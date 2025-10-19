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

const emailOk = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

/** Normalizira FROM vrijednost u format: "Name <email@domain>" */
function normalizeFrom(input, fallbackName = "Aura Adriatica") {
  if (!input) return `${fallbackName} <no-reply@auraadriatica.com>`;
  const s = String(input).trim();

  // 1) Već je u formatu "Name <email@...>"
  if (/^.+<[^<>@\s]+@[^<>@\s]+>$/.test(s)) return s;

  // 2) Samo email -> umotaj s imenom
  if (emailOk(s)) return `${fallbackName} <${s}>`;

  // 3) Pokušaj izvući email iz uglatih zagrada ako postoje višak razmaka
  const m = s.match(/<\s*([^<>@\s]+@[^<>@\s]+)\s*>/);
  if (m && emailOk(m[1])) return `${fallbackName} <${m[1]}>`;

  // 4) Ako ništa ne prolazi, padni na siguran fallback
  return `${fallbackName} <no-reply@auraadriatica.com>`;
}

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function onRequestPost({ request, env }) {
  try {
    // 1) Body
    const data = await request.json().catch(() => ({}));
    const {
      apt = "Apartment",
      name = "",
      email = "",
      phone = "",
      message = "",
      token = ""
    } = data || {};

    // 2) Validacije
    if (!name.trim()) return bad("Missing name");
    if (!emailOk(email)) return bad("Invalid email");
    if (!message.trim()) return bad("Message required");

    // 3) Turnstile provjera
    if (!env.TURNSTILE_SECRET) return bad("Server misconfigured: TURNSTILE_SECRET missing", 500);
    if (!token) return bad("Missing Turnstile token", 400);

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

    // 4) Resend slanje
    const RESEND_API_KEY = env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return bad("Server misconfigured: RESEND_API_KEY missing", 500);

    const CONTACT_TO = (env.CONTACT_TO || "info@auraadriatica.com").trim();
    const CONTACT_FROM_RAW = env.CONTACT_FROM || "Aura Adriatica <no-reply@auraadriatica.com>";
    const CONTACT_FROM = normalizeFrom(CONTACT_FROM_RAW, "Aura Adriatica");

    // krajnji subject/text/html
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
        <h2 style="margin:0 0 8px 0;">${esc(subject)}</h2>
        <p><strong>Apartment:</strong> ${esc(apt)}</p>
        <p><strong>Name:</strong> ${esc(name)}<br/>
           <strong>Email:</strong> ${esc(email)}${phone ? `<br/><strong>Phone:</strong> ${esc(phone)}` : ""}</p>
        <hr style="border:none;border-top:1px solid #e6eef7;margin:16px 0"/>
        <pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(message)}</pre>
      </div>
    `;

    const r = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM,          // npr. "Aura Adriatica <no-reply@auraadriatica.com>"
        to: [CONTACT_TO],            // npr. "info@auraadriatica.com"
        subject,
        text,
        html,
        reply_to: email              // odgovor ide direktno gostu
      })
    });

    if (!r.ok) {
      // Pokušaj izvući jasnu poruku iz Resenda
      const errTxt = await r.text().catch(() => "");
      let msg = "Resend error";
      try {
        const j = JSON.parse(errTxt);
        if (j && (j.message || j.error)) msg = j.message || j.error;
      } catch (_) {
        if (errTxt) msg = errTxt;
      }
      return bad({ status: r.status, message: msg, hint:
        "Check CONTACT_FROM format (e.g. 'Aura Adriatica <no-reply@auraadriatica.com>') and verify domain in Resend." }, 502);
    }

    return json({ ok: true, sent: true });
  } catch (e) {
    return bad(`Server error: ${e?.message || String(e)}`, 500);
  }
}
