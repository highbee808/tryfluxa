import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_FRONTEND_CALLBACK_URL,
  FRONTEND_URL,
} from "../_shared/env.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Missing Spotify credentials" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange code for access token using unified redirect URI
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        client_id: SPOTIFY_CLIENT_ID,
        client_secret: SPOTIFY_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return new Response(
        JSON.stringify({
          error: "Spotify token exchange failed",
          details: tokenData,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Redirect back to Fluxa frontend with tokens
    const appUrl = new URL(SPOTIFY_FRONTEND_CALLBACK_URL);
    appUrl.searchParams.set("access_token", tokenData.access_token);
    if (tokenData.refresh_token)
      appUrl.searchParams.set("refresh_token", tokenData.refresh_token);
    if (tokenData.expires_in)
      appUrl.searchParams.set("expires_in", tokenData.expires_in.toString());

    return new Response(null, {
      status: 302,
      headers: {
        Location: appUrl.toString(),
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
