import { buildSpotifyAuthURL, validateSpotifyAuthEnv } from "@/lib/spotify/oauth";
import { generateCodeVerifier, generateCodeChallenge } from "@/lib/pkce";

export async function GET() {
  try {
    // Read environment variables from import.meta.env (Vite)
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

    // Log missing variables to console
    if (!clientId) {
      console.error("[get-spotify-auth-url] Missing VITE_SPOTIFY_CLIENT_ID");
    }
    if (!redirectUri) {
      console.error("[get-spotify-auth-url] Missing VITE_SPOTIFY_REDIRECT_URI");
    }

    // Validate and throw if missing (will return 500 error)
    validateSpotifyAuthEnv();

    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    
    // Generate state for CSRF protection
    const state = crypto.randomUUID();

    // Build authorization URL with PKCE
    const url = buildSpotifyAuthURL(codeChallenge, state);

    // Return only the URL as requested
    return new Response(
      JSON.stringify({ url }), 
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to generate auth URL";
    console.error("[get-spotify-auth-url] Error:", errorMessage);
    
    // Return 500 error with message when env vars are missing
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        url: null
      }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

