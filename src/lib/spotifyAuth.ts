/**
 * Spotify Authentication Utilities
 * Helper functions for Spotify OAuth flow
 */

import { getFrontendUrl } from "./apiConfig";

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
 * Get Spotify login URL constant - Constructed from environment variables
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
 * Disconnect Spotify (clear tokens)
 */
export function disconnectSpotify(): void {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_expires_in");
  localStorage.removeItem("spotify_token_timestamp");
}
