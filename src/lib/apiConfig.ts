/**
 * Shared API Configuration
 * Provides dynamic API base URL that works in both dev and production
 */

/**
 * Get the Supabase base URL
 */
export function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "❌ Missing VITE_SUPABASE_URL — check your .env.local file."
    );
  }
  return url.replace(/\/$/, ""); // Remove trailing slash
}

/**
 * Get the Supabase anon key
 */
export function getSupabaseAnonKey(): string {
  const key =
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!key || key.trim() === "") {
    throw new Error(
      "❌ Missing VITE_SUPABASE_ANON_KEY — check your .env.local file."
    );
  }
  return key;
}

/**
 * Get the API base URL for Edge Functions
 * Uses production URL in production, dynamic URL in dev
 */
export function getApiBaseUrl(): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1`;
}

/**
 * Get the frontend URL
 * Uses FRONTEND_URL env var in production, window.location.origin in dev
 */
export function getFrontendUrl(): string {
  // In production, use FRONTEND_URL env var
  if (import.meta.env.PROD) {
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.FRONTEND_URL;
    if (frontendUrl) {
      return frontendUrl;
    }
  }
  
  // In dev or if FRONTEND_URL not set, use window.location.origin
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  
  // Fallback (shouldn't happen in browser context)
  return "https://tryfluxa.vercel.app";
}

/**
 * Get default headers for API calls
 */
export function getDefaultHeaders(): Record<string, string> {
  const anonKey = getSupabaseAnonKey();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    "x-client-info": "fluxa-frontend",
  };
}
