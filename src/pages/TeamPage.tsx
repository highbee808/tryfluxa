import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Heart, Trophy, Calendar, Users } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { NewsCard } from "@/components/NewsCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// TEAMS array for logo lookup
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

// Helper function to get team logo
const getTeamLogo = (teamName: string): string | undefined => {
  const matched = TEAMS.find(
    team => team.name.toLowerCase() === teamName.toLowerCase()
  );
  return matched?.logo;
};

interface TeamData {
  id?: string;
  name: string;
  league?: string;
  logo?: string;
  bio?: string;
  achievements?: Array<{ name: string; count: number }>;
  primary_color?: string;
  secondary_color?: string;
  current_match?: any;
  next_match?: any;
  last_match?: any;
  news_feed?: any[];
  stats?: any;
}

interface Match {
  id: string;
  match_id?: string;
  league: string;
  team_home: string;
  team_away: string;
  score_home: number | null;
  score_away: number | null;
  status: string;
  match_date: string;
}

// Team color mapping
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  'barcelona': { primary: '#004D98', secondary: '#A50044' },
  'real madrid': { primary: '#FFFFFF', secondary: '#FFD700' },
  'manchester united': { primary: '#DA020E', secondary: '#000000' },
  'manchester city': { primary: '#6CABDD', secondary: '#FFFFFF' },
  'chelsea': { primary: '#034694', secondary: '#FFFFFF' },
  'liverpool': { primary: '#C8102E', secondary: '#FFFFFF' },
  'bayern munich': { primary: '#DC052D', secondary: '#FFFFFF' },
  'psg': { primary: '#004170', secondary: '#ED1C24' },
  'arsenal': { primary: '#EF0107', secondary: '#FFFFFF' },
  'tottenham': { primary: '#132257', secondary: '#FFFFFF' },
  'juventus': { primary: '#000000', secondary: '#FFFFFF' },
  'ac milan': { primary: '#FB090B', secondary: '#000000' },
  'inter milan': { primary: '#0068A8', secondary: '#000000' },
  'atletico madrid': { primary: '#CE3524', secondary: '#FFFFFF' },
  'borussia dortmund': { primary: '#FDE100', secondary: '#000000' },
  // NBA Teams
  'los angeles lakers': { primary: '#552583', secondary: '#FDB927' },
  'boston celtics': { primary: '#007A33', secondary: '#BA9653' },
  'golden state warriors': { primary: '#1D428A', secondary: '#FFC72C' },
  'chicago bulls': { primary: '#CE1141', secondary: '#000000' },
  'miami heat': { primary: '#98002E', secondary: '#F9A01B' },
  'brooklyn nets': { primary: '#000000', secondary: '#FFFFFF' },
  'milwaukee bucks': { primary: '#00471B', secondary: '#EEE1C6' },
  'philadelphia 76ers': { primary: '#006BB6', secondary: '#ED174C' },
  'phoenix suns': { primary: '#1D1160', secondary: '#E56020' },
  'dallas mavericks': { primary: '#00538C', secondary: '#002B5E' },
  'new york knicks': { primary: '#006BB6', secondary: '#F58426' },
  'toronto raptors': { primary: '#CE1141', secondary: '#000000' },
  'denver nuggets': { primary: '#0E2240', secondary: '#FEC524' },
};

// Static trophy data for teams (used when API doesn't provide)
const TEAM_TROPHIES: Record<string, Array<{ name: string; count: number }>> = {
  'real-madrid': [
    { name: 'UEFA Champions League', count: 14 },
    { name: 'La Liga', count: 35 },
    { name: 'Copa del Rey', count: 20 },
    { name: 'Club World Cup', count: 5 },
  ],
  'barcelona': [
    { name: 'UEFA Champions League', count: 5 },
    { name: 'La Liga', count: 27 },
    { name: 'Copa del Rey', count: 31 },
    { name: 'Club World Cup', count: 3 },
  ],
  'manchester-united': [
    { name: 'UEFA Champions League', count: 3 },
    { name: 'Premier League', count: 20 },
    { name: 'FA Cup', count: 13 },
    { name: 'Europa League', count: 1 },
  ],
  'manchester-city': [
    { name: 'UEFA Champions League', count: 1 },
    { name: 'Premier League', count: 9 },
    { name: 'FA Cup', count: 7 },
    { name: 'EFL Cup', count: 8 },
  ],
  'chelsea': [
    { name: 'UEFA Champions League', count: 2 },
    { name: 'Premier League', count: 6 },
    { name: 'FA Cup', count: 8 },
    { name: 'Europa League', count: 2 },
  ],
  'liverpool': [
    { name: 'UEFA Champions League', count: 6 },
    { name: 'Premier League', count: 1 },
    { name: 'FA Cup', count: 8 },
    { name: 'Club World Cup', count: 1 },
  ],
  'bayern-munich': [
    { name: 'UEFA Champions League', count: 6 },
    { name: 'Bundesliga', count: 33 },
    { name: 'DFB-Pokal', count: 20 },
    { name: 'Club World Cup', count: 2 },
  ],
  'psg': [
    { name: 'Ligue 1', count: 11 },
    { name: 'Coupe de France', count: 14 },
    { name: 'Coupe de la Ligue', count: 9 },
  ],
  'arsenal': [
    { name: 'Premier League', count: 13 },
    { name: 'FA Cup', count: 14 },
    { name: 'Community Shield', count: 16 },
  ],
  'tottenham': [
    { name: 'Premier League', count: 2 },
    { name: 'FA Cup', count: 8 },
    { name: 'EFL Cup', count: 4 },
  ],
  'juventus': [
    { name: 'Serie A', count: 36 },
    { name: 'Coppa Italia', count: 14 },
    { name: 'UEFA Champions League', count: 2 },
  ],
  'ac-milan': [
    { name: 'Serie A', count: 19 },
    { name: 'UEFA Champions League', count: 7 },
    { name: 'Coppa Italia', count: 5 },
  ],
  'inter-milan': [
    { name: 'Serie A', count: 19 },
    { name: 'UEFA Champions League', count: 3 },
    { name: 'Coppa Italia', count: 9 },
  ],
  'atletico-madrid': [
    { name: 'La Liga', count: 11 },
    { name: 'Copa del Rey', count: 10 },
    { name: 'Europa League', count: 3 },
  ],
  'borussia-dortmund': [
    { name: 'Bundesliga', count: 8 },
    { name: 'DFB-Pokal', count: 5 },
    { name: 'UEFA Champions League', count: 1 },
  ],
  // NBA Teams
  'los-angeles-lakers': [
    { name: 'NBA Championship', count: 17 },
    { name: 'Conference Titles', count: 32 },
    { name: 'Division Titles', count: 33 },
  ],
  'boston-celtics': [
    { name: 'NBA Championship', count: 17 },
    { name: 'Conference Titles', count: 22 },
    { name: 'Division Titles', count: 22 },
  ],
  'golden-state-warriors': [
    { name: 'NBA Championship', count: 7 },
    { name: 'Conference Titles', count: 12 },
    { name: 'Division Titles', count: 12 },
  ],
  'chicago-bulls': [
    { name: 'NBA Championship', count: 6 },
    { name: 'Conference Titles', count: 6 },
    { name: 'Division Titles', count: 9 },
  ],
  'miami-heat': [
    { name: 'NBA Championship', count: 3 },
    { name: 'Conference Titles', count: 7 },
    { name: 'Division Titles', count: 16 },
  ],
  'brooklyn-nets': [
    { name: 'Conference Titles', count: 2 },
    { name: 'Division Titles', count: 4 },
  ],
  'milwaukee-bucks': [
    { name: 'NBA Championship', count: 2 },
    { name: 'Conference Titles', count: 3 },
    { name: 'Division Titles', count: 18 },
  ],
  'philadelphia-76ers': [
    { name: 'NBA Championship', count: 3 },
    { name: 'Conference Titles', count: 9 },
    { name: 'Division Titles', count: 12 },
  ],
  'phoenix-suns': [
    { name: 'Conference Titles', count: 3 },
    { name: 'Division Titles', count: 7 },
  ],
  'dallas-mavericks': [
    { name: 'NBA Championship', count: 1 },
    { name: 'Conference Titles', count: 2 },
    { name: 'Division Titles', count: 4 },
  ],
  'new-york-knicks': [
    { name: 'NBA Championship', count: 2 },
    { name: 'Conference Titles', count: 8 },
    { name: 'Division Titles', count: 8 },
  ],
  'toronto-raptors': [
    { name: 'NBA Championship', count: 1 },
    { name: 'Conference Titles', count: 1 },
    { name: 'Division Titles', count: 7 },
  ],
  'denver-nuggets': [
    { name: 'NBA Championship', count: 1 },
    { name: 'Conference Titles', count: 1 },
    { name: 'Division Titles', count: 10 },
  ],
};

const getTeamColors = (teamName: string, primaryColor?: string, secondaryColor?: string) => {
  const normalizedName = teamName.toLowerCase();
  
  if (primaryColor && secondaryColor) {
    return { primary: primaryColor, secondary: secondaryColor };
  }
  
  const mapped = TEAM_COLORS[normalizedName];
  if (mapped) {
    return mapped;
  }
  
  return { 
    primary: 'hsl(var(--primary))', 
    secondary: 'hsl(var(--secondary))' 
  };
};

const getTeamTrophies = (teamSlug: string, achievements?: Array<{ name: string; count: number }>) => {
  // First, use achievements from API if available
  if (achievements && achievements.length > 0) {
    return achievements;
  }
  
  // Otherwise, use static config
  const normalizedSlug = teamSlug.toLowerCase().replace(/\s+/g, '-');
  return TEAM_TROPHIES[normalizedSlug] || [];
};

// NBA Team Nicknames mapping
const NBA_NICKNAMES: Record<string, string> = {
  "golden-state-warriors": "Warriors",
  "los-angeles-lakers": "Lakers",
  "miami-heat": "Heat",
  "chicago-bulls": "Bulls",
  "boston-celtics": "Celtics",
  "brooklyn-nets": "Nets",
  "phoenix-suns": "Suns",
  "dallas-mavericks": "Mavericks",
  "new-york-knicks": "Knicks",
  "toronto-raptors": "Raptors",
  "denver-nuggets": "Nuggets",
  "milwaukee-bucks": "Bucks",
  "philadelphia-76ers": "76ers",
};

const formatTeamName = (name: string) => {
  // Convert to Title Case
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Get display name for team page title (nickname for NBA, full name for others)
const getTeamDisplayName = (teamName: string, teamSlug: string, league?: string): string => {
  // Check if it's an NBA team
  if (league?.toLowerCase() === 'nba' || league?.toLowerCase().includes('nba')) {
    const normalizedSlug = teamSlug.toLowerCase().replace(/\s+/g, '-');
    const nickname = NBA_NICKNAMES[normalizedSlug];
    if (nickname) {
      return nickname;
    }
  }
  // Fallback to full team name
  return formatTeamName(teamName);
};

const TeamPage = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  useEffect(() => {
    if (team?.id) {
      checkFollowStatus();
    }
  }, [team?.id]);

  const fetchTeamData = async () => {
    if (!teamId) return;
    
    setLoading(true);
    try {
      // Try to find team in fan_entities first
      const { data: entity, error: entityError } = await supabase
        .from("fan_entities")
        .select("*")
        .or(`name.ilike.%${teamId}%,slug.ilike.%${teamId}%`)
        .eq("category", "sports")
        .limit(1)
        .single();

      if (entity && !entityError) {
        // Get league from stats or entity data with proper type checking
        const stats = entity.stats as any;
        const league = (stats?.league as string) || 
                      (stats?.competition as string) ||
                      undefined;

        // Safely parse achievements
        let achievements: Array<{ name: string; count: number }> = [];
        if (entity.achievements) {
          try {
            const parsed = Array.isArray(entity.achievements) 
              ? entity.achievements 
              : typeof entity.achievements === 'string' 
                ? JSON.parse(entity.achievements) 
                : entity.achievements;
            achievements = Array.isArray(parsed) ? parsed : [];
          } catch {
            achievements = [];
          }
        }

        // Safely parse news_feed
        let newsFeed: any[] = [];
        if (entity.news_feed) {
          try {
            const parsed = Array.isArray(entity.news_feed)
              ? entity.news_feed
              : typeof entity.news_feed === 'string'
                ? JSON.parse(entity.news_feed)
                : entity.news_feed;
            newsFeed = Array.isArray(parsed) ? parsed : [];
          } catch {
            newsFeed = [];
          }
        }

        // Get logo from entity or fallback to TEAMS array
        const teamLogo = entity.logo_url || getTeamLogo(entity.name) || undefined;
        
        setTeam({
          id: entity.id,
          name: formatTeamName(entity.name),
          league: league,
          logo: teamLogo,
          bio: `${formatTeamName(entity.name)} fanbase. Follow for live updates, match discussions, and team news.`,
          achievements: achievements,
          primary_color: entity.primary_color || undefined,
          secondary_color: entity.secondary_color || undefined,
          current_match: entity.current_match || undefined,
          next_match: entity.next_match || undefined,
          last_match: entity.last_match || undefined,
          news_feed: newsFeed,
          stats: stats,
        });

        // Fetch follower count
        const { count } = await supabase
          .from("fan_follows")
          .select("*", { count: "exact", head: true })
          .eq("entity_id", entity.id);
        
        setFollowerCount(count || 0);
      } else {
        // Fallback: create basic team data from teamId
        const teamName = formatTeamName(decodeURIComponent(teamId).replace(/-/g, ' '));
        const teamLogo = getTeamLogo(teamName) || undefined;
        setTeam({
          name: teamName,
          league: undefined,
          logo: teamLogo,
          bio: `${teamName} fanbase. Follow for live updates, match discussions, and team news.`,
          achievements: [],
          news_feed: [],
        });
      }

      // Fetch recent matches (finished)
      const { data: recentMatches } = await supabase
        .from("match_results")
        .select("*")
        .or(`team_home.ilike.%${teamId}%,team_away.ilike.%${teamId}%`)
        .in("status", ["Final", "FT", "Match Finished", "AOT", "AET"])
        .order("match_date", { ascending: false })
        .limit(10);

      if (recentMatches) {
        setMatches(recentMatches);
      }

      // Fetch upcoming matches
      const { data: upcomingData } = await supabase
        .from("match_results")
        .select("*")
        .or(`team_home.ilike.%${teamId}%,team_away.ilike.%${teamId}%`)
        .in("status", ["Scheduled", "NS", "TBD", "Upcoming"])
        .order("match_date", { ascending: true })
        .limit(10);

      if (upcomingData) {
        setUpcomingMatches(upcomingData);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    // Check if there's an auth error or no user
    if (authError) {
      console.error("Auth error:", authError);
      setIsFollowing(false);
      return;
    }
    
    if (!user) {
      setIsFollowing(false);
      return;
    }
    
    // Wait for team to be loaded
    if (!team?.id) {
      // Retry after a short delay if team isn't loaded yet
      setTimeout(() => {
        if (team?.id) {
          checkFollowStatus();
        }
      }, 500);
      return;
    }

    const { data, error } = await supabase
      .from("fan_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("entity_id", team.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error checking follow status:", error);
    }

    setIsFollowing(!!data);
  };

  const handleToggleFollow = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error("Auth error:", authError);
      toast.error("Please sign in");
      return;
    }
    
    if (!user) {
      toast.error("Please sign in");
      return;
    }
    
    if (!team?.id) {
      toast.error("Team information not available");
      return;
    }

    if (isFollowing) {
      const { error } = await supabase
        .from("fan_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("entity_id", team.id);

      if (error) {
        toast.error("Failed to unfollow");
      } else {
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success(`Unfollowed ${team.name}`);
      }
    } else {
      const { error } = await supabase
        .from("fan_follows")
        .insert({
          user_id: user.id,
          entity_id: team.id,
        });

      if (error) {
        toast.error("Failed to follow");
      } else {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success(`Following ${team.name}`);
      }
    }
  };

  const getMatchResult = (match: Match) => {
    if (!match.score_home && !match.score_away) return null;
    const teamName = team?.name || "";
    const isHome = match.team_home === teamName;
    const teamScore = isHome ? match.score_home : match.score_away;
    const opponentScore = isHome ? match.score_away : match.score_home;
    
    if (teamScore === null || opponentScore === null) return null;
    
    if (teamScore > opponentScore) {
      return "Won";
    } else if (opponentScore > teamScore) {
      return "Lost";
    } else {
      return "Draw";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Team not found</p>
          <Button onClick={() => navigate("/sports-hub")}>Go to Sports</Button>
        </div>
      </div>
    );
  }

  const teamColors = getTeamColors(team.name, team.primary_color, team.secondary_color);
  const teamSlug = teamId?.toLowerCase().replace(/\s+/g, '-') || '';
  const trophies = getTeamTrophies(teamSlug, team.achievements);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20">
      {/* Header with Gradient Background */}
      <div 
        className="relative h-48 md:h-64"
        style={{
          background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.secondary})`,
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white hover:bg-white/20 z-10"
          onClick={() => navigate("/sports-hub")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mobile: Full width, Desktop: 2/3 width */}
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Team Profile Card */}
            <Card className="p-6 shadow-xl bg-background/95 backdrop-blur">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Logo and Follow Button Container - Mobile: side by side */}
                <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                  {/* Logo - Use real team logo */}
                  {team.logo && !logoError ? (
                    <img 
                      src={team.logo} 
                      alt={team.name} 
                      className="w-24 h-24 rounded-full object-contain bg-white p-3 border-4 border-background shadow-2xl ring-2 ring-primary/20 flex-shrink-0"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-background shadow-2xl ring-2 ring-primary/20 flex-shrink-0"
                      style={{ 
                        background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.secondary})`,
                      }}
                    >
                      {team.name.charAt(0)}
                    </div>
                  )}
                  {/* Follow Button - Right of logo on mobile, below on desktop */}
                  <div className="sm:hidden">
                    <Button
                      variant={isFollowing ? "default" : "outline"}
                      size="sm"
                      onClick={handleToggleFollow}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                  </div>
                </div>
                
                {/* Team Info */}
                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold mb-1">
                        {getTeamDisplayName(team.name, teamSlug, team.league)} News
                      </h1>
                      <p className="text-sm text-muted-foreground mb-2">
                        {team.bio}
                      </p>
                    </div>
                    {/* Follow Button - Desktop: top right */}
                    <div className="hidden sm:flex gap-2">
                      <Button
                        variant={isFollowing ? "default" : "outline"}
                        size="sm"
                        onClick={handleToggleFollow}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  </div>

                  {/* League & Followers */}
                  <div className="flex items-center gap-4 text-sm">
                    {team.league ? (
                      <span className="text-muted-foreground">
                        <span className="font-semibold">{team.league}</span> league
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">
                      <Users className="w-4 h-4 inline mr-1" />
                      <span className="font-semibold">{followerCount}</span> followers
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Major Trophies Section - Mobile: Accordion, Desktop: Sidebar */}
            {trophies && trophies.length > 0 && (
              <Card className="p-6 lg:hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="trophies">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-600" />
                        <span className="text-xl font-bold">Major Trophies</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pt-2">
                        {trophies.map((trophy, i) => (
                          <div 
                            key={i} 
                            className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20"
                          >
                            <Trophy className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-sm truncate">{trophy.name}</p>
                              <p className="text-xs text-muted-foreground">{trophy.count}x {trophy.name.includes('Champions League') || trophy.name.includes('League') ? 'Champion' : 'Winner'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            )}

            {/* Matches & Fixtures Section */}
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Matches & Fixtures
              </h3>

              {/* Recent Matches */}
              {matches && matches.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Recent Matches</h4>
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {matches.slice(0, 5).map((match) => {
                        const result = getMatchResult(match);
                        const teamName = team.name;
                        const homeTeam = match.team_home || '';
                        const awayTeam = match.team_away || '';
                        const homeScore = match.score_home ?? null;
                        const awayScore = match.score_away ?? null;

                        return (
                          <CarouselItem key={match.id || match.match_id || `match-${homeTeam}-${awayTeam}`} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                            <Card className="p-4 h-full border shadow-sm hover:shadow-md transition-shadow">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs">Recent</Badge>
                                  <Badge variant="outline" className="text-xs">{match.league || 'Unknown'}</Badge>
                                </div>
                                
                                <div className="flex items-center justify-between py-2">
                                  <div className="text-center flex-1">
                                    <p className={`font-bold text-sm ${homeTeam === teamName ? 'text-primary' : 'text-foreground'}`}>
                                      {homeTeam}
                                    </p>
                                    <p className={`text-2xl font-bold mt-1 ${homeTeam === teamName ? 'text-primary' : 'text-foreground'}`}>
                                      {homeScore ?? '-'}
                                    </p>
                                  </div>
                                  <div className="text-muted-foreground px-3 font-bold">-</div>
                                  <div className="text-center flex-1">
                                    <p className={`font-bold text-sm ${awayTeam === teamName ? 'text-primary' : 'text-foreground'}`}>
                                      {awayTeam}
                                    </p>
                                    <p className={`text-2xl font-bold mt-1 ${awayTeam === teamName ? 'text-primary' : 'text-foreground'}`}>
                                      {awayScore ?? '-'}
                                    </p>
                                  </div>
                                </div>

                                <div className="pt-2 border-t">
                                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formatDate(match.match_date)}</span>
                                  </div>
                                  {result && (
                                    <div className="flex items-center justify-center">
                                      <Badge 
                                        variant={result === 'Won' ? 'default' : result === 'Lost' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {result}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
              ) : (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Recent Matches</h4>
                  <p className="text-muted-foreground text-center py-4">No recent matches available</p>
                </div>
              )}

              {/* Upcoming Fixtures */}
              {upcomingMatches && upcomingMatches.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming Matches</h4>
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {upcomingMatches.slice(0, 5).map((match) => (
                        <CarouselItem key={match.id || match.match_id || `upcoming-${match.team_home}-${match.team_away}`} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                          <Card className="p-4 h-full border shadow-sm hover:shadow-md transition-shadow">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">Upcoming</Badge>
                                <Badge variant="outline" className="text-xs">{match.league || 'Unknown'}</Badge>
                              </div>
                              
                              <div className="flex items-center justify-between py-2">
                                <div className="text-center flex-1">
                                  <p className="font-bold text-sm">{match.team_home || 'TBD'}</p>
                                </div>
                                <div className="text-muted-foreground px-3 font-bold">VS</div>
                                <div className="text-center flex-1">
                                  <p className="font-bold text-sm">{match.team_away || 'TBD'}</p>
                                </div>
                              </div>

                              <div className="pt-2 border-t">
                                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(match.match_date)}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
              ) : (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-3">Upcoming Matches</h4>
                  <p className="text-muted-foreground text-center py-4">No upcoming matches available</p>
                </div>
              )}
            </Card>

            {/* Team News Section */}
            {team.news_feed && Array.isArray(team.news_feed) && team.news_feed.length > 0 ? (
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">{getTeamDisplayName(team.name, teamSlug, team.league)} News</h3>
                <div className="space-y-4">
                  {team.news_feed.slice(0, 5).map((news: any, i: number) => {
                    // Create a news item ID that can be used for PostDetail navigation
                    const newsId = `news-${team.id || teamId}-${i}`;
                    const newsSource = "news";
                    
                    return (
                      <NewsCard
                        key={i}
                        id={newsId}
                        title={news.title || news.headline || 'News'}
                        source={news.source || "Sports News"}
                        time={news.published || "1h ago"}
                        description={news.description || news.summary || news.content || ""}
                        url={news.url}
                        imageUrl={news.image}
                        category="sports"
                        entityName={team.name}
                        isPlaying={false}
                        isLiked={false}
                        isBookmarked={false}
                        onPlay={() => {}}
                        onLike={() => {}}
                        onComment={() => {
                          // Navigate to PostDetail with team origin
                          navigate(`/post/${newsSource}/${newsId}?origin=team&teamId=${teamId}`);
                        }}
                        onBookmark={() => {}}
                        onShare={() => {
                          // Share functionality can be handled by NewsCard's URL prop
                          // Or we can implement a share modal here if needed
                        }}
                      />
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </div>

          {/* Right Column - Trophies Sidebar (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1">
            {trophies && trophies.length > 0 ? (
              <Card className="p-6 sticky top-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Major Trophies
                </h3>
                {/* Desktop: Grid Layout */}
                <div className="hidden lg:grid lg:grid-cols-1 gap-3">
                  {trophies.map((trophy, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20"
                    >
                      <Trophy className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate">{trophy.name}</p>
                        <p className="text-xs text-muted-foreground">{trophy.count}x {trophy.name.includes('Champions League') || trophy.name.includes('League') ? 'Champion' : 'Winner'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Mobile: Horizontal Scrollable Carousel */}
                <div className="lg:hidden">
                  <Carousel className="w-full">
                    <CarouselContent className="-ml-2">
                      {trophies.map((trophy, i) => (
                        <CarouselItem key={i} className="pl-2 basis-auto">
                          <Card className="p-3 w-[200px] bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                            <div className="flex items-center gap-3">
                              <Trophy className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm truncate">{trophy.name}</p>
                                <p className="text-xs text-muted-foreground">{trophy.count}x {trophy.name.includes('Champions League') || trophy.name.includes('League') ? 'Champion' : 'Winner'}</p>
                              </div>
                            </div>
                          </Card>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                  </Carousel>
                </div>
              </Card>
            ) : (
              <Card className="p-6 sticky top-4">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                  Major Trophies
                </h3>
                <p className="text-muted-foreground text-sm">No trophy data available yet.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default TeamPage;
