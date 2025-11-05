import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ArrowLeft } from "lucide-react";

// Top football and basketball teams
const TEAMS = [
  // Premier League
  { name: "Manchester City", league: "Premier League", sport: "football" },
  { name: "Arsenal", league: "Premier League", sport: "football" },
  { name: "Liverpool", league: "Premier League", sport: "football" },
  { name: "Manchester United", league: "Premier League", sport: "football" },
  { name: "Chelsea", league: "Premier League", sport: "football" },
  { name: "Tottenham", league: "Premier League", sport: "football" },
  
  // La Liga
  { name: "Real Madrid", league: "La Liga", sport: "football" },
  { name: "Barcelona", league: "La Liga", sport: "football" },
  { name: "Atletico Madrid", league: "La Liga", sport: "football" },
  { name: "Sevilla", league: "La Liga", sport: "football" },
  
  // Serie A
  { name: "Inter Milan", league: "Serie A", sport: "football" },
  { name: "AC Milan", league: "Serie A", sport: "football" },
  { name: "Juventus", league: "Serie A", sport: "football" },
  { name: "Napoli", league: "Serie A", sport: "football" },
  { name: "Roma", league: "Serie A", sport: "football" },
  
  // Bundesliga
  { name: "Bayern Munich", league: "Bundesliga", sport: "football" },
  { name: "Borussia Dortmund", league: "Bundesliga", sport: "football" },
  
  // Ligue 1
  { name: "Paris Saint-Germain", league: "Ligue 1", sport: "football" },
  
  // Other European
  { name: "Ajax", league: "Eredivisie", sport: "football" },
  { name: "Porto", league: "Primeira Liga", sport: "football" },
  { name: "Benfica", league: "Primeira Liga", sport: "football" },
  
  // NBA
  { name: "Los Angeles Lakers", league: "NBA", sport: "basketball" },
  { name: "Boston Celtics", league: "NBA", sport: "basketball" },
  { name: "Golden State Warriors", league: "NBA", sport: "basketball" },
  { name: "Chicago Bulls", league: "NBA", sport: "basketball" },
  { name: "Miami Heat", league: "NBA", sport: "basketball" },
  { name: "Brooklyn Nets", league: "NBA", sport: "basketball" },
  { name: "Milwaukee Bucks", league: "NBA", sport: "basketball" },
  { name: "Philadelphia 76ers", league: "NBA", sport: "basketball" },
  { name: "Phoenix Suns", league: "NBA", sport: "basketball" },
  { name: "Dallas Mavericks", league: "NBA", sport: "basketball" },
  { name: "New York Knicks", league: "NBA", sport: "basketball" },
  { name: "Toronto Raptors", league: "NBA", sport: "basketball" },
  { name: "Denver Nuggets", league: "NBA", sport: "basketball" },
];

const TeamSelection = () => {
  const [sportType, setSportType] = useState<'football' | 'basketball' | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [rivalTeams, setRivalTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const filteredTeams = sportType ? TEAMS.filter(team => team.sport === sportType) : TEAMS;

  const toggleFavorite = (team: string) => {
    if (rivalTeams.includes(team)) {
      toast.error("Can't favorite a rival team!");
      return;
    }
    setFavoriteTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const toggleRival = (team: string) => {
    if (favoriteTeams.includes(team)) {
      toast.error("Can't rival a favorite team!");
      return;
    }
    setRivalTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  };

  const handleContinue = async () => {
    if (favoriteTeams.length === 0) {
      toast.error("Please select at least 1 favorite team");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      // Save team preferences
      const { error } = await supabase.from("user_teams").upsert({
        user_id: user.id,
        favorite_teams: favoriteTeams,
        rival_teams: rivalTeams,
      });

      if (error) throw error;

      toast.success("Team preferences saved! ⚽");
      navigate("/feed");
    } catch (error) {
      console.error("Error saving teams:", error);
      toast.error("Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  // Sport selection screen
  if (!sportType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-4xl w-full space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Choose Your Sport
            </h1>
            <p className="text-xl text-foreground font-medium">
              Which sport do you want to follow?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="p-12 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 hover:border-primary group"
              onClick={() => setSportType('football')}
            >
              <div className="text-center space-y-4">
                <div className="text-7xl group-hover:scale-110 transition-transform">⚽</div>
                <h2 className="text-3xl font-bold">Football</h2>
                <p className="text-muted-foreground">Follow your favorite football clubs from around the world</p>
              </div>
            </Card>

            <Card 
              className="p-12 cursor-pointer hover:shadow-2xl transition-all hover:scale-105 border-2 hover:border-primary group"
              onClick={() => setSportType('basketball')}
            >
              <div className="text-center space-y-4">
                <div className="text-7xl group-hover:scale-110 transition-transform">🏀</div>
                <h2 className="text-3xl font-bold">Basketball</h2>
                <p className="text-muted-foreground">Follow your favorite NBA teams and players</p>
              </div>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/onboarding")}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Team selection screen
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <div className="max-w-4xl w-full space-y-8 animate-fade-in">
        {/* Header */}
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => setSportType(null)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sport Selection
          </Button>

          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Pick Your {sportType === 'football' ? 'Football' : 'Basketball'} Teams {sportType === 'football' ? '⚽' : '🏀'}
            </h1>
            <p className="text-xl text-foreground font-medium mt-4">
              Choose your favorite and rival teams
            </p>
          </div>
        </div>

        {/* Team Selection */}
        <div className="grid gap-6">
          {/* Favorites */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-primary">
              ❤️ Favorite Teams ({favoriteTeams.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.name}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    favoriteTeams.includes(team.name)
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleFavorite(team.name)}
                >
                  <Checkbox
                    checked={favoriteTeams.includes(team.name)}
                    onCheckedChange={() => toggleFavorite(team.name)}
                  />
                  <div>
                    <div className="font-medium text-sm">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {team.league}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Rivals */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-destructive">
              😤 Rival Teams ({rivalTeams.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.name}
                  className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    rivalTeams.includes(team.name)
                      ? "bg-destructive/10 border-destructive"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleRival(team.name)}
                >
                  <Checkbox
                    checked={rivalTeams.includes(team.name)}
                    onCheckedChange={() => toggleRival(team.name)}
                  />
                  <div>
                    <div className="font-medium text-sm">{team.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {team.league}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={loading || favoriteTeams.length === 0}
            size="lg"
            className="text-lg font-bold"
          >
            {loading ? "Saving..." : "Continue to Feed →"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamSelection;
