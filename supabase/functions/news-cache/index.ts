import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache duration: 15 minutes
const CACHE_DURATION_MS = 15 * 60 * 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entity, action = "get" } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (action === "get") {
      // Check cache first
      const { data: cached } = await supabase
        .from("news_cache")
        .select("*")
        .eq("entity", entity)
        .gte("cached_at", new Date(Date.now() - CACHE_DURATION_MS).toISOString())
        .order("cached_at", { ascending: false })
        .limit(1)
        .single();

      if (cached) {
        console.log(`✅ Cache hit for ${entity}`);
        return new Response(
          JSON.stringify({ cached: true, news: cached.news_data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`❌ Cache miss for ${entity}, fetching fresh data...`);

      // Fetch fresh news (you can integrate with your news APIs here)
      // For now, return empty array
      const freshNews: any[] = [];

      // Store in cache
      await supabase
        .from("news_cache")
        .insert({
          entity,
          news_data: freshNews,
          cached_at: new Date().toISOString(),
        });

      return new Response(
        JSON.stringify({ cached: false, news: freshNews }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
