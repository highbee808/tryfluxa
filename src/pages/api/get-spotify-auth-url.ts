export async function GET() {
  try {
    // Read environment variables from import.meta.env (Vite)
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    // Validate required environment variables
    if (!clientId || !redirectUri) {
      console.error("[get-spotify-auth-url] Missing Spotify env vars:", { 
        hasClientId: !!clientId, 
        hasRedirectUri: !!redirectUri 
      });
      return new Response(
        JSON.stringify({ error: "Spotify configuration missing" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Build authorization URL with PKCE for security
    let url: string;
    try {
      const { generateCodeVerifier, generateCodeChallenge } = await import("@/lib/pkce");
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = crypto.randomUUID();

      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "user-read-email user-read-private user-top-read user-library-read streaming playlist-read-private",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state,
        show_dialog: "true",
      });

      url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    } catch (pkceError) {
      // Fallback to non-PKCE flow if PKCE generation fails
      console.warn("[get-spotify-auth-url] PKCE generation failed, using basic OAuth:", pkceError);
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: "user-read-email user-read-private user-top-read user-library-read streaming playlist-read-private",
        show_dialog: "true",
      });
      url = `https://accounts.spotify.com/authorize?${params.toString()}`;
    }

    // Return JSON response with URL
    return new Response(
      JSON.stringify({ url }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    // Never break on errors - always return valid JSON
    const errorMessage = err?.message || err?.toString() || "Failed to generate Spotify auth URL";
    console.error("[get-spotify-auth-url] AUTH URL ERROR:", errorMessage);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate Spotify auth URL",
        url: null
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

