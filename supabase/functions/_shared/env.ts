/**
 * Environment Variables for Supabase Edge Functions
 * 
 * This file provides environment values loaded from Supabase secrets.
 * Uses Supabase secret names (not Vite names).
 */

/**
 * Required environment variable validator
 * Throws Error with JSON-friendly message if missing
 */
// @ts-ignore - Deno is available in Edge Functions runtime
function required(key: string): string {
  // @ts-ignore - Deno is available in Edge Functions runtime
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
  return value;
}

/**
 * Export individual Spotify environment variables with validation
 * These use Supabase secret names (SPOTIFY_CLIENT_ID, not VITE_SPOTIFY_CLIENT_ID)
 */
export const SPOTIFY_CLIENT_ID = required("SPOTIFY_CLIENT_ID");
export const SPOTIFY_CLIENT_SECRET = required("SPOTIFY_CLIENT_SECRET");
export const SPOTIFY_REDIRECT_URI = required("SPOTIFY_REDIRECT_URI");
export const SPOTIFY_API_BASE = required("SPOTIFY_API_BASE");

/**
 * Environment object for backward compatibility
 * Use this for reading env vars in Edge Functions
 */
export const env = {
  SUPABASE_URL: "https://vzjyclgrqoyxbbzplkgw.supabase.co",
  SUPABASE_ANON_KEY: "2d48d50211dd293b3b13815e65e15f4f17401f49f2436f9ee4e629a86e98752",
  SUPABASE_SERVICE_ROLE_KEY: "",

  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_API_BASE,
  SPOTIFY_REDIRECT_URI,

  FRONTEND_URL: "https://tryfluxa.vercel.app",

  // Other optional env vars
  OPENAI_API_KEY: "",
  CRON_SECRET: "",
  NEWSAPI_KEY: "",
  GUARDIAN_API_KEY: "",
  MEDIASTACK_KEY: "",
  STAPIPAL_KEY: "",
  SPORTRADAR_KEY: "",
  LASTFM_API_KEY: "",
};

/**
 * Ensure Supabase environment variables are present
 * Throws 401 Response if missing (for functions that need Supabase with anon key)
 */
export function ensureSupabaseEnv(): void {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

  if (missing.length) {
    console.error('[env] Missing Supabase env vars:', missing.join(', '));
    throw new Response(
      JSON.stringify({
        message: 'Missing Supabase credentials',
        missing,
      }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      },
    );
  }
}

/**
 * Ensure Supabase environment variables are present (for functions using service role key)
 * Throws 401 Response if missing (for functions that need Supabase with service role key)
 */
export function ensureSupabaseServiceEnv(): void {
  const missing: string[] = [];
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length) {
    console.error('[env] Missing Supabase service role env vars:', missing.join(', '));
    throw new Response(
      JSON.stringify({
        message: 'Missing Supabase service role credentials',
        missing,
      }),
      { 
        status: 401, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      },
    );
  }
}

/**
 * Ensure Spotify environment variables are present
 * Throws 500 Response if missing (for functions that need Spotify)
 */
export function ensureSpotifyEnv(): void {
  const missing: string[] = [];
  if (!env.SPOTIFY_CLIENT_ID) missing.push('SPOTIFY_CLIENT_ID');
  if (!env.SPOTIFY_CLIENT_SECRET) missing.push('SPOTIFY_CLIENT_SECRET');

  if (missing.length) {
    console.error('[env] Missing Spotify env vars:', missing.join(', '));
    throw new Response(
      JSON.stringify({
        message: 'Missing Spotify credentials',
        missing,
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      },
    );
  }
}

/**
 * Legacy ENV object for backward compatibility (throws on access if missing)
 * New code should use `env` object and `ensure*()` functions instead
 */
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
