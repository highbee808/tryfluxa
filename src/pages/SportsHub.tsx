import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/BottomNavigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Match {
  id: string;
  league: string;
  team_home: string;
  team_away: string;
  score_home: number | null;
  score_away: number | null;
  status: string;
  match_date: string;
}

const SportsHub = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<string[]>([]);

  useEffect(() => {
    fetchUserTeams();
    fetchMatches();
  }, []);

  const fetchUserTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_teams")
      .select("favorite_teams")
      .eq("user_id", user.id)
      .single();

    if (data?.favorite_teams) {
      setUserTeams(data.favorite_teams);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("match_results")
      .select("*")
      .order("match_date", { ascending: false })
      .limit(20);

    if (error) {
      toast.error("Failed to load matches");
      console.error(error);
    } else {
      setMatches(data || []);
    }
    setLoading(false);
  };

  const handleReaction = async (matchId: string, team: string, reaction: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to react");
      return;
    }

    const { error } = await supabase
      .from("sports_fan_reactions")
      .insert({
        user_id: user.id,
        team,
        reaction,
        match_id: matchId,
      });

    if (error) {
      toast.error("Failed to save reaction");
    } else {
      toast.success(reaction === "cheer" ? "🎉 Cheered!" : "😏 Banter sent!");
    }
  };

  const isUserTeam = (team: string) => userTeams.includes(team);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-6">
        <h1 className="text-4xl font-bold text-center mb-2">⚽ Sports Hub</h1>
        <p className="text-center text-muted-foreground">Live scores & match updates</p>
      </div>

      {/* Matches Feed */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {matches.map((match) => (
          <Card key={match.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Badge variant={match.status === "Final" ? "secondary" : "default"}>
                {match.status === "Final" ? "FT" : match.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{match.league}</span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className={`flex-1 text-center ${isUserTeam(match.team_home) ? "font-bold text-primary" : ""}`}>
                <p className="text-lg">{match.team_home}</p>
              </div>
              
              <div className="px-6">
                <div className="text-2xl font-bold">
                  {match.score_home ?? "-"} : {match.score_away ?? "-"}
                </div>
              </div>

              <div className={`flex-1 text-center ${isUserTeam(match.team_away) ? "font-bold text-primary" : ""}`}>
                <p className="text-lg">{match.team_away}</p>
              </div>
            </div>

            {match.status === "Final" && (isUserTeam(match.team_home) || isUserTeam(match.team_away)) && (
              <div className="flex gap-2 justify-center pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReaction(match.id, isUserTeam(match.team_home) ? match.team_home : match.team_away, "cheer")}
                >
                  🎉 Cheer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReaction(match.id, isUserTeam(match.team_home) ? match.team_home : match.team_away, "banter")}
                >
                  😏 Banter
                </Button>
              </div>
            )}
          </Card>
        ))}

        {matches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No matches available</p>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default SportsHub;
