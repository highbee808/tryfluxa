import { getSpotifyAuthURL } from "@/lib/spotify/oauth";

export async function GET() {
  try {
    const url = getSpotifyAuthURL();
    return new Response(url, { status: 200 });
  } catch (err) {
    return new Response("Failed to generate auth URL", { status: 500 });
  }
}

