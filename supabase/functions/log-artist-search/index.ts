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
    // This function needs Supabase to log searches to database
    try {
      ensureSupabaseServiceEnv();
    } catch (response) {
      // ensureSupabaseServiceEnv() throws a Response, return it directly
      if (response instanceof Response) return response;
      throw response;
    }

    const { artistId, artistName } = await req.json();

    if (!artistId || !artistName) {
      return new Response(
        JSON.stringify({ error: "Missing artistId or artistName" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

    // Additional safety check (shouldn't happen if ensureSupabaseServiceEnv passed)
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[log-artist-search] Missing Supabase credentials after ensureSupabaseServiceEnv check");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert search log
    const { error } = await supabase
      .from("music_search_logs")
      .insert({
        artist_id: artistId,
        artist_name: artistName,
        searched_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[log-artist-search] Database error:", error);
      // Don't fail if table doesn't exist yet - just log
      return new Response(
        JSON.stringify({ success: true, warning: "Table may not exist yet" }),
        { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("[log-artist-search] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 } // Return 200 to not break frontend
    );
  }
});

