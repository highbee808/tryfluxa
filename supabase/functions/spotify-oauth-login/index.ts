import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";

const SCOPES =
  "user-read-email user-read-private user-read-playback-state user-modify-playback-state";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle POST request for token exchange (after callback)
  if (req.method === "POST") {
    try {
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

      const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");
      const clientSecret = Deno.env.get("VITE_SPOTIFY_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        console.error("Missing VITE_SPOTIFY_CLIENT_ID or VITE_SPOTIFY_CLIENT_SECRET in Supabase Secrets");
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
    } catch (err) {
      console.error("Token exchange error:", err);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          details: err instanceof Error ? err.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  // Handle GET request for authorization URL generation (with PKCE)
  const url = new URL(req.url);
  const redirect_uri = url.searchParams.get("redirect_uri");
  const code_challenge = url.searchParams.get("code_challenge");
  const code_challenge_method = url.searchParams.get("code_challenge_method") || "S256";

  const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");

  if (!clientId) {
    console.error("Missing VITE_SPOTIFY_CLIENT_ID in Supabase Secrets");
    return new Response(
      JSON.stringify({ error: "Server configuration error - missing VITE_SPOTIFY_CLIENT_ID" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (!redirect_uri) {
    return new Response(
      JSON.stringify({ error: "Missing redirect_uri parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const state = crypto.randomUUID();

  const loginUrl = new URL("https://accounts.spotify.com/authorize");
  loginUrl.searchParams.set("client_id", clientId);
  loginUrl.searchParams.set("response_type", "code");
  loginUrl.searchParams.set("redirect_uri", redirect_uri);
  loginUrl.searchParams.set("scope", SCOPES);
  loginUrl.searchParams.set("state", state);

  // Add PKCE parameters if provided
  if (code_challenge) {
    loginUrl.searchParams.set("code_challenge", code_challenge);
    loginUrl.searchParams.set("code_challenge_method", code_challenge_method);
  }

  return new Response(null, {
    status: 307,
    headers: {
      Location: loginUrl.toString(),
      ...corsHeaders,
    },
  });
});
