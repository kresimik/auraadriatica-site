// /functions/api/contact.js
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

const emailOk = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function stripOuterQuotes(s = "") {
  let x = String(s).trim();
  x = x.replace(/^[“”"']+/, "").replace(/[“”"']+$/, "");
  return x.trim();
}

function squashSpaces(s = "") {
  return String(s).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeFrom(input, fallbackName = "Aura Adriatica") {
  let s = stripOuterQuotes(input || "");
  s = squashSpaces(s);

  // Already in "Name <email>" ?
  if (/^.+<[^<>@\s]+@[^<>@\s]+>$/.test(s)) return s;

  // bare email?
  if (emailOk(s)) return `${fallbackName} <${s}>`;

  // extract email between <>
  const m = s.match(/<\s*([^<>@\s]+@[^<>@\s]+)\s*>/);
  if (m && emailOk(m[1])) return `${fallbackName} <${m[1]}>`;

  // fallback
  return `${fallbackName} <no-reply@auraadriatica.com>`;
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json().catch(() => ({}));
    const { apt = "Apartment", name = "", email = "", phone = "", message = "", token = "" } = data || {};

    if (!name.trim()) return bad("Missing name");
    if (!emailOk(email)) return bad("Invalid email");
    if (!message.trim()) return bad("Message required");

    // Turnstile check
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
      return json({ ok: false, error: "Turnstile verification failed", turnstile: tJson }, 403);
    }

    // Resend
    const RESEND_API_KEY = env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return bad("Server misconfigured: RESEND_API_KEY missing", 500);

    const CONTACT_TO = squashSpaces(env.CONTACT_TO || "info@auraadriatica.com");
    const CONTACT_FROM_RAW = env.CONTACT_FROM || "Aura Adriatica <no-reply@auraadriatica.com>";
    const CONTACT_FROM = normalizeFrom(CONTACT_FROM_RAW, "Aura Adriatica");

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
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        subject,
        text,
        html,
        reply_to: email
      })
    });

    if (!r.ok) {
      const bodyText = await r.text().catch(() => "");
      let msg = "Resend error";
      try {
        const j = JSON.parse(bodyText);
        if (j && (j.message || j.error)) msg = j.message || j.error;
      } catch { if (bodyText) msg = bodyText; }

      return json({
        ok: false,
        status: r.status,
        error: msg,
        used: { from: CONTACT_FROM, to: CONTACT_TO }
      }, 502);
    }

    return json({ ok: true, sent: true });

  } catch (e) {
    return bad(`Server error: ${e?.message || String(e)}`, 500);
  }
}
