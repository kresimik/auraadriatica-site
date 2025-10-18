// /functions/api/contact.js
// Cloudflare Pages Function (POST /api/contact)
// Šalje e-mail preko Resend API-ja. Trebaš postaviti RESEND_API_KEY u Cloudflare Pages → Settings → Environment variables.

export const onRequestPost = async (context) => {
  try {
    const { request, env } = context;

    // --- Security: same-origin only (možeš dodati / promijeniti po potrebi)
    const origin = request.headers.get("Origin") || "";
    const host   = request.headers.get("Host") || "";
    // Ako želiš strogo: dopusti samo vlastitu domenu
    if (origin && !origin.includes(host)) {
      return json({ ok: false, error: "Forbidden origin" }, 403);
    }

    // --- Accept JSON
    if (!request.headers.get("Content-Type")?.includes("application/json")) {
      return json({ ok: false, error: "Expected application/json" }, 415);
    }

    const body = await request.json().catch(() => null);
    if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

    // --- Honeypot (skriveno polje "company" mora ostati prazno)
    if (body.company && String(body.company).trim() !== "") {
      // bots go brrr
      return json({ ok: true }); // tišina, ali nemoj slati
    }

    // --- Validate
    const name  = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const msg   = String(body.message || "").trim();
    const apt   = String(body.apartment || "").trim();  // Olive / Onyx
    const lang  = String(body.lang || "").trim().toUpperCase(); // EN/HR/DE/IT/SL...
    const userIP = context.request.headers.get("CF-Connecting-IP") || "unknown";

    if (!name || !email || !msg) {
      return json({ ok: false, error: "Missing required fields." }, 400);
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: "Invalid email." }, 400);
    }

    // --- Mail params (ENV)
    const RESEND_API_KEY = env.RESEND_API_KEY;
    const CONTACT_TO     = env.CONTACT_TO     || "info@auraadriatica.com";
    const CONTACT_FROM   = env.CONTACT_FROM   || "no-reply@auraadriatica.com"; // mora biti verified sender u Resend
    const CONTACT_BCC    = env.CONTACT_BCC    || ""; // opciono

    if (!RESEND_API_KEY) {
      return json({ ok: false, error: "Server missing RESEND_API_KEY." }, 500);
    }

    // --- Compose email
    const subject = `[${apt || "Inquiry"}] ${name} — ${lang || "EN"}`;

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#222">
        <h2 style="margin:0 0 10px 0">New inquiry${apt ? ` — ${escapeHTML(apt)}` : ""}</h2>
        <p><strong>Name:</strong> ${escapeHTML(name)}</p>
        <p><strong>Email:</strong> ${escapeHTML(email)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHTML(phone)}</p>` : ""}
        ${apt   ? `<p><strong>Apartment:</strong> ${escapeHTML(apt)}</p>` : ""}
        ${lang  ? `<p><strong>Language:</strong> ${escapeHTML(lang)}</p>` : ""}
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="white-space:pre-wrap">${escapeHTML(msg)}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="color:#666;font-size:12px">IP: ${escapeHTML(userIP)}</p>
      </div>
    `.trim();

    const payload = {
      from: CONTACT_FROM,
      to: [CONTACT_TO],
      subject,
      html,
    };
    if (CONTACT_BCC) payload.bcc = [CONTACT_BCC];

    // --- Send via Resend
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text().catch(()=> "");
      return json({ ok: false, error: "Email send failed", detail: text }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: "Server error" }, 500);
  }
};

// Utility: JSON response
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Utility: very basic HTML escape
function escapeHTML(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
