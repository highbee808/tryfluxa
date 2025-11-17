import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { matchId } = await req.json();

    if (!matchId) {
      throw new Error("matchId is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch match details
    const { data: match, error: matchError } = await supabase
      .from("match_results")
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (matchError || !match) {
      throw new Error("Match not found");
    }

    // Fetch team stats for both teams
    const { data: homeEntity } = await supabase
      .from("fan_entities")
      .select("stats, achievements")
      .eq("name", match.team_home)
      .single();

    const { data: awayEntity } = await supabase
      .from("fan_entities")
      .select("stats, achievements")
      .eq("name", match.team_away)
      .single();

    // Use Lovable AI to generate prediction
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiPrompt = `You are Fluxa, a charismatic sports analyst. Analyze this upcoming match and provide a prediction:

**Match:** ${match.team_home} vs ${match.team_away}
**League:** ${match.league}
**Date:** ${match.match_date}

**Home Team (${match.team_home}) Stats:**
${JSON.stringify(homeEntity?.stats || {}, null, 2)}

**Away Team (${match.team_away}) Stats:**
${JSON.stringify(awayEntity?.stats || {}, null, 2)}

Provide:
1. A confident prediction (Home Win, Away Win, or Draw)
2. A confidence score (0-100%)
3. Your reasoning in 2-3 sentences with Fluxa's personality (sassy, knowledgeable, fun)
4. A predicted scoreline

Format as JSON:
{
  "prediction": "Home Win" | "Away Win" | "Draw",
  "confidence": 85,
  "reasoning": "...",
  "predicted_score": "2-1"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are Fluxa, a sassy AI sports analyst. Always respond with valid JSON only." },
          { role: "user", content: aiPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error("Failed to generate prediction");
    }

    const aiData = await aiResponse.json();
    const predictionText = aiData.choices[0].message.content;

    // Parse JSON from AI response
    let prediction;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = predictionText.match(/```json\n?([\s\S]*?)\n?```/) || 
                       predictionText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : predictionText;
      prediction = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", predictionText);
      throw new Error("Invalid AI response format");
    }

    // Store prediction in match metadata
    await supabase
      .from("match_results")
      .update({
        // Store in a JSONB field if available, or we can create a new table
        // For now, we'll return it directly
      })
      .eq("match_id", matchId);

    return new Response(
      JSON.stringify({
        success: true,
        match: {
          home_team: match.team_home,
          away_team: match.team_away,
          league: match.league,
          date: match.match_date,
        },
        prediction: {
          ...prediction,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in predict-match:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
