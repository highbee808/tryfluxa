/**
 * Spotify Authentication Utilities
 * Helper functions for Spotify OAuth flow with PKCE
 */

import { getFrontendUrl } from "./apiConfig";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  clearCodeVerifier,
} from "./pkce";

/**
 * Get Spotify access token (with auto-refresh)
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("spotify_access_token");
  const expires = Number(localStorage.getItem("spotify_expires_in"));
  const timestamp = Number(localStorage.getItem("spotify_token_timestamp"));
  const refreshToken = localStorage.getItem("spotify_refresh_token");

  // Check if token is expired
  const isExpired = expires && timestamp 
    ? Date.now() - timestamp > expires * 1000
    : false;

  if (token && !isExpired) {
    return token;
  }

  // Auto-refresh if expired
  if (refreshToken) {
    try {
      const newToken = await refreshSpotifyToken(refreshToken);
      return newToken;
    } catch (error) {
      console.error("Failed to refresh Spotify token:", error);
      return null;
    }
  }

  return null;
}

/**
 * Refresh expired access token
 */
async function refreshSpotifyToken(refreshToken: string): Promise<string | null> {
  try {
    const { callSupabaseFunction } = await import("./supabaseFunctionClient");
    const response = await callSupabaseFunction(
      `spotify-oauth-refresh`,
      {
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    const newToken = data.access_token;

    if (newToken) {
      localStorage.setItem("spotify_access_token", newToken);
      if (data.expires_in) {
        localStorage.setItem("spotify_expires_in", data.expires_in.toString());
        localStorage.setItem("spotify_token_timestamp", Date.now().toString());
      }
      if (data.refresh_token) {
        localStorage.setItem("spotify_refresh_token", data.refresh_token);
      }
      return newToken;
    }

    return null;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}

/**
 * Check if user has connected Spotify
 */
export function isSpotifyConnected(): boolean {
  const token = localStorage.getItem("spotify_access_token");
  return !!token;
}

/**
 * Safe redirect resolver:
 * - If VITE_SPOTIFY_REDIRECT_URI exists (dev), use it
 * - If SPOTIFY_REDIRECT_URI exists (prod), use it
 * - Otherwise fall back to localhost for dev convenience
 */
export function getRedirectUriSafe(): string {
  const devUri =
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
    "http://localhost:4173/spotify/callback";

  const prodUri =
    import.meta.env.SPOTIFY_REDIRECT_URI ||
    `${import.meta.env.VITE_FRONTEND_URL}/spotify/callback`;

  return import.meta.env.DEV ? devUri : prodUri;
}

export function getSpotifyRedirectUri(): string {
  return getRedirectUriSafe();
}

/**
 * Generate PKCE flow and return login URL
 */
export async function getSpotifyLoginUrlWithPKCE(): Promise<string> {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  // Store PKCE + state in localStorage for callback validation
  persistSpotifyOAuthParams({
    [SPOTIFY_CODE_VERIFIER_KEY]: codeVerifier,
    [SPOTIFY_CODE_CHALLENGE_KEY]: codeChallenge,
    [SPOTIFY_STATE_KEY]: state,
  });

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing VITE_SPOTIFY_CLIENT_ID — check your env vars.");
  }

  const redirectUri = getRedirectUriSafe();
  const scope = "user-read-email user-read-private user-top-read";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Get Spotify login URL constant - Constructed from environment variables
 * @deprecated Use getSpotifyLoginUrlWithPKCE() instead
 */
export function getSpotifyLoginUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Missing VITE_SUPABASE_URL — check your .env.local file. " +
      "Run 'npm run verify-env' to validate your environment variables."
    );
  }
  
  // Ensure URL doesn't have trailing slash
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  return `${baseUrl}/functions/v1/spotify-oauth-login`;
}

/**
 * Get Spotify login URL with proper callback redirect
 * @deprecated Use getSpotifyLoginUrlWithPKCE() instead
 */
export function getSpotifyLoginUrlWithCallback(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Missing VITE_SUPABASE_URL — check your .env.local file. " +
      "Run 'npm run verify-env' to validate your environment variables."
    );
  }
  
  // Use getFrontendUrl() which handles VITE_FRONTEND_URL in production
  // Note: Vite only exposes variables prefixed with VITE_ - unprefixed FRONTEND_URL would be undefined
  const frontendUrl = getFrontendUrl();
  
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/functions/v1/spotify-oauth-callback?frontend_redirect_uri=${encodeURIComponent(frontendUrl)}`;
  return `${getSpotifyLoginUrl()}?redirect_uri=${encodeURIComponent(callbackUrl)}`;
}

/**
 * Storage helpers for PKCE + state (localStorage to survive redirects)
 */
export const SPOTIFY_STATE_KEY = "spotify_oauth_state";
export const SPOTIFY_CODE_VERIFIER_KEY = "spotify_code_verifier";
export const SPOTIFY_CODE_CHALLENGE_KEY = "spotify_code_challenge";

export function persistSpotifyOAuthParams(
  params: Record<string, string>
): void {
  Object.entries(params).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[spotifyAuth] Failed to store ${key}:`, err);
    }
  });
}

export function readSpotifyOAuthParams(): {
  state: string | null;
  codeVerifier: string | null;
  codeChallenge: string | null;
} {
  return {
    state: localStorage.getItem(SPOTIFY_STATE_KEY),
    codeVerifier: localStorage.getItem(SPOTIFY_CODE_VERIFIER_KEY),
    codeChallenge: localStorage.getItem(SPOTIFY_CODE_CHALLENGE_KEY),
  };
}

export function clearSpotifyOAuthParams(): void {
  try {
    localStorage.removeItem(SPOTIFY_STATE_KEY);
    localStorage.removeItem(SPOTIFY_CODE_VERIFIER_KEY);
    localStorage.removeItem(SPOTIFY_CODE_CHALLENGE_KEY);
  } catch (err) {
    console.warn("[spotifyAuth] Failed to clear OAuth params:", err);
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  console.warn(
    "[spotifyAuth] VITE_SUPABASE_URL is missing – Spotify login will not work.",
  );
}

export async function getSpotifyAuthUrl(): Promise<string> {
  if (!SUPABASE_URL) {
    throw new Error("Supabase URL is not configured");
  }

  const url = `${SUPABASE_URL}/functions/v1/spotify-oauth-login`;

  const res = await fetch(url, {
    method: "GET",
  });

  const text = await res.text();

  // Try to parse JSON, but also detect HTML misconfigurations
  try {
    const data = JSON.parse(text) as { authUrl?: string; state?: string; error?: string };
    if (!res.ok) {
      throw new Error(data.error || `Spotify login failed with status ${res.status}`);
    }
    if (!data.authUrl) {
      throw new Error("Spotify login: authUrl missing in response");
    }
    return data.authUrl;
  } catch (err) {
    if (text.startsWith("<!doctype") || text.startsWith("<html")) {
      console.error("[spotifyAuth] HTML received instead of JSON:", text.slice(0, 200));
      throw new Error("Invalid response from Spotify backend (HTML returned instead of JSON). Check Supabase function deployment.");
    }
    console.error("[spotifyAuth] Failed to parse JSON:", text);
    throw err;
  }
}

/**
 * Disconnect Spotify (clear tokens)
 */
export function disconnectSpotify(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_expires_in");
  localStorage.removeItem("spotify_token_timestamp");
  clearCodeVerifier();
}
