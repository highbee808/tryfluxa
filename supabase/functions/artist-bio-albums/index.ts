import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/* -------------------------------------------------
   Spotify Authentication
-------------------------------------------------- */

async function getSpotifyToken() {
  const id = Deno.env.get("SPOTIFY_CLIENT_ID");
  const secret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  const authUrl = "https://accounts.spotify.com/api/token";

  const auth = btoa(`${id}:${secret}`);

  const res = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    console.error("[artist-bio-albums] Spotify token error:", res.status, await res.text());
    return null;
  }

  const json = await res.json();
  return json.access_token;
}

/* -------------------------------------------------
   Spotify GET Helper
-------------------------------------------------- */

async function spotifyGET(path: string, token: string) {
  const base = Deno.env.get("SPOTIFY_API_BASE") || "https://api.spotify.com/v1";
  const url = `${base}${path}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.error("[artist-bio-albums] Spotify GET error:", res.status, url);
    return null;
  }
  return res.json();
}

/* -------------------------------------------------
   Wikipedia Summary Fetch
-------------------------------------------------- */

async function fetchWikipediaBio(artistName: string) {
  const safe = artistName.replace(/ /g, "_");
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${safe}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[artist-bio-albums] Wikipedia fetch failed for:", artistName, res.status);
      return null;
    }

    const data = await res.json();

    if (data.extract) {
      // Clean: remove HTML, references, brackets
      return data.extract
        .replace(/\[[^\]]*\]/g, "")
        .replace(/<[^>]*>/g, "")
        .trim();
    }
  } catch (e) {
    console.warn("[artist-bio-albums] Wikipedia fetch error:", e);
    return null;
  }

  return null;
}

/* -------------------------------------------------
   Main Function
-------------------------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: cors });
  }

  try {
    // Support both GET (query param) and POST (body) for compatibility
    let artistId: string | null = null;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      artistId = url.searchParams.get("id") || url.searchParams.get("artistId");
    } else {
      const body = await req.json();
      artistId = body.id || body.artistId;
    }

    if (!artistId) {
      return new Response(
        JSON.stringify({ error: "Missing artist id" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[artist-bio-albums] Fetching bio and albums for artist ID:", artistId);

    // 1. Spotify token
    const token = await getSpotifyToken();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Failed to get Spotify token" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // 2. Artist details
    const artist = await spotifyGET(`/artists/${artistId}`, token);
    if (!artist) {
      return new Response(
        JSON.stringify({ error: "Artist not found" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log("[artist-bio-albums] Found artist:", artist.name);

    // 3. Albums
    const albumsRes = await spotifyGET(
      `/artists/${artistId}/albums?include_groups=album,single&limit=50`,
      token
    );
    const albums = (albumsRes?.items || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      releaseDate: a.release_date,
      albumType: a.album_type,
      imageUrl: a.images?.[0]?.url || null,
    }));

    console.log("[artist-bio-albums] Found", albums.length, "albums");

    // 4. Wikipedia biography
    const bio = await fetchWikipediaBio(artist.name);
    if (bio) {
      console.log("[artist-bio-albums] ✅ Wikipedia bio found");
    } else {
      console.warn("[artist-bio-albums] ⚠️ No Wikipedia bio found for:", artist.name);
    }

    const payload = {
      artistId,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      bio: bio ?? null,
      albums,
    };

    console.log("[artist-bio-albums] ✅ Returning payload with", albums.length, "albums");

    return new Response(JSON.stringify(payload), {
      headers: { ...cors, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("[artist-bio-albums] Error:", err);

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

