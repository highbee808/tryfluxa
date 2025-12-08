// supabase/functions/_shared/env.ts

// Minimal Deno type declarations for linting
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Helper to safely read env vars in Edge Functions
const required = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) {
    console.error(`[env] Missing required env var: ${key}`);
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

export const SPOTIFY_CLIENT_ID = required("SPOTIFY_CLIENT_ID");
export const SPOTIFY_CLIENT_SECRET = required("SPOTIFY_CLIENT_SECRET");
export const SPOTIFY_REDIRECT_URI = required("SPOTIFY_REDIRECT_URI");
export const SPOTIFY_API_BASE = Deno.env.get("SPOTIFY_API_BASE") ??
  "https://api.spotify.com/v1";

// CORS helpers for JSON responses
const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });

export const jsonError = (message: string, status = 500): Response =>
  jsonResponse({ error: message }, { status });

export const handleOptions = (req: Request): Response | null => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }
  return null;
};

// Legacy compatibility exports (used by other functions)
export const env = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL") ?? "",
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_API_BASE,
  SPOTIFY_REDIRECT_URI,
  FRONTEND_URL: Deno.env.get("FRONTEND_URL") ?? "",
  OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") ?? "",
  CRON_SECRET: Deno.env.get("CRON_SECRET") ?? "",
  NEWSAPI_KEY: Deno.env.get("NEWSAPI_KEY") ?? "",
  GUARDIAN_API_KEY: Deno.env.get("GUARDIAN_API_KEY") ?? "",
  MEDIASTACK_KEY: Deno.env.get("MEDIASTACK_KEY") ?? "",
  STAPIPAL_KEY: Deno.env.get("STAPIPAL_KEY") ?? "",
  SPORTRADAR_KEY: Deno.env.get("SPORTRADAR_KEY") ?? "",
  LASTFM_API_KEY: Deno.env.get("LASTFM_API_KEY") ?? "",
};

export function ensureSupabaseEnv(): void {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");

  if (missing.length) {
    console.error("[env] Missing Supabase env vars:", missing.join(", "));
    throw jsonResponse(
      {
        message: "Missing Supabase credentials",
        missing,
      },
      {
        status: 401,
      },
    );
  }
}

export function ensureSupabaseServiceEnv(): void {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    console.error("[env] Missing Supabase service role env vars:", missing.join(", "));
    throw jsonResponse(
      {
        message: "Missing Supabase service role credentials",
        missing,
      },
      {
        status: 401,
      },
    );
  }
}

export function ensureSpotifyEnv(): void {
  const missing: string[] = [];
  if (!env.SPOTIFY_CLIENT_ID) missing.push("SPOTIFY_CLIENT_ID");
  if (!env.SPOTIFY_CLIENT_SECRET) missing.push("SPOTIFY_CLIENT_SECRET");

  if (missing.length) {
    console.error("[env] Missing Spotify env vars:", missing.join(", "));
    throw jsonResponse(
      {
        message: "Missing Spotify credentials",
        missing,
      },
      {
        status: 500,
      },
    );
  }
}

export const ENV = {
  get VITE_SUPABASE_URL() {
    if (!env.SUPABASE_URL) throw new Error("Missing SUPABASE_URL");
    return env.SUPABASE_URL;
  },
  get VITE_SUPABASE_ANON_KEY() {
    if (!env.SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");
    return env.SUPABASE_ANON_KEY;
  },
  get VITE_SUPABASE_SERVICE_ROLE_KEY() {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return env.SUPABASE_SERVICE_ROLE_KEY;
  },
  get OPENAI_API_KEY() {
    if (!env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
    return env.OPENAI_API_KEY;
  },
  get CRON_SECRET() {
    if (!env.CRON_SECRET) throw new Error("Missing CRON_SECRET");
    return env.CRON_SECRET;
  },
  get NEWSAPI_KEY() {
    return env.NEWSAPI_KEY;
  },
  get GUARDIAN_API_KEY() {
    return env.GUARDIAN_API_KEY;
  },
  get MEDIASTACK_KEY() {
    return env.MEDIASTACK_KEY;
  },
  get STAPIPAL_KEY() {
    return env.STAPIPAL_KEY;
  },
  get SPORTRADAR_KEY() {
    return env.SPORTRADAR_KEY;
  },
};
