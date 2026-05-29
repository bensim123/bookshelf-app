/**
 * Bookshelf Worker — Cloudflare Worker
 *
 * Handles two request types from the Bookshelf app:
 *
 *   1. AI proxy  — forwards chat completions to the Groq API
 *   2. Email     — sends friend-request notifications via Resend
 *
 * Secrets required (Settings → Variables in Cloudflare dashboard):
 *   GROQ_API_KEY   — from console.groq.com
 *   RESEND_API_KEY — from resend.com  (free tier: 3,000 emails/month)
 *
 * The email action is triggered by { action: "notify", to, fromName } in the
 * POST body.  It does NOT go through the Groq rate-limiter; it has its own
 * per-recipient 1-per-hour window so no one gets spammed.
 */

const ALLOWED_ORIGINS = new Set([
  "https://bensim123.github.io",
  "http://localhost:3000",
]);

const GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions";
const RESEND_URL = "https://api.resend.com/emails";
const APP_URL    = "https://bensim123.github.io/bookshelf-app";

// ── AI rate limit: 1 request per IP per 30 s ─────────────────────────────────
const rateLimitMap  = new Map();
const RATE_WINDOW_MS = 30_000;

function isRateLimited(ip) {
  const now = Date.now();
  const last = rateLimitMap.get(ip) || 0;
  if (now - last < RATE_WINDOW_MS) return true;
  rateLimitMap.set(ip, now);
  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap)
      if (now - v > RATE_WINDOW_MS * 2) rateLimitMap.delete(k);
  }
  return false;
}

// ── Email rate limit: 1 notification per recipient email per hour ─────────────
const emailRateMap    = new Map();
const EMAIL_WINDOW_MS = 3_600_000;

function isEmailRateLimited(emailKey) {
  const now = Date.now();
  const last = emailRateMap.get(emailKey) || 0;
  if (now - last < EMAIL_WINDOW_MS) return true;
  emailRateMap.set(emailKey, now);
  if (emailRateMap.size > 1000) {
    for (const [k, v] of emailRateMap)
      if (now - v > EMAIL_WINDOW_MS * 2) emailRateMap.delete(k);
  }
  return false;
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://bensim123.github.io";
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// Minimal HTML escaping so a display name can't inject tags into the email body
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers: corsHeaders(origin) });

    if (request.method !== "POST")
      return new Response("Method not allowed", { status: 405 });

    let body;
    try { body = await request.json(); }
    catch {
      return new Response(
        JSON.stringify({ error: { message: "Invalid JSON" } }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    // ── Email notification ───────────────────────────────────────────────────
    if (body.action === "notify") {
      const { to, fromName } = body;
      if (!to || !fromName) {
        return new Response(
          JSON.stringify({ ok: false, note: "missing-fields" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
        );
      }

      // 1-per-hour guard per recipient — silently succeeds so UI never shows an error
      const emailKey = to.toLowerCase().trim();
      if (isEmailRateLimited(emailKey))
        return new Response(
          JSON.stringify({ ok: true, note: "rate-limited" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
        );

      // If the secret isn't configured yet, succeed silently so the app still works
      if (!env.RESEND_API_KEY)
        return new Response(
          JSON.stringify({ ok: true, note: "no-key" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
        );

      const safeName = esc(fromName);
      const html = `
        <div style="font-family:Georgia,serif;max-width:520px;margin:40px auto;padding:0 20px;color:#2c1a0e">
          <div style="font-size:36px;margin-bottom:6px">📚</div>
          <h1 style="font-size:22px;font-weight:900;margin:0 0 4px;color:#1a0e00">Bookshelf</h1>
          <p style="color:#7a5c3a;margin:0 0 28px;font-size:13px">Your personal reading tracker</p>

          <p style="font-size:17px;line-height:1.65;margin:0 0 16px">
            <strong>${safeName}</strong> sent you a friend request on Bookshelf!
          </p>
          <p style="font-size:14px;line-height:1.65;color:#5a3e28;margin:0 0 32px">
            Accept or decline in the app. Once connected you can compare reading stats,
            achievements, and wishlists with each other.
          </p>

          <a href="${APP_URL}"
             style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;
                    padding:14px 32px;border-radius:12px;font-family:Arial,sans-serif;
                    font-weight:800;font-size:15px;letter-spacing:.3px">
            Open Bookshelf →
          </a>

          <p style="font-size:11px;color:#a08060;margin-top:36px;line-height:1.6">
            You received this because ${safeName} has your email address.<br>
            If you don't use Bookshelf you can safely ignore this message.
          </p>
        </div>`;

      try {
        const resp = await fetch(RESEND_URL, {
          method: "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from:    "Bookshelf <onboarding@resend.dev>",
            to:      [emailKey],
            subject: `${fromName} wants to be your friend on Bookshelf 📚`,
            html,
          }),
        });
        const data = await resp.json();
        return new Response(
          JSON.stringify({ ok: resp.ok, ...data }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
        );
      } catch (e) {
        // Return 200 so the app doesn't treat this as an error — the friend request
        // was already written to Firestore successfully
        return new Response(
          JSON.stringify({ ok: false, error: e.message }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
        );
      }
    }

    // ── AI proxy (Groq) ──────────────────────────────────────────────────────
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: { message: "Too many requests — please wait a moment before trying again." } }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    try {
      const upstream = await fetch(GROQ_URL, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(body),
      });
      const data = await upstream.json();
      return new Response(JSON.stringify(data), {
        status:  upstream.status,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: { message: e.message } }), {
        status:  500,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
  },
};
