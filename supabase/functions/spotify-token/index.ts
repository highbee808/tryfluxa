import { encode } from "jsr:@std/encoding/base64";
import { env } from "../_shared/env.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const REDIRECT_URI =
  Deno.env.get("SPOTIFY_REDIRECT_URI") ??
  "https://tryfluxa.vercel.app/spotify/callback";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "https://tryfluxa.vercel.app";
  const cors = handleCors(req, origin);
  if (cors) return cors;

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Missing code" }),
        { 
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" }
        }
      );
    }

    const clientId = env.SPOTIFY_CLIENT_ID;
    const clientSecret = env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret || !REDIRECT_URI) {
      console.error("❌ Missing Spotify env vars:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!REDIRECT_URI,
      });
      return new Response(
        JSON.stringify({ error: "Missing required Spotify credentials" }),
        { 
          status: 500,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" }
        }
      );
    }

    const auth = encode(`${clientId}:${clientSecret}`);

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    });

    let tokenRes: Response;
    try {
      tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch (err) {
      console.error("❌ Spotify token request failed:", err);
      return new Response(
        JSON.stringify({ error: "network_failure", message: (err as Error).message }),
        { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    if (!tokenRes.ok) {
      const raw = await tokenRes.text();
      console.error("❌ Spotify token exchange error:", raw);
      return new Response(
        JSON.stringify({ error: "spotify_error", status: tokenRes.status, raw }),
        { status: tokenRes.status, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } }
      );
    }

    const data = await tokenRes.json();

    if (!data.access_token) {
      return new Response(
        JSON.stringify({ error: "Token missing", raw: data }),
        { 
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" }
      }
    );
  }
});
