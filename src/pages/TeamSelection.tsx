import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ArrowLeft, Search, X, Loader2 } from "lucide-react";

// Top football and basketball teams
const TEAMS = [
  // Premier League
  { name: "Manchester City", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t43.png" },
  { name: "Arsenal", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t3.png" },
  { name: "Liverpool", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t14.png" },
  { name: "Manchester United", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t1.png" },
  { name: "Chelsea", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t8.png" },
  { name: "Tottenham", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t6.png" },
  
  // La Liga
  { name: "Real Madrid", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg" },
  { name: "Barcelona", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg" },
  { name: "Atletico Madrid", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg" },
  { name: "Sevilla", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg" },
  
  // Serie A
  { name: "Inter Milan", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg" },
  { name: "AC Milan", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg" },
  { name: "Juventus", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Juventus_FC_-_pictogram_black_%28Italy%2C_2017%29.svg" },
  { name: "Napoli", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg" },
  { name: "Roma", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg" },
  
  // Bundesliga
  { name: "Bayern Munich", league: "Bundesliga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg" },
  { name: "Borussia Dortmund", league: "Bundesliga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg" },
  
  // Ligue 1
  { name: "Paris Saint-Germain", league: "Ligue 1", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg" },
  
  // Other European
  { name: "Ajax", league: "Eredivisie", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg" },
  { name: "Porto", league: "Primeira Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg" },
  { name: "Benfica", league: "Primeira Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg" },
  
  // NBA
  { name: "Los Angeles Lakers", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg" },
  { name: "Boston Celtics", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg" },
  { name: "Golden State Warriors", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg" },
  { name: "Chicago Bulls", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg" },
  { name: "Miami Heat", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg" },
  { name: "Brooklyn Nets", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg" },
  { name: "Milwaukee Bucks", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg" },
  { name: "Philadelphia 76ers", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg" },
  { name: "Phoenix Suns", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg" },
  { name: "Dallas Mavericks", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg" },
  { name: "New York Knicks", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg" },
  { name: "Toronto Raptors", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg" },
  { name: "Denver Nuggets", league: "NBA", sport: "basketball", logo: "https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg" },
];

const TeamSelection = () => {
  const [sportType, setSportType] = useState<'football' | 'basketball' | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [rivalTeams, setRivalTeams] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // Load existing teams on mount
  useEffect(() => {
    const loadExistingTeams = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get teams from user metadata (stored in users table)
        if (user.user_metadata?.favorite_teams || user.user_metadata?.rival_teams) {
          setFavoriteTeams(user.user_metadata.favorite_teams || []);
          setRivalTeams(user.user_metadata.rival_teams || []);
        }
      } catch (error) {
        console.error("Error loading existing teams:", error);
      }
    };

    loadExistingTeams();
  }, []);

  const filteredTeams = TEAMS.filter(team => {
    if (sportType && team.sport !== sportType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return team.name.toLowerCase().includes(query) || 
             team.league.toLowerCase().includes(query);
    }
    return true;
  });

  const toggleFavorite = (team: string) => {
    // Can't favorite a rival team
    if (rivalTeams.includes(team)) {
      toast.error("Can't favorite a rival team! Remove it from rivals first.");
      return;
    }
    
    setFavoriteTeams((prev) => {
      if (prev.includes(team)) {
        return prev.filter((t) => t !== team);
      } else {
        return [...prev, team];
      }
    });
  };

  const toggleRival = (team: string) => {
    // Can't rival a favorite team
    if (favoriteTeams.includes(team)) {
      toast.error("Can't rival a favorite team! Remove it from favorites first.");
      return;
    }
    
    setRivalTeams((prev) => {
      if (prev.includes(team)) {
        return prev.filter((t) => t !== team);
      } else {
        return [...prev, team];
      }
    });
  };

  const removeFavorite = (team: string) => {
    setFavoriteTeams((prev) => prev.filter((t) => t !== team));
  };

  const removeRival = (team: string) => {
    setRivalTeams((prev) => prev.filter((t) => t !== team));
  };

  const handleContinue = async () => {
    if (favoriteTeams.length === 0) {
      toast.error("Please select at least 1 favorite team");
      return;
    }

    setSaving(true);
    setLoading(true);
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error("Auth error:", authError);
        toast.error("Please sign in first");
        navigate("/auth");
        return;
      }

      console.log("💾 Saving teams to users table:", {
        favoriteTeams,
        rivalTeams,
        userId: user.id
      });

      // Update user metadata directly (stored in users table)
      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
        data: {
          favorite_teams: favoriteTeams,
          rival_teams: rivalTeams
        }
      });

      if (updateError) {
        console.error("Database error:", updateError);
        throw new Error(`Failed to save: ${updateError.message}`);
      }

      if (!updatedUser?.user) {
        throw new Error("Failed to get updated user data");
      }

      // Verify the save was successful
      const savedFavorites = updatedUser.user.user_metadata?.favorite_teams || [];
      const savedRivals = updatedUser.user.user_metadata?.rival_teams || [];
      
      console.log("✅ Teams saved successfully:", {
        favorites: savedFavorites,
        rivals: savedRivals
      });

      toast.success(`Team preferences saved! ${favoriteTeams.length} favorite(s), ${rivalTeams.length} rival(s) ⚽`);
      
      // Small delay to ensure toast is visible, then navigate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to Sports Hub after successful save
      navigate("/sports-hub");
    } catch (error) {
      console.error("Error saving teams:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";
      toast.error(`Error: ${errorMessage}`);
      // Don't navigate on error
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  // Sport selection screen
  if (!sportType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-4xl w-full space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
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
              onClick={async () => {
                // Check if onboarding is complete
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  // Check if user has completed onboarding (has interests/subniches)
                  const { data: interests } = await supabase
                    .from("user_subniches")
                    .select("id")
                    .eq("user_id", user.id)
                    .limit(1);
                  
                  if (interests && interests.length > 0) {
                    // Onboarding complete, go to feed
                    navigate("/feed");
                  } else {
                    // Onboarding incomplete, go back to onboarding
                    navigate("/onboarding");
                  }
                } else {
                  navigate("/onboarding");
                }
              }}
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
            disabled={saving}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sport Selection
          </Button>

          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground">
              Pick Your {sportType === 'football' ? 'Football' : 'Basketball'} Teams {sportType === 'football' ? '⚽' : '🏀'}
            </h1>
            <p className="text-xl text-foreground font-medium mt-4">
              Select multiple favorite and rival teams
            </p>
          </div>
        </div>

        {/* Summary Banner */}
        {(favoriteTeams.length > 0 || rivalTeams.length > 0) && (
          <Card className="p-4 bg-background/80 backdrop-blur">
            <div className="flex flex-col gap-4">
              {favoriteTeams.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-primary mb-2 block">❤️ Favorite Teams ({favoriteTeams.length}):</span>
                  <div className="flex flex-wrap gap-2">
                    {favoriteTeams.map((teamName) => {
                      const team = TEAMS.find(t => t.name === teamName);
                      return (
                        <div key={teamName} className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary rounded-md">
                          {team && <img src={team.logo} alt={teamName} className="w-4 h-4 object-contain" />}
                          <span className="text-xs font-medium">{teamName}</span>
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-destructive" 
                            onClick={() => removeFavorite(teamName)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {rivalTeams.length > 0 && (
                <div>
                  <span className="text-sm font-semibold text-destructive mb-2 block">😤 Rival Teams ({rivalTeams.length}):</span>
                  <div className="flex flex-wrap gap-2">
                    {rivalTeams.map((teamName) => {
                      const team = TEAMS.find(t => t.name === teamName);
                      return (
                        <div key={teamName} className="flex items-center gap-1 px-2 py-1 bg-destructive/10 border border-destructive rounded-md">
                          {team && <img src={team.logo} alt={teamName} className="w-4 h-4 object-contain" />}
                          <span className="text-xs font-medium">{teamName}</span>
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-destructive" 
                            onClick={() => removeRival(teamName)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search teams or leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-12 text-base"
            disabled={saving}
          />
          {searchQuery && (
            <X 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground cursor-pointer hover:text-foreground" 
              onClick={() => setSearchQuery("")}
            />
          )}
        </div>

        {/* Team Selection */}
        <div className="grid gap-6">
          {/* Favorites */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-primary">
              ❤️ Favorite Teams ({favoriteTeams.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Select multiple favorite teams</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredTeams.map((team) => {
                const isSelected = favoriteTeams.includes(team.name);
                const isRival = rivalTeams.includes(team.name);
                return (
                  <div
                    key={team.name}
                    className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary"
                        : isRival
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted border-border"
                    }`}
                    onClick={() => !isRival && toggleFavorite(team.name)}
                  >
                    <img 
                      src={team.logo} 
                      alt={`${team.name} logo`} 
                      className="w-10 h-10 object-contain flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{team.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {team.league}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-primary text-lg">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Rivals */}
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-destructive">
              😤 Rival Teams ({rivalTeams.length})
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Select multiple rival teams (optional)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredTeams.map((team) => {
                const isSelected = rivalTeams.includes(team.name);
                const isFavorite = favoriteTeams.includes(team.name);
                return (
                  <div
                    key={team.name}
                    className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-destructive/10 border-destructive shadow-md ring-2 ring-destructive"
                        : isFavorite
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted border-border"
                    }`}
                    onClick={() => !isFavorite && toggleRival(team.name)}
                  >
                    <img 
                      src={team.logo} 
                      alt={`${team.name} logo`} 
                      className="w-10 h-10 object-contain flex-shrink-0" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{team.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {team.league}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-destructive text-lg">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={loading || saving || favoriteTeams.length === 0}
            size="lg"
            className="text-lg font-bold min-w-[200px]"
          >
            {loading || saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Continue to Feed →"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeamSelection;
