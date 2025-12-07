// Ensure we always generate a correct redirect URI based on environment
export function getSpotifyRedirectURI() {
  const appUrl = import.meta.env.VITE_FRONTEND_URL;
  return `${appUrl}/spotify/callback`;
}

export function getSpotifyAuthURL() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const redirectUri = getSpotifyRedirectURI();

  const scope = encodeURIComponent(
    "user-read-email user-read-private user-top-read user-library-read"
  );

  const challenge = "S256";
  const state = crypto.randomUUID();

  return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&code_challenge_method=${challenge}&state=${state}`;
}

