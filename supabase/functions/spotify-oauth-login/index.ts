import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";
import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, env } from "../_shared/env.ts";

const SCOPES =
  "user-read-email user-read-private user-read-playback-state user-modify-playback-state";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Handle POST request for token exchange (after callback)
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { code, redirect_uri, code_verifier } = body;

      if (!code || !redirect_uri || !code_verifier) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters: code, redirect_uri, code_verifier" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const clientId = env.SPOTIFY_CLIENT_ID;
      const clientSecret = env.SPOTIFY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error("❌ Missing Spotify env vars:", {
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
        });
        return new Response(
          JSON.stringify({ error: "Server configuration error - missing Spotify credentials" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Exchange authorization code for access token with PKCE
      const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri,
          client_id: clientId,
          code_verifier: code_verifier,
        }),
      });

      const tokenData = await tokenRes.json();

      if (!tokenRes.ok) {
        console.error("Spotify token exchange failed:", tokenRes.status, tokenData);
        return new Response(
          JSON.stringify({
            error: "Spotify token exchange failed",
            details: tokenData.error_description || tokenData.error,
          }),
          {
            status: tokenRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          token_type: tokenData.token_type,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle GET request for authorization URL generation
    // Use exported constants directly (validated on module load)
    const state = crypto.randomUUID();

    const authUrl =
      "https://accounts.spotify.com/authorize" +
      `?client_id=${SPOTIFY_CLIENT_ID}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(SCOPES)}` +
      `&state=${state}`;

    // Return JSON with authUrl (not a redirect)
    return new Response(
      JSON.stringify({
        authUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[spotify-oauth-login] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
        },
      }
    );
  }
});
