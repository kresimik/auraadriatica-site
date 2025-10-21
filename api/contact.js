// /functions/api/contact.js
// Cloudflare Pages Function (route: /api/contact)

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);

const emailOk = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

function escapeHtml(s = "") {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// normalizira CONTACT_FROM u dopušten format
function buildFrom(raw) {
  const fallback = "Aura Adriatica <info@auraadriatica.com>";
  if (!raw || typeof raw !== "string") return fallback;

  const v = raw.trim().replaceAll("“", '"').replaceAll("”", '"').replaceAll("’", "'");
  // pokušaj izvući email
  const m = v.match(/<?([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})>?/);
  if (!m) return fallback;

  const email = m[1];
  // ako već ima <email>, pusti kako je; ako je samo email, dodaj ime
  if (/<\s*[\w.+-]+@/i.test(v)) return v;
  return `Aura Adriatica <${email}>`;
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json().catch(() => ({}));
    const { apt = "Apartment", name = "", email = "", phone = "", message = "", token = "" } = data || {};

    if (!name.trim()) return bad("Missing name");
    if (!emailOk(email)) return bad("Invalid email");
    if (!message.trim()) return bad("Message required");

    if (!env.TURNSTILE_SECRET) return bad("Server misconfigured: TURNSTILE_SECRET missing", 500);
    if (!token) return bad("Turnstile token missing", 400);

    // Verify Turnstile
    const form = new URLSearchParams();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", token);

    const tRes = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      body: form,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const tJson = await tRes.json().catch(() => ({}));
    if (!tJson.success) return bad("Turnstile verification failed", 403);

    // Prepare email
    const RESEND_API_KEY = env.RESEND_API_KEY;
    if (!RESEND_API_KEY) return bad("Server misconfigured: RESEND_API_KEY missing", 500);

    const CONTACT_TO = (env.CONTACT_TO || "info@auraadriatica.com").trim();
    const CONTACT_FROM = buildFrom(env.CONTACT_FROM || "no-reply@auraadriatica.com");

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
        from: CONTACT_FROM,           // npr. "Aura Adriatica <no-reply@auraadriatica.com>"
        to: [CONTACT_TO],
        subject,
        text,
        html,
        reply_to: email               // reply ide gostu
      })
    });

    if (!r.ok) {
      // vrati jasniji debug da odmah vidimo što je poslano
      const errText = await r.text().catch(() => "");
      return json({
        ok: false,
        status: r.status,
        error: errText || "Resend error",
        used: { from: CONTACT_FROM, to: CONTACT_TO }
      }, 502);
    }

    return json({ ok: true, sent: true });
  } catch (e) {
    return bad(`Server error: ${e?.message || String(e)}`, 500);
  }
}
