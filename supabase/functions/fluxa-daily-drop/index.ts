import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("🌅 Fluxa is preparing daily drop for user:", user.id);

    // Get user's memory and favorite topics
    const { data: memory } = await supabase
      .from("fluxa_memory")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const favoriteTopics = memory?.favorite_topics || [];
    const userName = memory?.name || "bestie";

    // Get top 10 trending gists
    const { data: gists, error: gistsError } = await supabase
      .from("gists")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(10);

    if (gistsError) throw gistsError;

    // Prioritize gists matching favorite topics
    const prioritized = gists.sort((a, b) => {
      const aMatch = favoriteTopics.includes(a.topic_category || "") ? 1 : 0;
      const bMatch = favoriteTopics.includes(b.topic_category || "") ? 1 : 0;
      return bMatch - aMatch;
    });

    // Select top 3 diverse gists
    const selectedGists = prioritized.slice(0, 3);

    // Generate greeting based on time of day
    const hour = new Date().getHours();
    let timeGreeting = "Hey";
    if (hour < 12) timeGreeting = "Morning";
    else if (hour < 18) timeGreeting = "Afternoon";
    else timeGreeting = "Evening";

    const greeting = `${timeGreeting}, ${userName}! 🌞 Today's gist is *juicy!* 💅`;
    const headlines = selectedGists.map(g => `• ${g.headline}`).join("\n");
    const outro = "Which one should we start with? 🔥";

    const message = `${greeting}\n\n${headlines}\n\n${outro}`;

    console.log("✨ Fluxa's daily drop ready!");

    return new Response(
      JSON.stringify({
        message,
        gists: selectedGists,
        greeting: `${timeGreeting}, ${userName}! 🌞`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Daily drop error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
