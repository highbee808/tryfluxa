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

const curatedTrending: MusicItem[] = [
  {
    id: "wizkid-essence",
    title: "Essence",
    artist: "Wizkid ft. Tems",
    imageUrl: null, // Let frontend apply curated art
    url: "https://www.youtube.com/results?search_query=wizkid+essence",
    category: "trending",
    source: "curated",
    tags: ["Afrobeats", "Nigeria", "Global"],
    publishedAt: null,
  },
  {
    id: "burna-boy-city-boys",
    title: "City Boys",
    artist: "Burna Boy",
    imageUrl: null, // Let frontend apply curated art
    url: "https://www.youtube.com/results?search_query=burna+boy+city+boys",
    category: "trending",
    source: "curated",
    tags: ["Afrobeats", "Nigeria"],
    publishedAt: null,
  },
  {
    id: "rema-calm-down",
    title: "Calm Down",
    artist: "Rema",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Afrobeats"],
    publishedAt: null,
  },
  {
    id: "asake-lonely-at-the-top",
    title: "Lonely At The Top",
    artist: "Asake",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Afrobeats"],
    publishedAt: null,
  },
  {
    id: "ayra-starr-rush",
    title: "Rush",
    artist: "Ayra Starr",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Afrobeats"],
    publishedAt: null,
  },
  {
    id: "drake-meltdown",
    title: "MELTDOWN",
    artist: "Drake ft. Travis Scott",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Hip-Hop", "Global"],
    publishedAt: null,
  },
  {
    id: "taylor-swift-anti-hero",
    title: "Anti-Hero",
    artist: "Taylor Swift",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Pop", "Global"],
    publishedAt: null,
  },
  {
    id: "stray-kids-lalalala",
    title: "LALALALA",
    artist: "Stray Kids",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["K-Pop", "Global"],
    publishedAt: null,
  },
  {
    id: "tyla-water",
    title: "Water",
    artist: "Tyla",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Amapiano", "South Africa", "Global"],
    publishedAt: null,
  },
  {
    id: "tems-free-mind",
    title: "Free Mind",
    artist: "Tems",
    imageUrl: null, // Let frontend apply curated art
    category: "trending",
    source: "curated",
    tags: ["Afrobeats", "Nigeria"],
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
  const clientId = Deno.env.get("VITE_SPOTIFY_CLIENT_ID") ?? Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  const authUrl = Deno.env.get("SPOTIFY_AUTH_URL") || "https://accounts.spotify.com/api/token";

  if (!clientId || !clientSecret) {
    console.log("[music-trending] ⚠️ Spotify credentials not found");
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
    console.error("[music-trending] Spotify token error:", res.status);
    return null;
  }

  const json = await res.json();
  return json.access_token ?? null;
}

async function fetchSpotifyTrending(token: string): Promise<MusicItem[]> {
  const base = Deno.env.get("SPOTIFY_API_BASE") || "https://api.spotify.com/v1";
  // Fetch global top tracks
  const url = `${base}/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks?limit=20`; // Global Top 50

  try {
    const res = await fetch(url, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[music-trending] Spotify API error:", res.status);
      return [];
    }

    const json = await res.json();
    const tracks = json?.items?.map((item: any) => item.track).filter((t: any) => t) ?? [];

    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.log("[music-trending] ⚠️ Spotify returned empty tracks");
      return [];
    }

    const items: MusicItem[] = tracks.map((t: any, index: number): MusicItem => ({
      id: t.id || `spotify-${index}`,
      title: t.name,
      artist: t.artists?.[0]?.name ?? "Unknown",
      imageUrl: t.album?.images?.[0]?.url ?? null,
      url: t.external_urls?.spotify ?? null,
      category: "trending",
      source: "spotify",
      tags: ["Global"],
      publishedAt: t.album?.release_date ?? null,
    }));

    console.log(`[music-trending] ✅ Spotify returned ${items.length} trending tracks`);
    return items;
  } catch (err) {
    console.error("[music-trending] ❌ Spotify fetch error:", err);
    return [];
  }
}

async function fetchLastFmTrending(): Promise<MusicItem[]> {
  const apiKey = Deno.env.get("LASTFM_API_KEY");
  const secret = Deno.env.get("LASTFM_SHARED_SECRET");
  
  if (!apiKey) {
    console.log("[music-trending] ⚠️ LASTFM_API_KEY not found in environment");
    return [];
  }

  const url = `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${apiKey}&format=json&limit=20`;

  try {
    const res = await fetchWithTimeout(url, 4500);
    if (!res.ok) {
      console.error("[music-trending] ❌ Last.fm API returned non-OK status:", res.status, res.statusText);
      return [];
    }

    const json = await res.json();
    const tracks = json?.tracks?.track ?? [];

    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.log("[music-trending] ⚠️ Last.fm returned empty tracks array");
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
        category: "trending",
        source: "lastfm",
        tags: ["Global"],
        publishedAt: null,
      };
    });

    console.log(`[music-trending] ✅ Last.fm returned ${items.length} trending tracks`);
    return items;
  } catch (err) {
    console.error("[music-trending] ❌ Last.fm fetch error:", err);
    return [];
  }
}

serve(async (_req) => {
  console.log("[music-trending] start");

  if (_req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    let items: MusicItem[] = [];

    // Try Spotify first (best quality artwork)
    try {
      const token = await getSpotifyToken();
      if (token) {
        const spotifyItems = await fetchSpotifyTrending(token);
        if (spotifyItems.length > 0) {
          items = spotifyItems;
          console.log("[music-trending] spotify tracks count:", spotifyItems.length);
        }
      }
    } catch (err) {
      console.error("[music-trending] Spotify fetch failed:", err);
    }

    // Fallback to Last.fm if Spotify didn't return items
    if (items.length === 0) {
      try {
        items = await fetchLastFmTrending();
        console.log("[music-trending] lastfm tracks count:", items.length);
      } catch (err) {
        console.error("[music-trending] Last.fm fetch failed:", err);
        items = [];
      }
    }

    // Always fallback to curated if no API items
    if (!Array.isArray(items) || items.length === 0) {
      console.log("[music-trending] ⚠️ No API data → Using curated fallback");
      items = curatedTrending;
    }

    // Ensure all items have category: "trending"
    items = items.map(item => ({
      ...item,
      category: "trending" as const,
    }));

    // Debug log sample of final items
    console.log("[music-trending] final items sample:",
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
    console.error("[music-trending] ❌ Unexpected error:", err);
    // Always return curated fallback on any error
    return new Response(JSON.stringify({ items: curatedTrending }), {
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

