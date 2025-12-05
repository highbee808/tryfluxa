import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cost estimation helper (approximate tokens and cost for OpenAI)
function estimateTokensAndCost(inputText: string, outputLength: number): { tokens: number; cost: number } {
  const inputTokens = Math.ceil(inputText.length / 4)
  const outputTokens = outputLength
  const totalTokens = inputTokens + outputTokens
  
  // OpenAI gpt-4o-mini pricing: $0.15 per 1M input tokens, $0.60 per 1M output tokens
  const inputCost = (inputTokens / 1_000_000) * 0.15
  const outputCost = (outputTokens / 1_000_000) * 0.60
  const totalCost = inputCost + outputCost
  
  return { tokens: totalTokens, cost: totalCost }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders });
  }

  try {
    const { userId, period = "daily" } = await req.json(); // "daily" or "weekly"

    if (!userId) {
      throw new Error("userId is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user's followed teams
    const { data: follows } = await supabase
      .from("fan_follows")
      .select("entity_id, fan_entities(name, category)")
      .eq("user_id", userId);

    if (!follows || follows.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No followed teams found",
          digest: null 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const teamNames = follows.map((f: any) => f.fan_entities.name);

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    if (period === "daily") {
      startDate.setDate(startDate.getDate() - 1);
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }

    // Fetch recent matches for followed teams
    const { data: matches } = await supabase
      .from("match_results")
      .select("*")
      .or(teamNames.map(name => `team_home.eq.${name},team_away.eq.${name}`).join(','))
      .gte("match_date", startDate.toISOString())
      .order("match_date", { ascending: false });

    // Get user's reactions
    const { data: reactions } = await supabase
      .from("sports_fan_reactions")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startDate.toISOString());

    // Fetch team stats
    const { data: entities } = await supabase
      .from("fan_entities")
      .select("name, stats, news_feed")
      .in("name", teamNames);

    // Use OpenAI to generate personalized digest
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const aiPrompt = `You are Fluxa, creating a ${period} personalized sports digest for a fan.

**Followed Teams:** ${teamNames.join(", ")}

**Recent Matches (${period}):**
${JSON.stringify(matches || [], null, 2)}

**User's Reactions:**
${JSON.stringify(reactions || [], null, 2)}

**Team Updates:**
${JSON.stringify(entities || [], null, 2)}

Create a fun, engaging ${period} digest with:
1. A catchy headline
2. Key highlights for each followed team (wins, losses, standout moments)
3. Performance summary with Fluxa's sassy commentary
4. What to watch for next
5. Personal touch based on user's reactions

Keep it under 500 words, personality-driven, and exciting!`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: "You are Fluxa, a charismatic AI sports companion. Write engaging, personalized digests." 
          },
          { role: "user", content: aiPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("Failed to generate digest");
    }

    const aiData = await aiResponse.json();
    const digestContent = aiData.choices[0].message.content;

    // Log API usage for cost monitoring
    const usage = estimateTokensAndCost(aiPrompt, digestContent?.length || 0)
    await supabase.from("api_usage_logs").insert({
      provider: "openai",
      endpoint: "gpt-4o-mini",
      tokens_used: usage.tokens,
      estimated_cost: usage.cost,
      user_id: userId
    })

    // Create notification for the user
    await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type: "digest",
        title: `Your ${period === "daily" ? "Daily" : "Weekly"} Sports Digest 📰`,
        message: digestContent.substring(0, 200) + "...",
        entity_name: "Fluxa",
      });

    return new Response(
      JSON.stringify({
        success: true,
        digest: {
          period,
          content: digestContent,
          teams: teamNames,
          matches_count: matches?.length || 0,
          reactions_count: reactions?.length || 0,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fluxa-personalized-digest:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
