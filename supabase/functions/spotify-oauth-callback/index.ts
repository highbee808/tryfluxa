import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/http.ts";

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

    const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("VITE_SPOTIFY_CLIENT_SECRET");
    const redirectUri = Deno.env.get("VITE_SPOTIFY_REDIRECT_URI");
    const frontendUrl = Deno.env.get("VITE_FRONTEND_URL") || "https://tryfluxa.vercel.app";

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("Missing Spotify credentials:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
      });
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
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
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
    const appUrl = new URL(`${frontendUrl}/spotify/callback`);
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
