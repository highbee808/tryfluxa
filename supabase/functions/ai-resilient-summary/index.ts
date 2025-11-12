import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles, userId, tone = 'casual' } = await req.json();

    if (!articles || !Array.isArray(articles)) {
      throw new Error("No articles provided");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get active AI providers with fallback logic
    const { data: providers } = await supabase
      .from("ai_provider_config")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true });

    if (!providers || providers.length === 0) {
      throw new Error("No active AI providers configured");
    }

    console.log(`📰 Using AI provider: ${providers[0].provider_name}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const summaries = [];
    let totalTokens = 0;
    let totalCost = 0;

    // Adjust system prompt based on tone preference
    let systemPrompt = "You are a news summarizer.";
    if (tone === 'concise') {
      systemPrompt += " Be extremely brief and to the point. Max 30 words.";
    } else if (tone === 'analytical') {
      systemPrompt += " Provide analytical insights and context. Max 60 words.";
    } else {
      systemPrompt += " Be conversational and engaging. Max 50 words.";
    }

    for (const article of articles.slice(0, 5)) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: `Summarize: ${article.title}\n\n${article.content || article.description || ""}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          console.error(`Failed to summarize: ${article.title}`);
          continue;
        }

        const data = await response.json();
        const summary = data.choices[0]?.message?.content;
        const tokensUsed = data.usage?.total_tokens || 100;
        const cost = (tokensUsed / 1000) * providers[0].cost_per_1k_tokens;

        totalTokens += tokensUsed;
        totalCost += cost;

        summaries.push({
          ...article,
          ai_summary: summary || article.description,
          tone_adjusted: true
        });

        // Log API usage
        await supabase.from("api_usage_logs").insert({
          provider: providers[0].provider_name,
          endpoint: "ai-resilient-summary",
          tokens_used: tokensUsed,
          estimated_cost: cost,
          user_id: userId
        });

      } catch (error) {
        console.error(`Error summarizing: ${article.title}`, error);
        summaries.push({
          ...article,
          ai_summary: article.description,
          tone_adjusted: false
        });
      }
    }

    // Update cost tracking
    const { data: costSettings } = await supabase
      .from("cost_alert_settings")
      .select("*")
      .single();

    if (costSettings) {
      await supabase
        .from("cost_alert_settings")
        .update({
          current_month_cost: costSettings.current_month_cost + totalCost
        })
        .eq("id", costSettings.id);
    }

    console.log(`✅ Generated ${summaries.length} summaries | Tokens: ${totalTokens} | Cost: $${totalCost.toFixed(4)}`);

    return new Response(
      JSON.stringify({ 
        summaries, 
        metrics: { totalTokens, totalCost, provider: providers[0].provider_name }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});