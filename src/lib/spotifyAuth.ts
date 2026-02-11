/**
 * Spotify Authentication Utilities
 * Helper functions for Spotify OAuth flow with PKCE
 */

import {
  generateCodeVerifier,
  generateCodeChallenge,
} from "./pkce";
import { supabase } from "@/integrations/supabase/client";

/**
 * Get Spotify access token (with auto-refresh via server)
 */
export async function getSpotifyAccessToken(): Promise<string | null> {
  const token = localStorage.getItem("spotify_access_token");
  const expires = Number(localStorage.getItem("spotify_expires_in"));
  const timestamp = Number(localStorage.getItem("spotify_token_timestamp"));

  // Check if token is expired
  const isExpired = expires && timestamp
    ? Date.now() - timestamp > expires * 1000
    : false;

  if (token && !isExpired) {
    return token;
  }

  // Auto-refresh via server (server reads refresh_token from DB)
  try {
    const newToken = await refreshSpotifyToken();
    return newToken;
  } catch (error) {
    console.error("Failed to refresh Spotify token:", error);
    return null;
  }
}

/**
 * Refresh expired access token via edge function (JWT-authenticated).
 * The server reads the refresh_token from the DB — no token sent from client.
 */
async function refreshSpotifyToken(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("spotify-oauth-refresh", {
    method: "POST",
    body: {},
  });

  if (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }

  const newToken = data?.access_token;

  if (newToken) {
    localStorage.setItem("spotify_access_token", newToken);
    if (data.expires_in) {
      localStorage.setItem("spotify_expires_in", data.expires_in.toString());
      localStorage.setItem("spotify_token_timestamp", Date.now().toString());
    }
    return newToken;
  }

  return null;
}

/**
 * Check if user has connected Spotify (sync, localStorage-based)
 */
export function isSpotifyConnected(): boolean {
  const token = localStorage.getItem("spotify_access_token");
  return !!token;
}

/**
 * Check Spotify connection status from server (async, authoritative)
 */
export async function checkSpotifyConnection(): Promise<{
  connected: boolean;
  spotify_user_id?: string;
  display_name?: string;
  token_expired?: boolean;
}> {
  try {
    const { data, error } = await supabase.functions.invoke("spotify-status", {
      method: "POST",
      body: {},
    });

    if (error || !data) {
      return { connected: false };
    }

    return data;
  } catch {
    return { connected: false };
  }
}

/**
 * Spotify redirect resolver
 * Prefers env override; falls back to current origin.
 */
export function getSpotifyRedirectUri(): string {
  const envRedirect = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  if (envRedirect) return envRedirect;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/spotify/callback`;
  }
  return "https://tryfluxa.vercel.app/spotify/callback";
}

export function getRedirectUriSafe(): string {
  return getSpotifyRedirectUri();
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
  const scope = [
    "user-read-email",
    "user-read-private",
    "user-top-read",
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
  ].join(" ");

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

/**
 * Disconnect Spotify (clear localStorage AND delete DB row)
 */
export async function disconnectSpotify(): Promise<void> {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_expires_in");
  localStorage.removeItem("spotify_token_timestamp");

  // Delete server-side record (RLS scopes to current user)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("spotify_accounts").delete().eq("user_id", user.id);
    }
  } catch (err) {
    console.warn("[spotifyAuth] Failed to delete DB record:", err);
  }
}
