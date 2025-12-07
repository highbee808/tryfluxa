import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { env, ensureSupabaseServiceEnv } from "../_shared/env.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: cors });
  }

  try {
    // This function needs Supabase to read search logs from database
    try {
      ensureSupabaseServiceEnv();
    } catch (response) {
      // ensureSupabaseServiceEnv() throws a Response - if Supabase env missing, return empty results
      if (response instanceof Response) {
        console.error("[music-trending-searches] Missing Supabase service role credentials");
        return new Response(
          JSON.stringify({ results: [] }),
          { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
        );
      }
      throw response;
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    // Additional safety check
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[music-trending-searches] Missing Supabase credentials after ensureSupabaseServiceEnv check");
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get top 10 most searched artists in last 24 hours
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const { data, error } = await supabase
      .from("music_search_logs")
      .select("artist_id, artist_name")
      .gte("searched_at", twentyFourHoursAgo.toISOString())
      .order("searched_at", { ascending: false })
      .limit(1000); // Get recent searches, then aggregate

    if (error) {
      console.error("[music-trending-searches] Database error:", error);
      // If table doesn't exist, return empty array
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Aggregate by artist_id and count
    const artistCounts = new Map<string, { id: string; name: string; count: number }>();
    
    (data || []).forEach((log: any) => {
      const id = log.artist_id;
      const name = log.artist_name;
      
      if (artistCounts.has(id)) {
        artistCounts.get(id)!.count++;
      } else {
        artistCounts.set(id, { id, name, count: 1 });
      }
    });

    // Sort by count and take top 10
    const topArtists = Array.from(artistCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(({ id, name }) => ({
        id,
        name,
        // imageUrl will be fetched by frontend if needed
      }));

    return new Response(
      JSON.stringify({ results: topArtists }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("[music-trending-searches] Error:", err);
    return new Response(
      JSON.stringify({ results: [] }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
    );
  }
});

