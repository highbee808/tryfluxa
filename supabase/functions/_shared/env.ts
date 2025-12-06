export const ENV = {
  get VITE_SUPABASE_URL() {
    const val = Deno.env.get("VITE_SUPABASE_URL");
    if (!val) throw new Error("Missing VITE_SUPABASE_URL");
    return val;
  },
  get VITE_SUPABASE_ANON_KEY() {
    const val = Deno.env.get("VITE_SUPABASE_ANON_KEY");
    if (!val) throw new Error("Missing VITE_SUPABASE_ANON_KEY");
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
};

// Spotify OAuth environment variables - use VITE_ prefix
export const VITE_SPOTIFY_CLIENT_ID = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");
export const VITE_SPOTIFY_CLIENT_SECRET = Deno.env.get("VITE_SPOTIFY_CLIENT_SECRET");
export const VITE_SPOTIFY_REDIRECT_URI = Deno.env.get("VITE_SPOTIFY_REDIRECT_URI");
export const VITE_SPOTIFY_API_BASE = Deno.env.get("VITE_SPOTIFY_API_BASE") || "https://api.spotify.com/v1";
export const VITE_FRONTEND_URL = Deno.env.get("VITE_FRONTEND_URL") || "https://tryfluxa.vercel.app";
