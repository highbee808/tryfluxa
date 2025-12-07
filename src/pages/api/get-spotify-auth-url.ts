export async function GET() {
  try {
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

    if (!redirectUri || !clientId) {
      console.error("Missing Spotify env vars");
      return new Response(
        JSON.stringify({ error: "Missing Spotify config" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const authUrl =
      "https://accounts.spotify.com/authorize?" +
      new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "user-read-email user-read-private",
      }).toString();

    return new Response(JSON.stringify({ authUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-spotify-auth-url error", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

