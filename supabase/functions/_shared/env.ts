export const ENV = {
  get VITE_SUPABASE_URL() {
    const val = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    if (!val) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_URL");
    return val;
  },
  get VITE_SUPABASE_ANON_KEY() {
    const val = Deno.env.get("VITE_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (!val) throw new Error("Missing VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY");
    return val;
  },
  get VITE_SUPABASE_SERVICE_ROLE_KEY() {
    const val = Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SB_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!val) throw new Error("Missing VITE_SUPABASE_SERVICE_ROLE_KEY or SB_SERVICE_ROLE_KEY");
    return val;
  },
  get OPENAI_API_KEY() {
    const val = Deno.env.get("OPENAI_API_KEY");
    if (!val) throw new Error("Missing OPENAI_API_KEY");
    return val;
  },
  get CRON_SECRET() {
    const val = Deno.env.get("CRON_SECRET");
    if (!val) throw new Error("Missing CRON_SECRET");
    return val;
  },
  get NEWSAPI_KEY() {
    return Deno.env.get("NEWSAPI_KEY") || "";
  },
  get GUARDIAN_API_KEY() {
    return Deno.env.get("GUARDIAN_API_KEY") || "";
  },
  get MEDIASTACK_KEY() {
    return Deno.env.get("MEDIASTACK_KEY") || "";
  },
  get STAPIPAL_KEY() {
    return Deno.env.get("STAPIPAL_KEY") || "";
  },
  get SPORTRADAR_KEY() {
    return Deno.env.get("SPORTRADAR_KEY") || "";
  },
  get SPOTIFY_CLIENT_ID() {
    const val = Deno.env.get("VITE_SPOTIFY_CLIENT_ID") ?? Deno.env.get("SPOTIFY_CLIENT_ID");
    if (!val) throw new Error("Missing VITE_SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_ID");
    return val;
  },
  get SPOTIFY_CLIENT_SECRET() {
    const val = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    if (!val) throw new Error("Missing SPOTIFY_CLIENT_SECRET");
    return val;
  },
};

// Unified Spotify OAuth environment variables
export const SPOTIFY_CLIENT_ID =
  Deno.env.get("VITE_SPOTIFY_CLIENT_ID") ??
  Deno.env.get("SPOTIFY_CLIENT_ID");

export const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

export const FRONTEND_URL =
  Deno.env.get("FRONTEND_URL") ?? Deno.env.get("VITE_FRONTEND_URL") ?? "https://tryfluxa.vercel.app";

// Spotify OAuth redirect URI - this is what gets registered in Spotify Dashboard
// It points to the Edge Function that handles the OAuth callback
export const SPOTIFY_REDIRECT_URI =
  Deno.env.get("SPOTIFY_REDIRECT_URI") ??
  (() => {
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "https://vzjyclgrqoyxbbzplkgw.supabase.co";
    return `${supabaseUrl}/functions/v1/spotify-oauth-callback`;
  })();

// Frontend callback URL (where user is redirected after OAuth completes)
// Default to /api/spotify/callback but fallback to /spotify/callback for backward compatibility
export const SPOTIFY_FRONTEND_CALLBACK_URL =
  Deno.env.get("SPOTIFY_FRONTEND_CALLBACK_URL") ??
  `${FRONTEND_URL}/api/spotify/callback`;
