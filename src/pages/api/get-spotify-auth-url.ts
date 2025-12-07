import { getSpotifyAuthURL } from "@/lib/spotify/oauth";

export async function GET() {
  try {
    const url = getSpotifyAuthURL();
    return new Response(JSON.stringify({ url }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to generate auth URL" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

