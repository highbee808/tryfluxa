/**
 * Return the correct Spotify redirect URI for the environment.
 * Priority: SPOTIFY_REDIRECT_URI (production/Vercel) -> VITE_SPOTIFY_REDIRECT_URI (local)
 */
export function getSpotifyRedirectUri(): string {
  const productionRedirect = import.meta.env.SPOTIFY_REDIRECT_URI as
    | string
    | undefined;
  const localRedirect = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as
    | string
    | undefined;

  const redirectUri = productionRedirect || localRedirect;

  if (!redirectUri) {
    throw new Error(
      "Missing Spotify redirect URI. Set SPOTIFY_REDIRECT_URI (prod) or VITE_SPOTIFY_REDIRECT_URI (local)."
    );
  }

  return redirectUri;
}

/**
 * Validate required Spotify environment variables for auth URL generation
 * Only validates CLIENT_ID and REDIRECT_URI (CLIENT_SECRET not needed for auth URL)
 * @throws Error if any required env var is missing
 */
export function validateSpotifyAuthEnv(): void {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri =
    import.meta.env.SPOTIFY_REDIRECT_URI ||
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI;

  const missing: string[] = [];
  if (!clientId) missing.push("VITE_SPOTIFY_CLIENT_ID");
  if (!redirectUri)
    missing.push("SPOTIFY_REDIRECT_URI or VITE_SPOTIFY_REDIRECT_URI");

  if (missing.length > 0) {
    const errorMessage = `Missing required Spotify environment variables: ${missing.join(", ")}. Please set them in your .env.local file.`;
    console.error("[validateSpotifyAuthEnv]", errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Build Spotify authorization URL with PKCE parameters
 * @param codeChallenge - PKCE code challenge (base64url encoded SHA256 hash)
 * @param state - OAuth state parameter for CSRF protection
 * @returns Spotify authorization URL
 * @throws Error if required env vars are missing
 */
export function buildSpotifyAuthURL(codeChallenge: string, state: string): string {
  validateSpotifyAuthEnv();

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID!;
  const redirectUri = getSpotifyRedirectUri();
  const scope = "user-read-email user-read-private user-top-read";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: scope,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: state,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

