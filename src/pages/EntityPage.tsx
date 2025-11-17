import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { Loader2, Heart, ArrowLeft, Send, Clock, Flame, RefreshCw } from "lucide-react";
import { useAutoUpdateScores } from "@/hooks/useAutoUpdateScores";
import { LiveMatchRoom } from "@/components/LiveMatchRoom";
import { requestNotificationPermission, sendFluxaPushNotification } from "@/lib/notifications";
import { NewsCard } from "@/components/NewsCard";
import { useFluxaBrain } from "@/hooks/useFluxaBrain";
import { MatchesCarousel } from "@/components/MatchesCarousel";

interface Entity {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo_url: string | null;
  background_url: string | null;
  bio: string | null;
  achievements: any;
  stats: any;
  primary_color: string | null;
  secondary_color: string | null;
  current_match: any;
  next_match: any;
  last_match: any;
  upcoming_events: any;
  news_feed: any;
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  reactions: any;
  created_at: string;
}

const EntityPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [sortBy, setSortBy] = useState<'latest' | 'top'>('latest');
  const [showLiveRoom, setShowLiveRoom] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPlayingNewsId, setCurrentPlayingNewsId] = useState<string | null>(null);
  const [isNewsPlaying, setIsNewsPlaying] = useState(false);
  const newsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [likedNews, setLikedNews] = useState<string[]>([]);
  const [bookmarkedNews, setBookmarkedNews] = useState<string[]>([]);
  const [cachedNews, setCachedNews] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const { brainData, trackReading, adjustSummaryForTone } = useFluxaBrain();

  // Enable automatic score updates
  useAutoUpdateScores();

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (slug) {
      fetchEntity();
      fetchPosts();
      checkFollowStatus();
      fetchCachedNews();
    }
    
    // Set up realtime subscription for entity updates
    if (slug) {
      const entityChannel = supabase
        .channel(`entity-${slug}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'fan_entities',
            filter: `slug=eq.${slug}`
          },
          (payload) => {
            console.log('Entity updated:', payload);
            setEntity(payload.new as Entity);
            
            // Show toast for live match updates
            const newEntity = payload.new as Entity;
            if (newEntity.current_match) {
              toast.success('⚽ Live match updated!', {
                description: `${newEntity.current_match.home_team} ${newEntity.current_match.home_score} - ${newEntity.current_match.away_score} ${newEntity.current_match.away_team}`
              });
            }
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(entityChannel);
      };
    }
  }, [slug]);

  const fetchCachedNews = async () => {
    if (!entity?.name) return;
    
    setLoadingNews(true);
    try {
      // Check cache first
      const { data: cacheData } = await supabase.functions.invoke('news-cache', {
        body: { entity: entity.name, action: 'get' }
      });

      if (cacheData?.cached && cacheData?.news?.length > 0) {
        // Apply tone adjustment based on Fluxa Brain
        const adjustedNews = cacheData.news.map((article: any) => ({
          ...article,
          ai_summary: brainData ? adjustSummaryForTone(article.ai_summary || article.description, brainData.preferred_tone as 'concise' | 'casual' | 'analytical') : article.ai_summary
        }));
        setCachedNews(adjustedNews);
      } else {
        // Fetch fresh with AI summaries
        const { data: summaryData } = await supabase.functions.invoke('ai-resilient-summary', {
          body: { 
            articles: entity.news_feed || [],
            userId: (await supabase.auth.getUser()).data.user?.id,
            tone: (brainData?.preferred_tone as 'concise' | 'casual' | 'analytical') || 'casual'
          }
        });

        if (summaryData?.summaries) {
          setCachedNews(summaryData.summaries);
        }
      }
    } catch (error) {
      console.error("Error fetching news:", error);
    }
    setLoadingNews(false);
  };

  // Set up realtime subscription for live updates
  useEffect(() => {
    if (!entity?.id) return;

    console.log('🔴 Setting up realtime subscription for entity:', entity.name);
    
    const channel = supabase
      .channel(`entity-${entity.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fan_entities',
          filter: `id=eq.${entity.id}`
        },
        (payload) => {
          console.log('🔴 LIVE UPDATE received:', payload);
          const oldMatch = entity.current_match;
          const newMatch = payload.new.current_match;
          
          setEntity(payload.new as Entity);
          
          // Show notification for live match updates
          if (newMatch) {
            // Check if it's a new live match or score changed
            const isNewMatch = !oldMatch || oldMatch.match_id !== newMatch.match_id;
            const scoreChanged = oldMatch && (
              oldMatch.home_score !== newMatch.home_score ||
              oldMatch.away_score !== newMatch.away_score
            );

            if (isNewMatch) {
              toast.success(`🔴 LIVE MATCH STARTED!`, {
                description: `${newMatch.home_team} vs ${newMatch.away_team}`
              });
              sendFluxaPushNotification(
                `🔴 ${entity.name} is Live!`,
                `${newMatch.home_team} vs ${newMatch.away_team} has started`
              );
            } else if (scoreChanged) {
              toast.success(`⚽ GOAL! ${newMatch.home_score}-${newMatch.away_score}`, {
                description: `${newMatch.home_team} vs ${newMatch.away_team}`
              });
              sendFluxaPushNotification(
                `⚽ GOAL!`,
                `${newMatch.home_team} ${newMatch.home_score}-${newMatch.away_score} ${newMatch.away_team}`
              );
            } else {
              toast.success('🔴 Live update!', {
                description: 'Match scores updated'
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [entity]);

  const fetchEntity = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("fan_entities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      toast.error("Entity not found");
      navigate("/fanbase");
    } else {
      setEntity(data as Entity);
    }
    setLoading(false);
  };

  const fetchPosts = async () => {
    if (!entity?.id) return;

    const query = supabase
      .from("fan_posts")
      .select("*")
      .eq("entity_id", entity.id);

    if (sortBy === 'latest') {
      query.order("created_at", { ascending: false });
    } else {
      query.order("reaction_count", { ascending: false });
    }

    const { data } = await query.limit(50);
    setPosts(data || []);
  };

  const checkFollowStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !entity?.id) return;

    const { data } = await supabase
      .from("fan_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("entity_id", entity.id)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      navigate("/auth");
      return;
    }

    if (isFollowing) {
      await supabase
        .from("fan_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("entity_id", entity!.id);
      setIsFollowing(false);
      toast.success("Unfollowed");
    } else {
      await supabase
        .from("fan_follows")
        .insert({ user_id: user.id, entity_id: entity!.id });
      setIsFollowing(true);
      toast.success("Following!");
    }
  };

  const handlePost = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to post");
      navigate("/auth");
      return;
    }

    if (!newPost.trim()) {
      toast.error("Post cannot be empty");
      return;
    }

    setPosting(true);
    const { error } = await supabase
      .from("fan_posts")
      .insert({
        entity_id: entity!.id,
        user_id: user.id,
        content: newPost.trim(),
      });

    if (error) {
      toast.error("Failed to post");
    } else {
      setNewPost("");
      fetchPosts();
      toast.success("Posted!");
    }
    setPosting(false);
  };

  const handleReaction = async (postId: string, emoji: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const reactions = { ...post.reactions };
    reactions[emoji] = (reactions[emoji] || 0) + 1;

    const totalReactions = Object.values(reactions).reduce((a, b) => (a as number) + (b as number), 0) as number;

    await supabase
      .from("fan_posts")
      .update({ 
        reactions,
        reaction_count: totalReactions
      })
      .eq("id", postId);

    fetchPosts();
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    toast.loading('Refreshing match data...');
    
    try {
      await supabase.functions.invoke('update-live-scores');
      await fetchEntity();
      toast.success('✅ Match data refreshed!');
    } catch (err) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (entity) {
      fetchPosts();
    }
  }, [sortBy, entity]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!entity) return null;

  const primaryColor = entity.primary_color || 'hsl(var(--primary))';
  const secondaryColor = entity.secondary_color || 'hsl(var(--secondary))';

  return (
    <div className="min-h-screen pb-20">
      {/* Header with Background */}
      <div 
        className="relative h-40 md:h-56"
        style={{
          backgroundImage: entity.background_url ? `url(${entity.background_url})` : `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4 text-white hover:bg-white/20 z-10"
          onClick={() => navigate("/fanbase-hub")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Main Content - Desktop Grid Layout */}
      <div className="max-w-7xl mx-auto px-4" style={{ marginTop: '-80px' }}>
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Column */}
          <div className="flex-1">
            {/* Profile Section */}
            <Card className="p-4 md:p-6 shadow-xl bg-background/95 backdrop-blur">
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {entity.logo_url ? (
                  <img 
                    src={entity.logo_url} 
                    alt={entity.name} 
                    className="w-20 h-20 md:w-28 md:h-28 rounded-full object-contain bg-white p-3 border-4 border-background shadow-2xl ring-2 ring-primary/20 mx-auto sm:mx-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center text-3xl font-bold border-4 border-background shadow-2xl ring-2 ring-primary/20 mx-auto sm:mx-0"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    display: entity.logo_url ? 'none' : 'flex'
                  }}
                >
                  {entity.name.charAt(0)}
                </div>

                <div className="flex-1 w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-center sm:text-left w-full sm:w-auto">{entity.name}</h1>
                    <div className="flex gap-2 w-full sm:w-auto">
                      {entity.category === 'sports' && (
                        <Button
                          variant="outline"
                          onClick={handleManualRefresh}
                          size="sm"
                          disabled={refreshing}
                          className="flex-1 sm:flex-none"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      )}
                      <Button
                        variant={isFollowing ? "default" : "outline"}
                        onClick={handleFollow}
                        size="sm"
                        className="flex-1 sm:flex-none"
                      >
                        <Heart className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-center sm:justify-start mb-3">
                    <Badge variant="secondary">
                      {entity.category}
                    </Badge>
                  </div>

                  {entity.bio && (
                    <p className="text-muted-foreground text-sm md:text-base mb-4 text-center sm:text-left">{entity.bio}</p>
                  )}

                  {/* Stats - Only show user-friendly fields */}
                  {entity.stats && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-3 md:gap-6 text-sm">
                      {entity.stats.league && (
                        <div className="text-center sm:text-left">
                          <span className="font-bold">{entity.stats.league}</span>
                          <span className="text-muted-foreground ml-1">league</span>
                        </div>
                      )}
                      {entity.stats.followers !== undefined && (
                        <div className="text-center sm:text-left">
                          <span className="font-bold">{entity.stats.followers}</span>
                          <span className="text-muted-foreground ml-1">followers</span>
                        </div>
                      )}
                      {entity.stats.injuries && Array.isArray(entity.stats.injuries) && entity.stats.injuries.length > 0 && (
                        <div className="text-center sm:text-left">
                          <span className="font-bold">{entity.stats.injuries.length}</span>
                          <span className="text-muted-foreground ml-1">injuries</span>
                        </div>
                      )}
                      {entity.stats.standings && typeof entity.stats.standings === 'object' && entity.stats.standings.position && (
                        <div className="text-center sm:text-left">
                          <span className="font-bold">#{entity.stats.standings.position}</span>
                          <span className="text-muted-foreground ml-1">position</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Achievements Accordion */}
              {entity.achievements && entity.achievements.length > 0 && (
                <div className="mt-6 pt-6 border-t lg:hidden">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="trophies">
                      <AccordionTrigger className="font-bold">
                        {entity.category === 'music' ? '🎵' : '🏆'} {entity.category === 'music' ? 'Major Awards' : 'Major Trophies'} ({entity.achievements.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          {entity.achievements.map((trophy: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                              <span className="text-xl">{entity.category === 'music' ? '🎵' : '🏆'}</span>
                              <div>
                                <p className="font-bold text-xs">{trophy.name}</p>
                                <p className="text-xs text-muted-foreground">{trophy.count}x</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}
            </Card>

            {/* Current/Live Match with Real-time Updates - Clickable to open room */}
            {entity.current_match && (
              <Card 
                className="mt-6 p-6 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" 
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}10, ${secondaryColor}10)`,
                  borderColor: primaryColor
                }}
                onClick={() => setShowLiveRoom(true)}
              >
                {entity.current_match.status === 'live' && (
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-xs font-bold text-red-500">LIVE</span>
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                    {entity.category === 'football' || entity.category === 'basketball' ? '⚽' : '🎵'} {entity.current_match.status === 'live' ? '🔴 LIVE MATCH' : 'Current Event'}
                  </h3>
                  <Badge variant={entity.current_match.status === 'live' ? 'destructive' : 'secondary'}>
                    {entity.current_match.league || entity.current_match.venue}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="font-bold text-sm md:text-lg">{entity.current_match.home_team}</p>
                    <p className="text-3xl md:text-4xl font-bold mt-2 transition-all duration-300" style={{ color: primaryColor }}>
                      {entity.current_match.home_score || 0}
                    </p>
                  </div>
                  <div className="text-muted-foreground px-2 md:px-4 text-sm md:text-base font-bold">VS</div>
                  <div className="text-center flex-1">
                    <p className="font-bold text-sm md:text-lg">{entity.current_match.away_team}</p>
                    <p className="text-3xl md:text-4xl font-bold mt-2 transition-all duration-300" style={{ color: secondaryColor }}>
                      {entity.current_match.away_score || 0}
                    </p>
                  </div>
                </div>
                {entity.current_match.match_time && (
                  <p className="text-center text-xs md:text-sm text-muted-foreground mt-4">
                    {entity.current_match.match_time}
                  </p>
                )}
                {entity.current_match.commentary && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs md:text-sm text-muted-foreground italic">
                      💬 {entity.current_match.commentary}
                    </p>
                  </div>
                )}
                <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
                  👆 Tap to join the conversation
                </div>
              </Card>
            )}

            {/* Matches Carousel - Recent, Current, and Upcoming */}
            <MatchesCarousel 
              entity={entity}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />

            {/* News Feed - Gist Card Style */}
            {entity.news_feed && entity.news_feed.length > 0 && (
              <div className="mt-6 space-y-6">
                <h3 className="font-bold text-xl flex items-center gap-2 px-2">
                  📰 Latest News
                </h3>
                <div className="space-y-6">
                  {entity.news_feed.slice(0, 5).map((news: any, i: number) => {
                    const newsId = `news-${entity.id}-${i}`;
                    return (
                      <NewsCard
                        key={newsId}
                        id={newsId}
                        title={news.title}
                        source={news.source}
                        time={news.time || '1h ago'}
                        description={news.description || `Latest news about ${entity.name}`}
                        url={news.url}
                        imageUrl={news.image || entity.background_url || undefined}
                        category={entity.category}
                        entityName={entity.name}
                        isPlaying={currentPlayingNewsId === newsId && isNewsPlaying}
                        isLiked={likedNews.includes(newsId)}
                        isBookmarked={bookmarkedNews.includes(newsId)}
                        onPlay={async () => {
                          if (currentPlayingNewsId === newsId && isNewsPlaying) {
                            newsAudioRef.current?.pause();
                            setIsNewsPlaying(false);
                            setCurrentPlayingNewsId(null);
                          } else {
                            if (newsAudioRef.current) {
                              newsAudioRef.current.pause();
                            }
                            
                            try {
                              const narrationText = `${news.title}. ${news.description || news.source}`;
                              const { data, error } = await supabase.functions.invoke('text-to-speech', {
                                body: { 
                                  text: narrationText,
                                  voice: 'nova',
                                  speed: 1.0
                                }
                              });

                              if (error) throw error;
                              
                              if (data?.url) {
                                const audio = new Audio(data.url);
                                newsAudioRef.current = audio;
                                audio.play();
                                setIsNewsPlaying(true);
                                setCurrentPlayingNewsId(newsId);

                                audio.onended = () => {
                                  setIsNewsPlaying(false);
                                  setCurrentPlayingNewsId(null);
                                };
                              }
                            } catch (error) {
                              console.error('Failed to play news audio:', error);
                              toast.error('Failed to play audio');
                            }
                          }
                        }}
                        onLike={() => {
                          setLikedNews(prev => 
                            prev.includes(newsId) ? prev.filter(id => id !== newsId) : [...prev, newsId]
                          );
                        }}
                        onComment={() => {
                          toast.info('Open discussion coming soon!');
                        }}
                        onBookmark={() => {
                          setBookmarkedNews(prev => 
                            prev.includes(newsId) ? prev.filter(id => id !== newsId) : [...prev, newsId]
                          );
                          toast.success(bookmarkedNews.includes(newsId) ? 'Removed from bookmarks' : 'Bookmarked!');
                        }}
                        onShare={() => {
                          if (news.url) {
                            navigator.clipboard.writeText(news.url);
                            toast.success('Link copied to clipboard!');
                          } else {
                            toast.success('Shared!');
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Posts Section */}
            <div className="mt-6">
              <Card className="p-4 mb-4">
                <Textarea
                  placeholder="Share your thoughts with the fanbase..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="mb-3"
                  rows={3}
                />
                <Button onClick={handlePost} disabled={posting} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  {posting ? "Posting..." : "Post"}
                </Button>
              </Card>

              {/* Sort Options */}
              <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as any)} className="mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="latest">
                    <Clock className="w-4 h-4 mr-2" />
                    Latest
                  </TabsTrigger>
                  <TabsTrigger value="top">
                    <Flame className="w-4 h-4 mr-2" />
                    Top
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Posts Feed */}
              <div className="space-y-3">
                {posts.map(post => (
                  <Card key={post.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10 bg-gradient-to-br from-primary to-secondary" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-1">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                        <p className="mb-3">{post.content}</p>
                        
                        {/* Reactions */}
                        <div className="flex gap-2">
                          {['🔥', '😂', '😭', '❤️', '👏'].map(emoji => (
                            <Button
                              key={emoji}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReaction(post.id, emoji)}
                              className="text-lg"
                            >
                              {emoji}
                              {post.reactions[emoji] && (
                                <span className="ml-1 text-xs">{post.reactions[emoji]}</span>
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {posts.length === 0 && (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 space-y-6">
            {/* Achievements Sidebar */}
            {entity.achievements && entity.achievements.length > 0 && (
              <Card className="p-6 sticky top-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  {entity.category === 'music' ? '🎵' : '🏆'} {entity.category === 'music' ? 'Major Awards' : 'Major Trophies'}
                </h3>
                <div className="space-y-3">
                  {entity.achievements.map((trophy: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                      <span className="text-2xl">{entity.category === 'music' ? '🎵' : '🏆'}</span>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{trophy.name}</p>
                        <p className="text-xs text-muted-foreground">{trophy.count}x {entity.category === 'music' ? 'Winner' : 'Champion'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Live Match Room Modal */}
      {entity?.current_match && (
        <LiveMatchRoom
          isOpen={showLiveRoom}
          onClose={() => setShowLiveRoom(false)}
          match={entity.current_match}
          entityId={entity.id}
        />
      )}
    </div>
  );
};

export default EntityPage;
