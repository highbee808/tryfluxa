import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/BottomNavigation";
import { toast } from "sonner";
import { Loader2, Volume2, Play, Pause, RefreshCw, Radio, Sparkles } from "lucide-react";
import { sendFluxaPushNotification } from "@/lib/notifications";

interface Match {
  id: string;
  league: string;
  team_home: string;
  team_away: string;
  score_home: number | null;
  score_away: number | null;
  status: string;
  match_date: string;
  match_id?: string;
}

interface Gist {
  id: string;
  topic: string;
  narration: string;
  audio_url: string;
  meta: {
    match_id?: string;
    event_type?: string;
    is_live_update?: boolean;
  };
}

const SportsHub = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTeams, setUserTeams] = useState<string[]>([]);
  const [matchGists, setMatchGists] = useState<Record<string, Gist>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});
  const [liveUpdates, setLiveUpdates] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [generatingGists, setGeneratingGists] = useState(false);
  const lastScoresRef = useRef<Record<string, string>>({});

  useEffect(() => {
    fetchUserTeams();
    fetchMatches();
    
    // Auto-refresh every 30 seconds if there are live matches
    const interval = setInterval(() => {
      const hasLiveMatches = matches.some(m => 
        m.status === 'InProgress' || m.status === 'Live' || m.status === 'Halftime'
      );
      if (hasLiveMatches) {
        fetchMatches(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [matches]);

  useEffect(() => {
    if (matches.length > 0) {
      fetchMatchGists();
    }
  }, [matches]);

  const fetchUserTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_teams")
      .select("favorite_teams")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching user teams:", error);
      return;
    }

    if (data && data.length > 0) {
      // Flatten all favorite_teams arrays into a single array
      const allTeams = data.flatMap(row => row.favorite_teams || []);
      setUserTeams(allTeams);
    }
  };

  const fetchMatches = async (silent = false) => {
    if (!silent) setLoading(true);
    if (silent) setRefreshing(true);
    
    const { data, error } = await supabase
      .from("match_results")
      .select("*")
      .order("match_date", { ascending: false })
      .limit(30);

    if (error) {
      if (!silent) toast.error("Failed to load matches");
      console.error(error);
    } else {
      // Check for score changes
      const newMatches = data || [];
      newMatches.forEach(match => {
        const matchKey = match.match_id || match.id;
        const currentScore = `${match.score_home}-${match.score_away}`;
        const lastScore = lastScoresRef.current[matchKey];
        
        if (lastScore && lastScore !== currentScore && silent) {
          setLiveUpdates(prev => ({ ...prev, [matchKey]: true }));
          toast.success("⚽ Score updated!", { duration: 3000 });
        }
        
        lastScoresRef.current[matchKey] = currentScore;
      });
      
      setMatches(newMatches);
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  const fetchMatchGists = async () => {
    const { data, error } = await supabase
      .from("gists")
      .select("*")
      .eq("topic_category", "Sports Banter")
      .eq("status", "published")
      .not("audio_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const gistMap: Record<string, Gist> = {};
      data.forEach((gist: any) => {
        if (gist.meta?.match_id) {
          // Prefer live updates
          if (!gistMap[gist.meta.match_id] || gist.meta.is_live_update) {
            gistMap[gist.meta.match_id] = gist;
          }
        }
      });
      setMatchGists(gistMap);
      
      // Play live update notifications if not on page
      data.forEach((gist: any) => {
        if (gist.meta?.is_live_update && !document.hasFocus()) {
          sendFluxaPushNotification("⚽ Live Update!", gist.narration);
        }
      });
    }
  };

  const playFluxaReaction = (matchId: string, audioUrl: string) => {
    // Stop currently playing audio
    if (playingAudio && audioElements[playingAudio]) {
      audioElements[playingAudio].pause();
      audioElements[playingAudio].currentTime = 0;
    }

    // If clicking the same audio, just stop it
    if (playingAudio === matchId) {
      setPlayingAudio(null);
      return;
    }

    // Create or reuse audio element
    let audio = audioElements[matchId];
    if (!audio) {
      audio = new Audio(audioUrl);
      audio.onended = () => setPlayingAudio(null);
      setAudioElements(prev => ({ ...prev, [matchId]: audio }));
    }

    audio.play();
    setPlayingAudio(matchId);
    
    // Clear live update indicator
    setLiveUpdates(prev => ({ ...prev, [matchId]: false }));
  };

  const handleGenerateGists = async () => {
    setGeneratingGists(true);
    try {
      const { error } = await supabase.functions.invoke('generate-sports-gist');
      
      if (error) {
        toast.error("Failed to generate Fluxa's commentary");
        console.error(error);
      } else {
        toast.success("✨ Fluxa is analyzing the matches...");
        // Wait a bit then refresh gists
        setTimeout(() => {
          fetchMatchGists();
        }, 3000);
      }
    } catch (err) {
      toast.error("Error generating commentary");
      console.error(err);
    } finally {
      setGeneratingGists(false);
    }
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
  
  const isLive = (status: string) => 
    status === 'InProgress' || status === 'Live' || status === 'Halftime';

  const todayMatches = matches.filter(m => {
    const matchDate = new Date(m.match_date);
    const today = new Date();
    return matchDate.toDateString() === today.toDateString();
  });

  const recentMatches = matches.filter(m => 
    m.status === 'Final' || m.status === 'FullTime'
  ).slice(0, 10);

  const upcomingMatches = matches.filter(m => {
    const matchDate = new Date(m.match_date);
    const today = new Date();
    return matchDate > today && m.status === 'Scheduled';
  }).slice(0, 5);

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
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-4xl font-bold mb-2">⚽ Sports Hub</h1>
            <p className="text-muted-foreground">Live scores & match updates</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchMatches(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleGenerateGists}
              disabled={generatingGists}
            >
              <Sparkles className={`w-4 h-4 mr-2 ${generatingGists ? 'animate-spin' : ''}`} />
              Generate Gists
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Today's Matches */}
        {todayMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
              Today's Matches
              {todayMatches.some(m => isLive(m.status)) && (
                <Badge variant="destructive" className="animate-pulse">
                  <Radio className="w-3 h-3 mr-1" />
                  LIVE
                </Badge>
              )}
            </h2>
            <div className="space-y-3">{renderMatches(todayMatches)}</div>
          </div>
        )}

        {/* Recent Results */}
        {recentMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-3">Recent Results</h2>
            <div className="space-y-3">{renderMatches(recentMatches)}</div>
          </div>
        )}

        {/* Upcoming Fixtures */}
        {upcomingMatches.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-3">Upcoming Fixtures</h2>
            <div className="space-y-3">{renderMatches(upcomingMatches)}</div>
          </div>
        )}

        {/* Empty State */}
        {matches.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No matches available</p>
            <Button onClick={() => fetchMatches()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </Card>
        )}
      </div>

      <BottomNavigation />
    </div>
  );

  function renderMatches(matchList: Match[]) {
    return matchList.map((match) => (
      <Card key={match.id} className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant={isLive(match.status) ? "destructive" : match.status === "Final" ? "secondary" : "default"}>
              {isLive(match.status) && <Radio className="w-3 h-3 mr-1 animate-pulse" />}
              {match.status === "Final" ? "FT" : match.status}
            </Badge>
            {liveUpdates[match.match_id || match.id] && (
              <Volume2 className="w-4 h-4 text-primary animate-pulse" />
            )}
          </div>
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

        {/* Fluxa Audio Reaction */}
        {matchGists[match.match_id || match.id] && matchGists[match.match_id || match.id].audio_url && (
          <div className="pt-3 border-t">
            <Button
              size="sm"
              variant="default"
              className="w-full gap-2 relative"
              onClick={() => playFluxaReaction(
                match.match_id || match.id, 
                matchGists[match.match_id || match.id].audio_url
              )}
            >
              {liveUpdates[match.match_id || match.id] && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full animate-pulse" />
              )}
              {playingAudio === (match.match_id || match.id) ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop Fluxa's Take
                </>
              ) : (
                <>
                  <Volume2 className={`w-4 h-4 ${liveUpdates[match.match_id || match.id] ? 'animate-pulse' : ''}`} />
                  {matchGists[match.match_id || match.id].meta?.is_live_update ? '🔴 Live Update' : '🔊 Fluxa\'s Take'}
                </>
              )}
            </Button>
            {matchGists[match.match_id || match.id].narration && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                "{matchGists[match.match_id || match.id].narration}"
              </p>
            )}
          </div>
        )}

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
    ));
  }
};

export default SportsHub;
