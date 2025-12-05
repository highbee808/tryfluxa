import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchWithTimeout(url: string, ms = 4500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { artist, method, limit } = body;

    if (!artist || !method) {
      return new Response(
        JSON.stringify({ error: "Missing artist or method" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🎵 [fetch-artist-profile] ${method} for: ${artist}`);

    const LASTFM_API_KEY = Deno.env.get("LASTFM_API_KEY") || Deno.env.get("LAST_FM_API_KEY");

    if (!LASTFM_API_KEY) {
      console.error("Last.fm API key not configured");
      return new Response(
        JSON.stringify({ error: "Last.fm API key not configured", data: null }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let url = "";
    switch (method) {
      case "getinfo":
        url = `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json`;
        break;
      case "gettoptracks":
        const trackLimit = limit || 5;
        url = `http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json&limit=${trackLimit}`;
        break;
      case "gettopalbums":
        const albumLimit = limit || 6;
        url = `http://ws.audioscrobbler.com/2.0/?method=artist.gettopalbums&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json&limit=${albumLimit}`;
        break;
      case "getsimilar":
        const similarLimit = limit || 5;
        url = `http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${LASTFM_API_KEY}&format=json&limit=${similarLimit}`;
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid method", data: null }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    const response = await fetchWithTimeout(url, 4500);
    
    if (!response.ok) {
      console.error(`[fetch-artist-profile] HTTP ${response.status}`);
      return new Response(
        JSON.stringify({ error: `HTTP ${response.status}`, data: null }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    if (data.error) {
      console.warn(`[fetch-artist-profile] Last.fm error: ${data.message}`);
      return new Response(
        JSON.stringify({ error: data.message, data: null }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ [fetch-artist-profile] Success for ${method}`);

    return new Response(
      JSON.stringify({ data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in fetch-artist-profile:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

