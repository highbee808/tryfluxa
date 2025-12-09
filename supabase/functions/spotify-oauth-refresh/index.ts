/**
 * Spotify OAuth Refresh - Refresh expired access tokens
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { parseBody } from "../_shared/http.ts";
import { env } from "../_shared/env.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    const url = new URL(req.url);
    
    // Support both POST (body) and GET (query params) for backward compatibility
    let refreshToken: string | null = null;
    
    if (req.method === "POST") {
      const body = await parseBody<{ refresh_token?: string }>(req);
      refreshToken = body.refresh_token || null;
    } else {
      refreshToken = url.searchParams.get("refresh_token");
    }

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: "Missing refresh_token parameter" }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Exchange refresh token for new access token
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: env.SPOTIFY_CLIENT_ID,
        client_secret: env.SPOTIFY_CLIENT_SECRET,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Spotify token refresh failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to refresh token" }),
        { status: tokenResponse.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    const tokenData = await tokenResponse.json();

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in || 3600,
        ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
      }),
      { status: 200, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Spotify refresh error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to refresh token" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }
});
