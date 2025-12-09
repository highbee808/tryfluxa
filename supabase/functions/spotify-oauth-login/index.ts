import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from "../_shared/env.ts";
import { corsHeaders } from "../_shared/cors.ts";

const SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "streaming",
].join(" ");

const buildAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SCOPES,
    state,
    show_dialog: "true",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Simple random state (could be stored/validated later)
    const state = crypto.randomUUID();
    const authUrl = buildAuthUrl(state);

    return new Response(
      JSON.stringify({ authUrl, state }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[spotify-oauth-login] Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to generate Spotify auth URL" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }
});
