/**
 * Spotify Authentication Utilities
 * Helper functions for Spotify OAuth flow with PKCE
 */

import { getFrontendUrl } from "./apiConfig";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  storeCodeVerifier,
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
 * Get Spotify redirect URI based on environment
 */
export function getSpotifyRedirectUri(): string {
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    // Production: use VITE_SPOTIFY_REDIRECT_URI or default to Vercel URL
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    if (redirectUri) {
      // Protective guard: warn if redirect_uri doesn't match Vercel domain in production
      if (!redirectUri.includes('tryfluxa.vercel.app')) {
        console.warn(
          '[Spotify OAuth] Production redirect_uri does not match Vercel domain:',
          redirectUri
        );
      }
      return redirectUri;
    }
    return 'https://tryfluxa.vercel.app/spotify/callback';
  } else {
    // Development: use localhost
    return 'http://localhost:5173/spotify/callback';
  }
}

/**
 * Generate PKCE flow and return login URL
 */
export async function getSpotifyLoginUrlWithPKCE(): Promise<string> {
  // Validate required environment variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "Missing VITE_SUPABASE_URL — check your .env.local file. " +
      "Run 'npm run verify-env' to validate your environment variables."
    );
  }

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Missing VITE_SPOTIFY_CLIENT_ID — check your .env.local file."
    );
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Store code verifier in sessionStorage
  storeCodeVerifier(codeVerifier);

  // Build login URL with PKCE parameters
  const redirectUri = getSpotifyRedirectUri();
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const loginUrl = new URL(`${baseUrl}/functions/v1/spotify-oauth-login`);
  
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('code_challenge', codeChallenge);
  loginUrl.searchParams.set('code_challenge_method', 'S256');

  return loginUrl.toString();
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
 * Get Spotify authorization URL from API with PKCE
 * Code verifier is stored client-side by the API route
 * @returns Authorization URL or null if error
 */
export async function getSpotifyAuthUrl(): Promise<string | null> {
  try {
    const res = await fetch("/api/get-spotify-auth-url", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
      console.error("[getSpotifyAuthUrl] Failed to fetch Spotify auth URL:", res.status, errorData);
      throw new Error(errorData.error || "Unable to get Spotify authorization URL");
    }

    const data = await res.json();
    
    // Validate response has URL
    if (!data.url) {
      console.error("[getSpotifyAuthUrl] API returned null or missing URL:", data);
      throw new Error(data.error || "Invalid response from Spotify auth API");
    }

    console.log("[getSpotifyAuthUrl] Generated Spotify Auth URL");
    return data.url;
  } catch (err) {
    console.error("[getSpotifyAuthUrl] ERROR:", err);
    return null;
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
