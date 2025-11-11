import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles } = await req.json();

    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      throw new Error("No articles provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`📰 Generating AI summaries for ${articles.length} articles...`);

    const summaries = [];

    for (const article of articles.slice(0, 5)) {
      // Limit to 5 articles
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
                content: "You are a news summarizer. Create brief, engaging summaries (max 50 words) that capture the key points of news articles. Be concise and informative.",
              },
              {
                role: "user",
                content: `Summarize this news article:\n\nTitle: ${article.title}\n\nContent: ${article.content || article.description || ""}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          console.error(`Failed to summarize article: ${article.title}`);
          continue;
        }

        const data = await response.json();
        const summary = data.choices[0]?.message?.content;

        summaries.push({
          ...article,
          ai_summary: summary || article.description,
        });
      } catch (error) {
        console.error(`Error summarizing article: ${article.title}`, error);
        summaries.push({
          ...article,
          ai_summary: article.description,
        });
      }
    }

    console.log(`✅ Generated ${summaries.length} AI summaries`);

    return new Response(
      JSON.stringify({ summaries }),
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
