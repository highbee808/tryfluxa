import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createResponse } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Support both GET (query params) and POST (body)
    let query: string | null = null;
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      query = url.searchParams.get("q") || url.searchParams.get("query");
    } else {
      const body = await req.json().catch(() => ({}));
      query = body.query || body.q || null;
    }

    if (!query || !query.trim()) {
      return createResponse({ artists: [] }, 200);
    }

    console.log('🔍 Searching Last.fm for:', query);

    // Get Last.fm API key from environment (server-side only)
    // Use LASTFM_API_KEY or LAST_FM_API_KEY (both supported)
    const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') || Deno.env.get('LAST_FM_API_KEY');
    
    if (!LASTFM_API_KEY) {
      console.error('Last.fm API key not configured');
      return createResponse({ error: 'Last.fm API key not configured', artists: [] }, 200);
    }

    // Timeout wrapper for Last.fm API calls
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

    // Call Last.fm search API
    const searchUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query.trim())}&api_key=${LASTFM_API_KEY}&format=json&limit=20`;
    
    const response = await fetchWithTimeout(searchUrl, 4500);
    
    if (!response.ok) {
      console.error('Last.fm API error:', response.status, response.statusText);
      return createResponse({ error: 'Last.fm API error', artists: [] }, 200);
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('Last.fm API returned error:', data.message);
      return createResponse({ error: data.message, artists: [] }, 200);
    }

    // Parse Last.fm response
    const artists = data.results?.artistmatches?.artist || [];
    
    if (!Array.isArray(artists)) {
      return createResponse({ artists: [] }, 200);
    }

    // Map Last.fm results to clean format
    const mappedArtists = artists.map((artist: any) => {
      // Get image URL (prefer large/extralarge, fallback to medium)
      const imageUrl = artist.image?.find((img: any) => img.size === 'large' || img.size === 'extralarge')?.['#text'] ||
                      artist.image?.find((img: any) => img.size === 'medium')?.['#text'] ||
                      artist.image?.[0]?.['#text'] ||
                      null;

      // Extract genres/tags if available
      const genres: string[] = [];
      if (artist.tags?.tag) {
        const tags = Array.isArray(artist.tags.tag) ? artist.tags.tag : [artist.tags.tag];
        genres.push(...tags.map((tag: any) => tag.name).filter(Boolean));
      }

      return {
        id: artist.mbid || artist.name.toLowerCase().replace(/\s+/g, '-'),
        name: artist.name,
        slug: artist.name.toLowerCase().replace(/\s+/g, '-'),
        imageUrl: imageUrl,
        genres: genres.length > 0 ? genres : [],
        listeners: artist.listeners || null,
        playcount: artist.playcount || null,
      };
    });

    console.log(`✅ Found ${mappedArtists.length} artists from Last.fm`);

    return createResponse({ artists: mappedArtists }, 200);

  } catch (error) {
    console.error('Error in search-artists:', error);
    return createResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      artists: [] 
    }, 200);
  }
});

