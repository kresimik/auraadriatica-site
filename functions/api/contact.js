// /functions/api/contact.js

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_API_URL = "https://api.resend.com/emails";

const json = (obj, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });

const bad = (msg, status = 400, extra = {}) => json({ ok: false, error: msg, ...extra }, status);

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Optional: ako ti treba preflight u budućnosti
export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("Origin") || "*") });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const ORIGIN = request.headers.get("Origin") || "*";
  const CORS = corsHeaders(ORIGIN);

  const requiredEnv = ["TURNSTILE_SECRET", "RESEND_API_KEY"];
  for (const k of requiredEnv) {
    if (!env[k]) return bad(`Server misconfigured: ${k} missing`, 500, { env: k });
  }

  let data;
  try {
    data = await request.json();
  } catch {
    return bad("Invalid JSON", 400);
  }

  const {
    name = "",
    email = "",
    message = "",
    token = "",
    phone = "",
    apt = "Apartment",
  } = data || {};

  if (!name.trim() || !email.trim() || !message.trim()) {
    return bad("Missing required fields", 400);
  }
  if (!token) return bad("Missing Turnstile token", 400);

  // 1) Verify Turnstile
  const form = new URLSearchParams();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", token);

  let verifyJson = {};
  try {
    const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    verifyJson = await verifyRes.json();
  } catch {
    return bad("Turnstile verification request failed", 502);
  }

  if (!verifyJson?.success) {
    // Pomoćno za debug: error-codes (npr. “invalid-input-secret”, “invalid-input-response”, “timeout-or-duplicate”)
    return bad("Turnstile verification failed", 400, { code: verifyJson["error-codes"] || null });
  }

  // 2) Send via Resend
  const CONTACT_TO = env.CONTACT_TO || "info@auraadriatica.com";
  const CONTACT_FROM =
    env.CONTACT_FROM || "Aura Adriatica <info@auraadriatica.com>"; // obavezno validan verified sender

  const subject = `[${apt}] Inquiry from ${name}`;
  const text = `Name: ${name}
Email: ${email}
Phone: ${phone}

${message}`;

  const payload = {
    from: CONTACT_FROM,       // "Name <email@domain>"
    to: Array.isArray(CONTACT_TO) ? CONTACT_TO : [CONTACT_TO],
    subject,
    text,
    reply_to: email,
  };

  let rJson = {};
  try {
    const r = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    rJson = await r.json();
    if (!r.ok) {
      return bad(rJson?.message || "Resend error", r.status);
    }
  } catch {
    return bad("Resend request failed", 502);
  }

  return json({ ok: true, id: rJson?.id || null }, 200, CORS);
}
