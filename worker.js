/**
 * Bookshelf AI Proxy — Cloudflare Worker
 *
 * Proxies requests from the Bookshelf app to the Google Gemini API.
 * The GEMINI_API_KEY is stored as a Worker secret — never exposed to the browser.
 *
 * Deploy to Cloudflare Workers (free tier: 100,000 req/day).
 * Add secret: GEMINI_API_KEY = your key from aistudio.google.com
 */

const ALLOWED_ORIGINS = new Set([
  "https://bensim123.github.io",
  "http://localhost:3000",
]);

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : "https://bensim123.github.io";
  return {
    "Access-Control-Allow-Origin":  allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const url  = `${GEMINI_URL}?key=${env.GEMINI_API_KEY}`;

      const upstream = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
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
