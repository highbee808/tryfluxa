/**
 * Environment Variable Helper
 * Separates Supabase vs Spotify requirements to prevent unnecessary 401 errors
 */

// Raw env values - no throwing on access
const rawEnv = {
  SUPABASE_URL:
    Deno.env.get('VITE_SUPABASE_URL') ??
    Deno.env.get('SUPABASE_URL') ??
    '',
  SUPABASE_ANON_KEY:
    Deno.env.get('VITE_SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_ANON_KEY') ??
    '',
  SUPABASE_SERVICE_ROLE_KEY:
    Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SB_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    '',

  SPOTIFY_CLIENT_ID:
    Deno.env.get('VITE_SPOTIFY_CLIENT_ID') ??
    Deno.env.get('SPOTIFY_CLIENT_ID') ??
    '',
  SPOTIFY_CLIENT_SECRET:
    Deno.env.get('VITE_SPOTIFY_CLIENT_SECRET') ??
    Deno.env.get('SPOTIFY_CLIENT_SECRET') ??
    '',
  SPOTIFY_API_BASE:
    Deno.env.get('VITE_SPOTIFY_API_BASE') ??
    Deno.env.get('SPOTIFY_API_BASE') ??
    'https://api.spotify.com/v1',
  SPOTIFY_REDIRECT_URI:
    Deno.env.get('VITE_SPOTIFY_REDIRECT_URI') ??
    Deno.env.get('SPOTIFY_REDIRECT_URI') ??
    '',
  FRONTEND_URL:
    Deno.env.get('VITE_FRONTEND_URL') ??
    Deno.env.get('FRONTEND_URL') ??
    'https://tryfluxa.vercel.app',

  // Other optional env vars
  OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') ?? '',
  CRON_SECRET: Deno.env.get('CRON_SECRET') ?? '',
  NEWSAPI_KEY: Deno.env.get('NEWSAPI_KEY') ?? '',
  GUARDIAN_API_KEY: Deno.env.get('GUARDIAN_API_KEY') ?? '',
  MEDIASTACK_KEY: Deno.env.get('MEDIASTACK_KEY') ?? '',
  STAPIPAL_KEY: Deno.env.get('STAPIPAL_KEY') ?? '',
  SPORTRADAR_KEY: Deno.env.get('SPORTRADAR_KEY') ?? '',
  LASTFM_API_KEY: Deno.env.get('LASTFM_API_KEY') ?? Deno.env.get('LAST_FM_API_KEY') ?? '',
};

/**
 * Environment object - safe to access without throwing
 */
export const env = rawEnv;

/**
 * Ensure Supabase environment variables are present
 * Throws 401 Response if missing (for functions that need Supabase)
 */
export function ensureSupabaseEnv(): void {
  const missing: string[] = [];
  if (!rawEnv.SUPABASE_URL) missing.push('VITE_SUPABASE_URL/SUPABASE_URL');
  if (!rawEnv.SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY');

  if (missing.length) {
    console.error('[env] Missing Supabase env vars:', missing.join(', '));
    console.error('[env] Required env vars:', missing.join(', '));
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
 * Ensure Spotify environment variables are present
 * Throws 500 Response if missing (for functions that need Spotify)
 */
export function ensureSpotifyEnv(): void {
  const missing: string[] = [];
  if (!rawEnv.SPOTIFY_CLIENT_ID) missing.push('VITE_SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_ID');
  if (!rawEnv.SPOTIFY_CLIENT_SECRET) missing.push('VITE_SPOTIFY_CLIENT_SECRET/SPOTIFY_CLIENT_SECRET');
  // SPOTIFY_API_BASE has a default, so we don't require it
  // SPOTIFY_REDIRECT_URI and FRONTEND_URL are optional depending on function

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
    if (!rawEnv.SUPABASE_URL) throw new Error("Missing VITE_SUPABASE_URL");
    return rawEnv.SUPABASE_URL;
  },
  get VITE_SUPABASE_ANON_KEY() {
    if (!rawEnv.SUPABASE_ANON_KEY) throw new Error("Missing VITE_SUPABASE_ANON_KEY");
    return rawEnv.SUPABASE_ANON_KEY;
  },
  get VITE_SUPABASE_SERVICE_ROLE_KEY() {
    if (!rawEnv.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing VITE_SUPABASE_SERVICE_ROLE_KEY or SB_SERVICE_ROLE_KEY");
    return rawEnv.SUPABASE_SERVICE_ROLE_KEY;
  },
  get OPENAI_API_KEY() {
    if (!rawEnv.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
    return rawEnv.OPENAI_API_KEY;
  },
  get CRON_SECRET() {
    if (!rawEnv.CRON_SECRET) throw new Error("Missing CRON_SECRET");
    return rawEnv.CRON_SECRET;
  },
  get NEWSAPI_KEY() {
    return rawEnv.NEWSAPI_KEY;
  },
  get GUARDIAN_API_KEY() {
    return rawEnv.GUARDIAN_API_KEY;
  },
  get MEDIASTACK_KEY() {
    return rawEnv.MEDIASTACK_KEY;
  },
  get STAPIPAL_KEY() {
    return rawEnv.STAPIPAL_KEY;
  },
  get SPORTRADAR_KEY() {
    return rawEnv.SPORTRADAR_KEY;
  },
};

// Legacy exports for backward compatibility
export const VITE_SPOTIFY_CLIENT_ID = rawEnv.SPOTIFY_CLIENT_ID;
export const VITE_SPOTIFY_CLIENT_SECRET = rawEnv.SPOTIFY_CLIENT_SECRET;
export const VITE_SPOTIFY_REDIRECT_URI = rawEnv.SPOTIFY_REDIRECT_URI;
export const VITE_SPOTIFY_API_BASE = rawEnv.SPOTIFY_API_BASE;
export const VITE_FRONTEND_URL = rawEnv.FRONTEND_URL;
