import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

// Simple in-memory token cache per function instance
let cachedToken: string | null = null;
let cachedExpiry = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < cachedExpiry - 60_000) {
    return cachedToken;
  }

  if (!clientId || !clientSecret) {
    console.error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
    throw new Error("spotify_env_missing");
  }

  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Spotify token error", res.status, text);
    throw new Error("spotify_token_error");
  }

  const json = await res.json() as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = json.access_token;
  cachedExpiry = now + json.expires_in * 1000;

  return cachedToken!;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const isJson = req.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await req.json().catch(() => ({})) : {};
    const action = (body as any).action ?? "searchArtists";

    if (action === "searchArtists") {
      const query = (body as any).query as string | undefined;

      if (!query || !query.trim()) {
        return new Response(
          JSON.stringify({ error: "missing_query" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const token = await getAccessToken();

      const params = new URLSearchParams({
        q: query.trim(),
        type: "artist",
        limit: "12",
      });

      const res = await fetch(
        `https://api.spotify.com/v1/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Spotify search error", res.status, text);
        return new Response(
          JSON.stringify({
            error: "spotify_search_failed",
            status: res.status,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const data = await res.json();
      const artists = data?.artists?.items ?? [];

      return new Response(
        JSON.stringify({ artists }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "unknown_action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("spotify-proxy error", err);
    return new Response(
      JSON.stringify({ error: "server_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
