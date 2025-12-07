import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createResponse } from "../_shared/http.ts";
import { env } from "../_shared/env.ts";

/* -------------------------------------------------
   Spotify Authentication
-------------------------------------------------- */

async function getSpotifyToken(): Promise<string | null> {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  const authUrl = "https://accounts.spotify.com/api/token";

  if (!clientId || !clientSecret) {
    console.error("❌ Missing Spotify env vars:", {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
    });
    return null;
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    console.error("[music-search] Spotify token error:", res.status);
    return null;
  }

  const json = await res.json();
  return json.access_token ?? null;
}

/* -------------------------------------------------
   Spotify Search
-------------------------------------------------- */

async function searchSpotifyArtists(query: string, token: string): Promise<any[]> {
  const base = env.SPOTIFY_API_BASE;
  const url = `${base}/search?q=${encodeURIComponent(query)}&type=artist&limit=10`;

  try {
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[music-search] Spotify API error:", res.status);
      return [];
    }

    const json = await res.json();
    return json?.artists?.items || [];
  } catch (err) {
    console.error("[music-search] Spotify search error:", err);
    return [];
  }
}

/* -------------------------------------------------
   Main Handler
-------------------------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let query: string | null = null;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      query = url.searchParams.get("q") || url.searchParams.get("query");
    } else {
      const body = await req.json();
      query = body.q || body.query;
    }

    if (!query || query.trim().length < 2) {
      return createResponse({ results: [] }, 200);
    }

    console.log("[music-search] Searching for:", query);

    // Get Spotify token
    const token = await getSpotifyToken();
    if (!token) {
      return createResponse({ results: [] }, 200);
    }

    // Search Spotify
    const spotifyArtists = await searchSpotifyArtists(query, token);

    // Map to ArtistSearchResult format
    const results = spotifyArtists.map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      source: "spotify" as const,
    }));

    console.log("[music-search] Returning", results.length, "results");

    return createResponse({ results }, 200);

  } catch (err) {
    console.error("[music-search] Error:", err);
    return createResponse({ 
      results: [], 
      error: err instanceof Error ? err.message : "Unknown error" 
    }, 200);
  }
});

