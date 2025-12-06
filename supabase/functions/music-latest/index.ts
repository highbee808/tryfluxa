import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type MusicItem = {
  id: string;
  title: string;
  artist: string;
  imageUrl?: string | null;
  url?: string | null;
  category: "trending" | "latest";
  source: "spotify" | "lastfm" | "curated";
  tags?: string[];
  publishedAt?: string | null;
};

const curatedLatest: MusicItem[] = [
  {
    id: "ayra-starr-comma",
    title: "Comma",
    artist: "Ayra Starr",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["Afrobeats", "New"],
    publishedAt: null,
  },
  {
    id: "burna-boy-big-7",
    title: "Big 7",
    artist: "Burna Boy",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["Afrobeats"],
    publishedAt: null,
  },
  {
    id: "asake-only-me",
    title: "Only Me",
    artist: "Asake",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["Afrobeats"],
    publishedAt: null,
  },
  {
    id: "omah-lay-holy-ghost",
    title: "Holy Ghost",
    artist: "Omah Lay",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["Afrobeats"],
    publishedAt: null,
  },
  {
    id: "tems-new-track",
    title: "New Track",
    artist: "Tems",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["Soul", "Afrobeats"],
    publishedAt: null,
  },
  {
    id: "drake-recent-single",
    title: "Recent Single",
    artist: "Drake",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["Hip-Hop"],
    publishedAt: null,
  },
  {
    id: "stray-kids-new-release",
    title: "New Release",
    artist: "Stray Kids",
    imageUrl: null, // Let frontend apply curated art
    category: "latest",
    source: "curated",
    tags: ["K-Pop"],
    publishedAt: null,
  },
];

async function fetchWithTimeout(url: string, ms = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    console.error("⏳ Last.fm timeout or failure:", err);
    throw err;
  }
}

async function getSpotifyToken(): Promise<string | null> {
  const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("VITE_SPOTIFY_CLIENT_SECRET");
  const authUrl = "https://accounts.spotify.com/api/token";

  if (!clientId || !clientSecret) {
    console.log("[music-latest] ⚠️ Spotify credentials not found");
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
    console.error("[music-latest] Spotify token error:", res.status);
    return null;
  }

  const json = await res.json();
  return json.access_token ?? null;
}

async function fetchSpotifyLatest(token: string): Promise<MusicItem[]> {
  const base = Deno.env.get("VITE_SPOTIFY_API_BASE") || "https://api.spotify.com/v1";
  // Fetch new releases
  const url = `${base}/browse/new-releases?limit=20`;

  try {
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[music-latest] Spotify API error:", res.status);
      return [];
    }

    const json = await res.json();
    const albums = json?.albums?.items ?? [];

    if (!Array.isArray(albums) || albums.length === 0) {
      console.log("[music-latest] ⚠️ Spotify returned empty albums");
      return [];
    }

    // Convert albums to tracks (use first track from each album or album name as track)
    const items: MusicItem[] = albums.map((album: any, index: number): MusicItem => ({
      id: album.id || `spotify-album-${index}`,
      title: album.name,
      artist: album.artists?.[0]?.name ?? "Unknown",
      imageUrl: album.images?.[0]?.url ?? null,
      url: album.external_urls?.spotify ?? null,
      category: "latest",
      source: "spotify",
      tags: ["Global"],
      publishedAt: album.release_date ?? null,
    }));

    console.log(`[music-latest] ✅ Spotify returned ${items.length} latest releases`);
    return items;
  } catch (err) {
    console.error("[music-latest] ❌ Spotify fetch error:", err);
    return [];
  }
}

async function fetchLastFmLatest(): Promise<MusicItem[]> {
  const apiKey = Deno.env.get("LASTFM_API_KEY");
  const secret = Deno.env.get("LASTFM_SHARED_SECRET");
  
  if (!apiKey) {
    console.log("[music-latest] ⚠️ LASTFM_API_KEY not found in environment");
    return [];
  }

  // Use chart.gettoptracks as a fallback for "latest" - Last.fm doesn't have a direct "new releases" endpoint
  const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${apiKey}&format=json&limit=20`;

  try {
    const res = await fetchWithTimeout(url, 4500);
    if (!res.ok) {
      console.error("[music-latest] ❌ Last.fm API returned non-OK status:", res.status, res.statusText);
      return [];
    }

    const json = await res.json();
    const tracks = json?.tracks?.track ?? [];

    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.log("[music-latest] ⚠️ Last.fm returned empty tracks array");
      return [];
    }

    const items = tracks.map((t: any, index: number): MusicItem => {
      // Pick highest quality image - Last.fm images are ordered by size (smallest to largest)
      let imageUrl: string | null = null;
      if (Array.isArray(t.image) && t.image.length > 0) {
        // Use the last image (largest) or fallback to index 2 (medium)
        const lastImage = t.image[t.image.length - 1];
        imageUrl = lastImage?.["#text"] || t.image[2]?.["#text"] || null;
      }

      return {
        id: t.mbid || `${t.artist?.name ?? "unknown"}-${t.name}-${index}`,
        title: t.name,
        artist: t.artist?.name ?? "Unknown",
        imageUrl: imageUrl,
        url: t.url ?? null,
        category: "latest",
        source: "lastfm",
        tags: ["Global"],
        publishedAt: null,
      };
    });

    console.log(`[music-latest] ✅ Last.fm returned ${items.length} latest tracks`);
    return items;
  } catch (err) {
    console.error("[music-latest] ❌ Last.fm fetch error:", err);
    return [];
  }
}

serve(async (_req) => {
  console.log("[music-latest] start");

  if (_req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    let items: MusicItem[] = [];

    // Try Spotify first (best quality artwork)
    try {
      const token = await getSpotifyToken();
      if (token) {
        const spotifyItems = await fetchSpotifyLatest(token);
        if (spotifyItems.length > 0) {
          items = spotifyItems;
          console.log("[music-latest] spotify tracks count:", spotifyItems.length);
        }
      }
    } catch (err) {
      console.error("[music-latest] Spotify fetch failed:", err);
    }

    // Fallback to Last.fm if Spotify didn't return items
    if (items.length === 0) {
      try {
        items = await fetchLastFmLatest();
        console.log("[music-latest] lastfm tracks count:", items.length);
      } catch (err) {
        console.error("[music-latest] Last.fm fetch failed:", err);
        items = [];
      }
    }

    // Always fallback to curated if no API items
    if (!Array.isArray(items) || items.length === 0) {
      console.log("[music-latest] ⚠️ No API data → Using curated fallback");
      items = curatedLatest;
    }

    // Ensure all items have category: "latest"
    items = items.map(item => ({
      ...item,
      category: "latest" as const,
    }));

    // Debug log sample of final items
    console.log("[music-latest] final items sample:",
      items.slice(0, 3).map(i => ({
        id: i.id,
        title: i.title,
        artist: i.artist,
        source: i.source,
        hasImage: !!i.imageUrl
      }))
    );

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (err) {
    console.error("[music-latest] ❌ Unexpected error:", err);
    // Always return curated fallback on any error
    return new Response(JSON.stringify({ items: curatedLatest }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }
});

