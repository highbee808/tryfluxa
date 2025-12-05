import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || !query.trim()) {
      return new Response(
        JSON.stringify({ artists: [] }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }
      );
    }

    console.log('🔍 Searching Last.fm for:', query);

    // Get Last.fm API key from environment (server-side only)
    // Use LASTFM_API_KEY or LAST_FM_API_KEY (both supported)
    const LASTFM_API_KEY = Deno.env.get('LASTFM_API_KEY') || Deno.env.get('LAST_FM_API_KEY');
    
    if (!LASTFM_API_KEY) {
      console.error('Last.fm API key not configured');
      return new Response(
        JSON.stringify({ error: 'Last.fm API key not configured', artists: [] }),
        { 
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }
      );
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
      return new Response(
        JSON.stringify({ error: 'Last.fm API error', artists: [] }),
        { 
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }
      );
    }

    const data = await response.json();
    
    if (data.error) {
      console.error('Last.fm API returned error:', data.message);
      return new Response(
        JSON.stringify({ error: data.message, artists: [] }),
        { 
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }
      );
    }

    // Parse Last.fm response
    const artists = data.results?.artistmatches?.artist || [];
    
    if (!Array.isArray(artists)) {
      return new Response(
        JSON.stringify({ artists: [] }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          },
        }
      );
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

    return new Response(
      JSON.stringify({ artists: mappedArtists }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );

  } catch (error) {
    console.error('Error in search-artists:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        artists: [] 
      }),
      { 
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
});

