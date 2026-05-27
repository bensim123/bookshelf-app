/**
 * Bookshelf AI Proxy — Cloudflare Worker
 *
 * Proxies requests from the Bookshelf app to the Groq API.
 * The GROQ_API_KEY is stored as a Worker secret — never exposed to the browser.
 *
 * Deploy to Cloudflare Workers (free tier: 100,000 req/day).
 * Add secret: GROQ_API_KEY = your key from console.groq.com
 */

const ALLOWED_ORIGINS = new Set([
  "https://bensim123.github.io",
  "http://localhost:3000",
]);

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Simple in-memory rate limit: 1 AI request per IP per 30 seconds.
// Resets whenever the Worker cold-starts (fine for our scale).
const rateLimitMap = new Map();
const RATE_WINDOW_MS = 30_000;

function isRateLimited(ip) {
  const now = Date.now();
  const last = rateLimitMap.get(ip) || 0;
  if (now - last < RATE_WINDOW_MS) return true;
  rateLimitMap.set(ip, now);
  // Prune old entries so the map doesn't grow unbounded
  if (rateLimitMap.size > 500) {
    for (const [k, v] of rateLimitMap) {
      if (now - v > RATE_WINDOW_MS * 2) rateLimitMap.delete(k);
    }
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

    // Rate limit by IP
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (isRateLimited(ip)) {
      return new Response(
        JSON.stringify({ error: { message: "Too many requests — please wait a moment before trying again." } }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders(origin) } }
      );
    }

    try {
      const body = await request.json();

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
