import { SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI, jsonResponse, jsonError, handleOptions } from "../_shared/env.ts";

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
  // Handle CORS preflight
  const maybeOptions = handleOptions(req);
  if (maybeOptions) return maybeOptions;

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return jsonError("Method not allowed", 405);
    }

    // Simple random state (could be stored/validated later)
    const state = crypto.randomUUID();
    const authUrl = buildAuthUrl(state);

    return jsonResponse({ authUrl, state });
  } catch (err) {
    console.error("[spotify-oauth-login] Error:", err);
    return jsonError("Failed to generate Spotify auth URL");
  }
});
