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
    const { matchId, timeRange = "24h" } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now);
    if (timeRange === "24h") {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeRange === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    }

    let query = supabase
      .from("sports_fan_reactions")
      .select("*, match_results(team_home, team_away, league)")
      .gte("created_at", startDate.toISOString());

    if (matchId) {
      query = query.eq("match_id", matchId);
    }

    const { data: reactions, error } = await query;

    if (error) throw error;

    // Analyze sentiment by team
    const sentimentByTeam: { [team: string]: any } = {};

    reactions?.forEach((reaction: any) => {
      const team = reaction.team;
      if (!sentimentByTeam[team]) {
        sentimentByTeam[team] = {
          team,
          total_reactions: 0,
          cheer_count: 0,
          banter_count: 0,
          passion_score: 0,
        };
      }

      sentimentByTeam[team].total_reactions++;
      
      if (reaction.reaction === "cheer") {
        sentimentByTeam[team].cheer_count++;
      } else if (reaction.reaction === "banter") {
        sentimentByTeam[team].banter_count++;
      }
    });

    // Calculate passion scores (total engagement)
    Object.values(sentimentByTeam).forEach((team: any) => {
      team.passion_score = team.total_reactions;
      team.cheer_percentage = team.total_reactions > 0 
        ? Math.round((team.cheer_count / team.total_reactions) * 100)
        : 0;
      team.banter_percentage = team.total_reactions > 0
        ? Math.round((team.banter_count / team.total_reactions) * 100)
        : 0;
    });

    // Sort by passion score
    const rankedTeams = Object.values(sentimentByTeam)
      .sort((a: any, b: any) => b.passion_score - a.passion_score);

    // Get top 10 most passionate fanbases
    const topFanbases = rankedTeams.slice(0, 10);

    // Analyze match-specific sentiment if matchId provided
    let matchAnalysis = null;
    if (matchId && reactions && reactions.length > 0) {
      const match = reactions[0].match_results;
      const homeReactions = reactions.filter((r: any) => r.team === match?.team_home);
      const awayReactions = reactions.filter((r: any) => r.team === match?.team_away);

      matchAnalysis = {
        home_team: match?.team_home,
        away_team: match?.team_away,
        home_reactions: homeReactions.length,
        away_reactions: awayReactions.length,
        home_cheers: homeReactions.filter((r: any) => r.reaction === "cheer").length,
        away_cheers: awayReactions.filter((r: any) => r.reaction === "cheer").length,
        total_engagement: reactions.length,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        time_range: timeRange,
        total_reactions: reactions?.length || 0,
        top_fanbases: topFanbases,
        match_analysis: matchAnalysis,
        sentiment_breakdown: sentimentByTeam,
        generated_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fan-sentiment-tracker:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
