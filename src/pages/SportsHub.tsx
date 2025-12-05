import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "@/components/BottomNavigation";
import { ShareDialog } from "@/components/ShareDialog";
import { toast } from "sonner";
import { Loader2, RefreshCw, Trophy, Clock, Calendar } from "lucide-react";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import { fetchRecentGists, type DbGist } from "@/lib/feedData";

// Import TEAMS array for logo lookup and name normalization
const TEAMS = [
  { name: "Manchester City", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t43.png" },
  { name: "Arsenal", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t3.png" },
  { name: "Liverpool", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t14.png" },
  { name: "Manchester United", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t1.png" },
  { name: "Chelsea", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t8.png" },
  { name: "Tottenham", league: "Premier League", sport: "football", logo: "https://resources.premierleague.com/premierleague/badges/50/t6.png" },
  { name: "Real Madrid", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg" },
  { name: "Barcelona", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg" },
  { name: "Atletico Madrid", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg" },
  { name: "Sevilla", league: "La Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg" },
  { name: "Inter Milan", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg" },
  { name: "AC Milan", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg" },
  { name: "Juventus", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Juventus_FC_-_pictogram_black_%28Italy%2C_2017%29.svg" },
  { name: "Napoli", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg" },
  { name: "Roma", league: "Serie A", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg" },
  { name: "Bayern Munich", league: "Bundesliga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg" },
  { name: "Borussia Dortmund", league: "Bundesliga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg" },
  { name: "Paris Saint-Germain", league: "Ligue 1", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg" },
  { name: "Ajax", league: "Eredivisie", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg" },
  { name: "Porto", league: "Primeira Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/f/f1/FC_Porto.svg" },
  { name: "Benfica", league: "Primeira Liga", sport: "football", logo: "https://upload.wikimedia.org/wikipedia/en/a/a2/SL_Benfica_logo.svg" },
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

// Helper function to normalize team names (case-insensitive match)
const normalizeTeamName = (teamName: string): string => {
  const normalized = teamName.trim();
  const matched = TEAMS.find(
    team => team.name.toLowerCase() === normalized.toLowerCase()
  );
  return matched ? matched.name : normalized;
};

// Helper function to get team logo
const getTeamLogo = (teamName: string): string | undefined => {
  const matched = TEAMS.find(
    team => team.name.toLowerCase() === teamName.toLowerCase()
  );
  return matched?.logo;
};

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

interface TeamData {
  name: string;
  logo?: string;
  league?: string;
  latestMatch?: Match;
  nextMatch?: Match;
  news?: any[];
}

interface Gist {
  id: string;
  source: "gist" | "news";
  headline: string;
  summary?: string;
  context: string;
  audio_url?: string | null;
  image_url: string | null;
  topic: string;
  topic_category: string | null;
  published_at?: string;
  url?: string;
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    plays: number;
  };
}

const SportsHub = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [favoriteTeams, setFavoriteTeams] = useState<string[]>([]);
  const [rivalTeams, setRivalTeams] = useState<string[]>([]);
  const [favoriteTeamsData, setFavoriteTeamsData] = useState<Record<string, TeamData>>({});
  const [rivalTeamsData, setRivalTeamsData] = useState<Record<string, TeamData>>({});
  const [sportsFeed, setSportsFeed] = useState<Gist[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGist, setSelectedGist] = useState<Gist | null>(null);

  // Initial load - fetch in parallel for better performance
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserTeams(),
        fetchMatches(),
      ]);
      // Fetch feed after teams are loaded (needs team names)
      await fetchSportsFeed();
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    // Fetch data for all favorite teams
    favoriteTeams.forEach(teamName => {
      if (!favoriteTeamsData[teamName]) {
        fetchTeamData(teamName, (data) => {
          setFavoriteTeamsData(prev => ({ ...prev, [teamName]: data }));
        });
      }
    });

    // Fetch data for all rival teams
    rivalTeams.forEach(teamName => {
      if (!rivalTeamsData[teamName]) {
        fetchTeamData(teamName, (data) => {
          setRivalTeamsData(prev => ({ ...prev, [teamName]: data }));
        });
      }
    });
  }, [favoriteTeams, rivalTeams]);

  const fetchUserTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get teams from user metadata (stored in users table)
    if (user.user_metadata?.favorite_teams || user.user_metadata?.rival_teams) {
      // Normalize and deduplicate favorite teams
      const rawFavorites = (user.user_metadata.favorite_teams || []) as string[];
      const normalizedFavorites = rawFavorites.map(normalizeTeamName);
      const uniqueFavorites = Array.from(
        new Map(normalizedFavorites.map(name => [name.toLowerCase(), name])).values()
      ) as string[];
      
      // Normalize and deduplicate rival teams
      const rawRivals = (user.user_metadata.rival_teams || []) as string[];
      const normalizedRivals = rawRivals.map(normalizeTeamName);
      const uniqueRivals = Array.from(
        new Map(normalizedRivals.map(name => [name.toLowerCase(), name])).values()
      ) as string[];
      
      setFavoriteTeams(uniqueFavorites);
      setRivalTeams(uniqueRivals);
      
      // If duplicates were found, update the user metadata with normalized names
      if (rawFavorites.length !== uniqueFavorites.length || rawRivals.length !== uniqueRivals.length) {
        await supabase.auth.updateUser({
          data: {
            favorite_teams: uniqueFavorites,
            rival_teams: uniqueRivals
          }
        });
      }
    }
  };

  const fetchTeamData = async (teamName: string, setter: (data: TeamData) => void) => {
    // Fetch team entity
    const { data: entity } = await supabase
      .from("fan_entities")
      .select("*")
      .eq("name", teamName)
      .eq("category", "sports")
      .single();

    if (entity) {
      // Safely extract league from stats
      let league: string | undefined;
      if (entity.stats && typeof entity.stats === 'object' && 'league' in entity.stats) {
        const statsLeague = entity.stats.league;
        if (typeof statsLeague === 'string') {
          league = statsLeague;
        }
      }
      
      // Safely extract matches
      const lastMatch = entity.last_match && typeof entity.last_match === 'object' && !Array.isArray(entity.last_match)
        ? entity.last_match as unknown as Match 
        : undefined;
      const nextMatch = entity.next_match && typeof entity.next_match === 'object' && !Array.isArray(entity.next_match)
        ? entity.next_match as unknown as Match
        : undefined;
      
      // Safely extract news feed
      const newsFeed = Array.isArray(entity.news_feed) ? entity.news_feed : [];
      
      const teamData: TeamData = {
        name: entity.name,
        logo: entity.logo_url || undefined,
        league: league,
        latestMatch: lastMatch,
        nextMatch: nextMatch,
        news: newsFeed,
      };
      setter(teamData);
    } else {
      // Fallback: create basic team data
      setter({
        name: teamName,
        latestMatch: undefined,
        nextMatch: undefined,
        news: [],
      });
    }
  };

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from("match_results")
      .select("*")
      .order("match_date", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching matches:", error);
    } else {
      setAllMatches(data || []);
      
      // Update team data with latest matches for all teams
      const allTeamNames = [...favoriteTeams, ...rivalTeams];
      allTeamNames.forEach(teamName => {
        const teamMatches = (data || []).filter(
          m => m.team_home === teamName || m.team_away === teamName
        );
        if (teamMatches.length > 0) {
          const latestMatch = teamMatches.find(m => m.status === 'Match Finished' || m.status === 'Final') || teamMatches[0];
          const nextMatch = teamMatches.find(m => m.status === 'Scheduled') || undefined;
          
          if (favoriteTeams.includes(teamName)) {
            setFavoriteTeamsData(prev => ({
              ...prev,
              [teamName]: {
                ...prev[teamName],
                latestMatch,
                nextMatch,
              }
            }));
          } else if (rivalTeams.includes(teamName)) {
            setRivalTeamsData(prev => ({
              ...prev,
              [teamName]: {
                ...prev[teamName],
                latestMatch,
                nextMatch,
              }
            }));
          }
        }
      });
    }
  };

  const fetchSportsFeed = useCallback(async () => {
    if (refreshing) setRefreshing(true);
    try {
      const allTeamNames = [...favoriteTeams, ...rivalTeams];
      const allNews: any[] = [];
      const seenHeadlines = new Set<string>();

      // Fetch news for all selected teams from fan_entities (parallel fetch)
      const fetchPromises: Promise<any>[] = [];
      
      if (allTeamNames.length > 0) {
        fetchPromises.push(
          (async () => {
            const { data: entities } = await supabase
              .from("fan_entities")
              .select("name, news_feed")
              .in("name", allTeamNames)
              .eq("category", "sports");
            
            const newsItems: any[] = [];
            if (entities) {
              entities.forEach(entity => {
                if (entity.news_feed && Array.isArray(entity.news_feed)) {
                  entity.news_feed.forEach((news: any) => {
                    const headline = news.title || news.headline || '';
                    const headlineKey = headline.toLowerCase().trim();
                    if (headlineKey && !seenHeadlines.has(headlineKey)) {
                      seenHeadlines.add(headlineKey);
                      newsItems.push({
                        id: `news-${entity.name}-${headlineKey}`,
                        source: "news",
                        headline: news.title || news.headline || 'Sports News',
                        summary: news.description || news.summary || news.content?.slice(0, 150) || '',
                        context: news.description || news.summary || news.content || '',
                        audio_url: null,
                        image_url: news.image || news.imageUrl || null,
                        topic: "Sports",
                        topic_category: entity.name,
                        published_at: news.published || news.publishedAt || news.time,
                        url: news.url,
                        analytics: {
                          views: 0,
                          likes: 0,
                          comments: 0,
                          shares: 0,
                          plays: 0,
                        },
                      });
                    }
                  });
                }
              });
            }
            return newsItems;
          })()
        );
      }

      // Fetch sports gists in parallel
      fetchPromises.push(fetchRecentGists(20).then(dbGists => {
        const allTeamNamesLower = allTeamNames.map(t => t.toLowerCase());
        return dbGists
          .filter(g => {
            const isSports = g.topic?.toLowerCase().includes('sport') || 
                            g.topic_category?.toLowerCase().includes('sport') ||
                            g.topic?.toLowerCase() === 'sports';
            
            if (allTeamNames.length > 0) {
              const headline = g.headline?.toLowerCase() || '';
              const context = g.context?.toLowerCase() || '';
              const matchesTeam = allTeamNamesLower.some(team => 
                headline.includes(team) || context.includes(team)
              );
              return isSports || matchesTeam;
            }
            
            return isSports;
          })
          .map(mapDbGistToGist);
      }));

      // Execute all fetches in parallel
      const results = await Promise.all(fetchPromises);
      const newsResults = results[0] || [];
      const sportsGists = results[1] || [];

      // Combine and deduplicate
      const allContent = [...newsResults, ...sportsGists];
      
      // Memoized deduplication
      const uniqueContent = allContent.filter((item, index, self) => {
        const headline = item.headline?.toLowerCase().trim() || '';
        return index === self.findIndex((i) => (i.headline?.toLowerCase().trim() || '') === headline);
      });

      // Sort by date (newest first)
      const sortedContent = [...uniqueContent].sort((a, b) => {
        const aTime = a.published_at ? new Date(a.published_at as string).getTime() : 0;
        const bTime = b.published_at ? new Date(b.published_at as string).getTime() : 0;
        return bTime - aTime;
      });
      
      setSportsFeed(sortedContent);
    } catch (error) {
      console.error("Error fetching sports feed:", error);
      toast.error("Failed to load sports feed");
    } finally {
      if (refreshing) setRefreshing(false);
    }
  }, [favoriteTeams, rivalTeams, refreshing]);

  const mapDbGistToGist = (gist: DbGist): Gist => ({
    id: gist.id,
    source: "gist",
    headline: gist.headline,
    summary: (gist.meta as any)?.summary || gist.context?.slice(0, 150) + (gist.context && gist.context.length > 150 ? "..." : ""),
    context: gist.context,
    audio_url: gist.audio_url || null,
    image_url: gist.image_url || null,
    topic: gist.topic || "Sports",
    topic_category: gist.topic_category || null,
    published_at: gist.published_at,
    url: undefined,
    analytics: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      plays: 0,
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMatches(), fetchSportsFeed()]);
    setRefreshing(false);
    toast.success("Sports feed refreshed!");
  }, [fetchMatches, fetchSportsFeed]);

  // Memoize expensive computations
  const memoizedSportsFeed = useMemo(() => {
    return sportsFeed;
  }, [sportsFeed]);

  const formatTimeUntil = (dateString?: string) => {
    if (!dateString) return "TBD";
    const matchDate = new Date(dateString);
    const now = new Date();
    const diff = matchDate.getTime() - now.getTime();
    
    if (diff < 0) return "Past";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const isLive = (status: string) => 
    status === 'InProgress' || status === 'Live' || status === 'Halftime' || status === '2H' || status === '1H';

  const navigateToTeam = (teamName: string) => {
    const teamId = teamName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/sports/team/${teamId}`);
  };

  // Handlers for card interactions (matching Feed.tsx behavior)
  const handleCardClick = useCallback((gist: Gist) => {
    navigate(`/post/${gist.source}/${gist.id}?origin=sports`);
  }, [navigate]);

  const handleCommentClick = useCallback((gist: Gist) => {
    navigate(`/post/${gist.source}/${gist.id}?origin=sports`);
  }, [navigate]);

  const handleShare = useCallback((gist: Gist) => {
    setSelectedGist(gist);
    setShareDialogOpen(true);
  }, []);

  const handlePlay = useCallback((id: string, audioUrl: string | null | undefined, url?: string) => {
    // Play audio if available, otherwise navigate to URL
    if (audioUrl) {
      // Audio playback logic can be added here if needed
      console.log("Playing audio:", audioUrl);
    } else if (url) {
      window.open(url, '_blank');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 pb-32 md:pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 p-4 md:p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">⚽ Sports</h1>
            <p className="text-sm md:text-base text-muted-foreground">Your personalized sports hub</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Favorite Teams Section - Compact Horizontal Scroll */}
        {favoriteTeams.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
              ❤️ Favorite Teams ({favoriteTeams.length})
            </h2>
            <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide -mx-4 px-4">
              {favoriteTeams.map((teamName) => {
                const teamLogo = getTeamLogo(teamName) || favoriteTeamsData[teamName]?.logo;
                return (
                  teamLogo ? (
                    <img 
                      key={teamName}
                      src={teamLogo} 
                      alt={teamName} 
                      className="w-12 h-12 object-contain flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigateToTeam(teamName)}
                    />
                  ) : null
                );
              })}
            </div>
          </div>
        )}

        {/* Rival Teams Section - Compact Horizontal Scroll */}
        {rivalTeams.length > 0 && (
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-3 flex items-center gap-2">
              😤 Rival Teams ({rivalTeams.length})
            </h2>
            <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide -mx-4 px-4">
              {rivalTeams.map((teamName) => {
                const teamLogo = getTeamLogo(teamName) || rivalTeamsData[teamName]?.logo;
                return (
                  teamLogo ? (
                    <img 
                      key={teamName}
                      src={teamLogo} 
                      alt={teamName} 
                      className="w-12 h-12 object-contain flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => navigateToTeam(teamName)}
                    />
                  ) : null
                );
              })}
            </div>
          </div>
        )}

        {/* Setup Prompt */}
        {favoriteTeams.length === 0 && rivalTeams.length === 0 && (
          <Card className="p-6 text-center border-dashed">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2">Set Up Your Teams</h3>
            <p className="text-muted-foreground mb-4">
              Select your favorite and rival teams to get personalized updates
            </p>
            <Button onClick={() => navigate("/team-selection")}>
              Choose Teams
            </Button>
          </Card>
        )}

        {/* General Sports Feed */}
        {memoizedSportsFeed.length > 0 && (
          <div className="space-y-4">
            {memoizedSportsFeed.map((item) => (
              <FeedCardWithSocial
                key={item.id}
                id={item.id}
                headline={item.headline}
                context={item.context}
                imageUrl={item.image_url || undefined}
                imageUrls={{
                  primary: item.image_url || null,
                  source: null,
                  ai: null,
                }}
                category={item.topic_category || item.topic}
                timeAgo={item.published_at ? new Date(item.published_at).toLocaleDateString() : undefined}
                views={item.analytics?.views}
                plays={item.analytics?.plays}
                shares={item.analytics?.shares}
                comments={item.analytics?.comments}
                isPlaying={false}
                onPlay={() => handlePlay(item.id, item.audio_url, item.url)}
                onComment={() => handleCommentClick(item)}
                onShare={() => handleShare(item)}
                onCardClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />

      {/* Share Dialog */}
      {selectedGist && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          gist={{
            id: selectedGist.id,
            headline: selectedGist.headline,
            context: selectedGist.context,
            image_url: selectedGist.image_url || null,
          }}
        />
      )}
    </div>
  );
};

export default SportsHub;
