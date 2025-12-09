import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
} from "../_shared/env.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    // Handle POST request with code in body
    let code: string | null = null;
    
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      code = body.code || null;
    } else {
      // Handle GET request with code in query params (for backward compatibility)
      const url = new URL(req.url);
      code = url.searchParams.get("code");
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing code" }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
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
        { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Return JSON with tokens (frontend will handle storage)
    const frontendUrl =
      Deno.env.get("FRONTEND_URL") ?? "https://tryfluxa.vercel.app";

    const redirectUrl = new URL("/music/vibe-rooms", frontendUrl);
    redirectUrl.searchParams.set("spotify", "connected");

    // TODO: persist tokenData if needed before redirecting

    return new Response(null, {
      status: 302,
      headers: {
        "Location": redirectUrl.toString(),
        ...corsHeaders(origin),
      },
    });
  } catch (err) {
    console.error("OAuth callback error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }
});
