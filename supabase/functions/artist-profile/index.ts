import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

/* -------------------------------------------------
   Spotify Authentication
-------------------------------------------------- */

async function getSpotifyAccessToken() {
  const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID") ?? Deno.env.get("SPOTIFY_CLIENT_ID")!;
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;
  const authUrl = Deno.env.get("SPOTIFY_AUTH_URL") || "https://accounts.spotify.com/api/token";

  const authHeader = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    console.error("[artist-profile] Spotify token error:", res.status, await res.text());
    return null;
  }

  const json = await res.json();
  return json.access_token;
}

/* -------------------------------------------------
   Spotify API helpers
-------------------------------------------------- */

async function spotifyGET(path: string, token: string) {
  const base = Deno.env.get("SPOTIFY_API_BASE") || "https://api.spotify.com/v1";
  const url = `${base}${path}`;

  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (!res.ok) {
    console.error("[spotifyGET] Error", res.status, url);
    return null;
  }
  return res.json();
}

/* -------------------------------------------------
   Artist Stats Calculation (Fluxa-specific)
-------------------------------------------------- */

function computeFluxaRank(popularity: number, followers: number): number {
  // Simple weighted formula (tweak anytime)
  return Math.round((popularity * 2) + (followers / 1_000_000));
}

function computeBuzzScore(popularity: number): number {
  // Placeholder: we can evolve this later
  return Math.round(popularity * 0.5);
}

/* -------------------------------------------------
   Main Handler
-------------------------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: cors });
  }

  try {
    // Support both GET (query param) and POST (body) for compatibility
    let slug: string | null = null;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      slug = url.searchParams.get("slug") || url.searchParams.get("artist");
    } else {
      const body = await req.json();
      slug = body.slug || body.artist;
    }

    if (!slug) {
      return new Response(
        JSON.stringify({ error: "Missing slug or artist parameter" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[artist-profile] Incoming request for:", slug);

    // 1. Get Spotify token
    const token = await getSpotifyAccessToken();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Failed to get Spotify token" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 2. If slug is NOT a Spotify ID → search first
    let artist = null;

    // Attempt direct fetch (in case slug is already an ID)
    artist = await spotifyGET(`/artists/${slug}`, token);

    if (!artist || artist.error) {
      // Otherwise search by name
      console.log("[artist-profile] Searching Spotify for:", slug);
      const search = await spotifyGET(`/search?q=${encodeURIComponent(slug)}&type=artist&limit=1`, token);
      artist = search?.artists?.items?.[0];
      
      if (artist) {
        console.log("[artist-profile] Spotify search results for", slug, "=>",
          artist.name,
          "followers:", artist.followers?.total,
          "popularity:", artist.popularity
        );
      }
    } else {
      console.log("[artist-profile] Direct Spotify fetch for", slug, "=>",
        artist.name,
        "followers:", artist.followers?.total,
        "popularity:", artist.popularity
      );
    }

    if (!artist) {
      console.warn("[artist-profile] No Spotify artist found for:", slug);
      return new Response(
        JSON.stringify({ error: "Artist not found" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const artistId = artist.id;

    // Get top tracks
    const topTracksRes = await spotifyGET(`/artists/${artistId}/top-tracks?market=US`, token);
    const topTracks = topTracksRes?.tracks || [];

    // Compute stats
    const popularity = artist.popularity || 0;
    const followers = artist.followers?.total || 0;

    // Calculate Fluxa-native stats
    const popularityScore = popularity;
    const fluxaRank = computeFluxaRank(popularity, followers);
    const engagementScore = followers > 0 ? Math.round(followers / 10_000) : 0;
    const buzzScore = computeBuzzScore(popularity);

    // Optionally fetch Last.fm for bio (if needed)
    let bio = null;
    const LASTFM_KEY = Deno.env.get("LASTFM_API_KEY") || Deno.env.get("LAST_FM_API_KEY");
    if (LASTFM_KEY) {
      try {
        const lastfmUrl = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist.name)}&api_key=${LASTFM_KEY}&format=json`;
        const lastfmRes = await fetch(lastfmUrl);
        if (lastfmRes.ok) {
          const lastfmData = await lastfmRes.json();
          if (lastfmData?.artist?.bio?.summary) {
            bio = lastfmData.artist.bio.summary
              .replace(/<a[^>]+>.*?<\/a>/g, "")
              .trim();
          }
        }
      } catch (e) {
        console.warn("[artist-profile] Last.fm fetch failed:", e);
      }
    }

    // Map top tracks to expected format
    const mappedTopTracks = topTracks.map((t: any) => ({
      id: t.id,
      name: t.name,
      artist: artist.name,
      artistId: slug,
      album: t.album?.name,
      imageUrl: t.album?.images?.[0]?.url,
      duration: t.duration_ms ? Math.round(t.duration_ms / 1000) : undefined,
      publishedAt: undefined,
    }));

    const response = {
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      genres: artist.genres || [],
      bio: bio || "",
      popularityScore: popularityScore,
      fluxaRank: fluxaRank,
      engagementScore: engagementScore,
      buzzScore: buzzScore,
      topTracks: mappedTopTracks,
      topAlbums: [], // Can be added later if needed
    };

    console.log("[artist-profile] ✅ Returning Fluxa-native artist profile:", {
      name: response.name,
      hasImage: !!response.imageUrl,
      genresCount: response.genres.length,
      popularityScore: response.popularityScore,
      fluxaRank: response.fluxaRank,
      engagementScore: response.engagementScore,
      buzzScore: response.buzzScore,
      tracksCount: response.topTracks.length,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error("[artist-profile] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
