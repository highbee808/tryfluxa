export async function GET() {
  try {
    const redirect_uri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const client_id = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

    if (!redirect_uri || !client_id) {
      return new Response(
        JSON.stringify({
          error: "Missing Spotify environment variables",
          redirect_uri: !!redirect_uri,
          client_id: !!client_id,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const state = crypto.randomUUID();

    const authUrl =
      "https://accounts.spotify.com/authorize" +
      `?client_id=${client_id}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&scope=${encodeURIComponent(
        "user-read-email user-read-private user-read-playback-state user-modify-playback-state"
      )}` +
      `&state=${state}`;

    return new Response(JSON.stringify({ authUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Internal error generating auth URL", details: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

