import { useState, useEffect, useRef } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import { NewsCard } from "@/components/NewsCard";
import { BottomNavigation } from "@/components/BottomNavigation";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ShareDialog } from "@/components/ShareDialog";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { FloatingActionButtons } from "@/components/FloatingActionButtons";
import { useFluxaMemory } from "@/hooks/useFluxaMemory";
import { useDarkMode } from "@/hooks/useDarkMode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Headphones, TrendingUp, Play, ChevronDown, Instagram, Facebook, MessageSquare, Sparkles, Bookmark, User, Settings, LogOut, Moon, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { highlightText } from "@/lib/highlightText";

interface Gist {
  id: string;
  headline: string;
  context: string;
  audio_url: string;
  image_url: string | null;
  topic: string;
  topic_category: string | null;
  published_at?: string;
  play_count?: number;
  analytics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    plays: number;
  };
}

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  description?: string;
  url?: string;
  image?: string;
  category: string;
  entityName: string;
  entityId: string;
}

const Feed = () => {
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useDarkMode();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All Updates");
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const [chatContext, setChatContext] = useState<{ topic: string; summary: string } | undefined>(undefined);
  const [likedGists, setLikedGists] = useState<string[]>([]);
  const [bookmarkedGists, setBookmarkedGists] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPlatform, setSelectedPlatform] = useState("X");
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [currentPlayingNewsId, setCurrentPlayingNewsId] = useState<string | null>(null);
  const [isNewsPlaying, setIsNewsPlaying] = useState(false);
  const newsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedTab, setSelectedTab] = useState<"all" | "foryou" | "bookmarks">("foryou");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newGistCount, setNewGistCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [trendingGists, setTrendingGists] = useState<Gist[]>([]);
  const [recommendedGists, setRecommendedGists] = useState<Gist[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGist, setSelectedGist] = useState<Gist | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const fluxaMemory = useFluxaMemory();

  const platforms = [
    { name: "X", icon: "𝕏" },
    { name: "Instagram", icon: Instagram },
    { name: "Facebook", icon: Facebook },
    { name: "Threads", icon: MessageSquare },
  ];

  const categories = ["All", "Technology", "Lifestyle", "Science", "Media", "Productivity"];
  const viewTabs: { label: string; value: "all" | "foryou" | "bookmarks" }[] = [
    { label: "For You", value: "foryou" },
    { label: "All Updates", value: "all" },
    { label: "Bookmarks", value: "bookmarks" }
  ];

  const loadGists = async (showToast = false, loadMore = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      if (loadMore) setIsLoadingMore(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get user's interests to filter content
      let userTopics: string[] = [];
      if (user) {
        const { data: subniches } = await supabase
          .from("user_subniches")
          .select("main_topic, sub_niches")
          .eq("user_id", user.id);
        
        if (subniches && subniches.length > 0) {
          userTopics = [
            ...subniches.map(s => s.main_topic),
            ...subniches.flatMap(s => s.sub_niches || [])
          ];
        }
      }

      const pageSize = 20;
      const offset = loadMore ? (page + 1) * pageSize : 0;

      // Fetch gists - filter by user topics if available
      let query = supabase
        .from("gists")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (userTopics.length > 0 && selectedTab === "foryou") {
        const conditions = userTopics.flatMap(topic => [
          `topic_category.ilike.%${topic}%`,
          `topic.ilike.%${topic}%`
        ]);
        query = query.or(conditions.join(','));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Fetch analytics for all gists
        const gistIds = data.map(g => g.id);
        const { data: analyticsData } = await supabase
          .from("post_analytics")
          .select("*")
          .in("post_id", gistIds);

        const analyticsMap = new Map(
          analyticsData?.map(a => [a.post_id, a]) || []
        );

        const gistsWithAnalytics = data.map(gist => ({
          ...gist,
          analytics: analyticsMap.get(gist.id) || {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            plays: 0
          }
        }));

        if (loadMore) {
          setGists(prev => [...prev, ...gistsWithAnalytics]);
          setPage(prev => prev + 1);
        } else {
          setGists(gistsWithAnalytics);
          setPage(0);
        }
        setHasMore(data.length === pageSize);
      }

      // Load trending gists (top by likes/plays in last 24 hours)
      if (!loadMore) {
        const { data: trending } = await supabase
          .from("gists")
          .select("*")
          .eq("status", "published")
          .gte("published_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order("play_count", { ascending: false })
          .limit(5);
        
        if (trending) setTrendingGists(trending);

        // Load personalized recommendations based on user history
        if (user) {
          const { data: memory } = await supabase
            .from("fluxa_memory")
            .select("gist_history, favorite_topics")
            .eq("user_id", user.id)
            .single();

          if (memory) {
            // Get topics from history and favorites
            const historyTopics = Array.isArray(memory.gist_history) 
              ? memory.gist_history.map((h: any) => h.topic).filter(Boolean)
              : [];
            const favoriteTopics = memory.favorite_topics || [];
            const allTopics = [...new Set([...historyTopics, ...favoriteTopics])];

            if (allTopics.length > 0) {
              const conditions = allTopics.flatMap(topic => [
                `topic_category.ilike.%${topic}%`,
                `topic.ilike.%${topic}%`
              ]);

              const { data: recommendations } = await supabase
                .from("gists")
                .select("*")
                .eq("status", "published")
                .or(conditions.join(','))
                .order("published_at", { ascending: false })
                .limit(6);

              if (recommendations) setRecommendedGists(recommendations);
            }
          }
        }
      }

      const { data: gistData, error: gistError } = await query;

        // Load user's bookmarked gists
        if (user && !loadMore) {
          const { data: favorites } = await supabase
            .from("user_favorites")
            .select("gist_id")
            .eq("user_id", user.id);
          
          if (favorites) {
            setBookmarkedGists(favorites.map(f => f.gist_id));
          }
        }

        // Load news from followed entities
        if (user) {
          const { data: follows } = await supabase
            .from("fan_follows")
            .select("entity_id")
            .eq("user_id", user.id);

          if (follows && follows.length > 0) {
            const entityIds = follows.map(f => f.entity_id);
            const { data: entities } = await supabase
              .from("fan_entities")
              .select("id, name, category, news_feed, background_url")
              .in("id", entityIds);

            if (entities) {
              const allNews: NewsItem[] = [];
              entities.forEach(entity => {
                if (entity.news_feed && Array.isArray(entity.news_feed)) {
                  entity.news_feed.slice(0, 3).forEach((news: any, idx: number) => {
                    allNews.push({
                      id: `news-${entity.id}-${idx}`,
                      title: news.title,
                      source: news.source,
                      time: news.time || '1h ago',
                      description: news.description || `Latest news about ${entity.name}`,
                      url: news.url,
                      image: news.image || entity.background_url,
                      category: entity.category,
                      entityName: entity.name,
                      entityId: entity.id
                    });
                  });
                }
              });
              setNewsItems(allNews);
            }
          }
        }
      } catch (error) {
        console.error("Error loading gists:", error);
        toast.error("Failed to load feed");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
        if (showToast) {
          setIsRefreshing(false);
          toast.success("Feed refreshed!");
        }
      }
    };

  useEffect(() => {
    loadGists();

    // Set up realtime subscription for new gists
    const channel = supabase
      .channel('gists-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gists',
          filter: 'status=eq.published'
        },
        (payload) => {
          console.log('New gist published:', payload);
          setNewGistCount(prev => prev + 1);
          toast.info('New content available! Click refresh to see it.');
        }
      )
      .subscribe();

    // Set up intersection observer for infinite scroll
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadGists(false, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      supabase.removeChannel(channel);
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [selectedTab, hasMore, isLoadingMore, loading]);

  const handlePlay = async (gistId: string, audioUrl: string) => {
    if (currentPlayingId === gistId && isPlaying) {
      // Pause current
      if (currentAudio.current) {
        currentAudio.current.pause();
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
    } else {
      // Stop previous and play new
      if (currentAudio.current) {
        currentAudio.current.pause();
      }
      
      const audio = new Audio(audioUrl);
      currentAudio.current = audio;
      audio.play();
      setIsPlaying(true);
      setCurrentPlayingId(gistId);

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentPlayingId(null);
      };
    }
  };

  const handleLike = (gistId: string) => {
    setLikedGists(prev => 
      prev.includes(gistId) ? prev.filter(id => id !== gistId) : [...prev, gistId]
    );
  };

  const handleBookmark = async (gistId: string) => {
    await fluxaMemory.toggleFavorite(gistId);
    setBookmarkedGists(prev => 
      prev.includes(gistId) ? prev.filter(id => id !== gistId) : [...prev, gistId]
    );
  };

  const handleTellMore = (gist: Gist) => {
    setChatContext({
      topic: gist.headline,
      summary: gist.context
    });
  };

  const handleShare = (gist: Gist) => {
    setSelectedGist(gist);
    setShareDialogOpen(true);
  };

  // Search and filter gists
  const filteredGists: Gist[] = React.useMemo(() => {
    let filtered = gists;
    
    // Bookmarks tab - show only bookmarked gists
    if (selectedTab === "bookmarks") {
      filtered = filtered.filter(g => bookmarkedGists.includes(g.id));
    }
    
    // Category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(g => 
        g.topic_category?.toLowerCase().includes(selectedCategory.toLowerCase()) || 
        g.topic.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.headline?.toLowerCase().includes(query) ||
        g.context?.toLowerCase().includes(query) ||
        g.topic?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [gists, selectedCategory, searchQuery, selectedTab, bookmarkedGists]);

  const filteredNews: NewsItem[] = selectedCategory === "All"
    ? newsItems
    : newsItems.filter(n => n.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  // Combine and sort by time
  const combinedFeed = [
    ...filteredGists.map(g => ({ type: 'gist' as const, data: g })),
    ...filteredNews.map(n => ({ type: 'news' as const, data: n }))
  ];

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === 0) return;
    
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartY.current;
    
    if (distance > 0 && distance < 150) {
      setIsPulling(true);
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      setIsRefreshing(true);
      await loadGists(true);
      setIsRefreshing(false);
    }
    
    setIsPulling(false);
    setPullDistance(0);
    touchStartY.current = 0;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen ios-background text-foreground">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading your personalized feed...</p>
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen ios-background pb-36 animate-fade-in overflow-y-auto ios-scroll"
    >
      {/* Pull-to-refresh indicator */}
      {isPulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 transition-all duration-200"
          style={{ 
            transform: `translate(-50%, ${Math.min(pullDistance - 20, 80)}px)`,
            opacity: Math.min(pullDistance / 80, 1)
          }}
        >
          <div className="ios-card px-4 py-3 rounded-full shadow-xl">
            <div
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
              style={{ animationDuration: pullDistance > 80 ? '0.6s' : '1.2s' }}
            />
          </div>
        </div>
      )}

      {/* Header - Reference Style */}
      <div className="sticky top-0 z-50 ios-header">
        <div className="flex items-center justify-between gap-3 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {/* Left: Profile Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl border border-white/50 flex-shrink-0 transition-transform hover:scale-105">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 ios-card p-2 rounded-3xl border-none">
              <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-2xl cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-2xl cursor-pointer">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleDarkMode} className="rounded-2xl cursor-pointer">
                {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/40" />
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
                className="rounded-2xl cursor-pointer text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Center: Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="glass-light"
                className="rounded-full px-4 py-2 h-10 flex items-center gap-2 flex-1 max-w-[160px] transition-transform hover:scale-105 bg-white/60"
              >
                <span className="text-sm font-medium truncate">{activeTab}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48 ios-card p-2 rounded-3xl border-none">
              <DropdownMenuItem onClick={() => setActiveTab("All Updates")} className="rounded-2xl cursor-pointer">
                All Updates
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("Following")} className="rounded-2xl cursor-pointer">
                Following
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("Trending")} className="rounded-2xl cursor-pointer">
                Trending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab("Saved")} className="rounded-2xl cursor-pointer">
                Saved
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Right: Icon Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationCenter />
            <Button
              variant="glass-light"
              size="icon"
              className="w-10 h-10 rounded-full transition-transform hover:scale-105 bg-white/60"
              onClick={() => navigate("/fluxa-mode")}
            >
              <MessageSquare className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Filter Tags */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-3">
            {viewTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedTab(tab.value)}
                className={cn(
                  "ios-pill text-sm px-5 py-2",
                  selectedTab === tab.value ? "ios-pill-active text-white" : "ios-pill-idle bg-white/70"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => {
              setNewGistCount(0);
              loadGists(true);
            }}
            variant="glass-light"
            className="md:ml-auto relative border-white/60 bg-white/70 text-foreground"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh
                {newGistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {newGistCount}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>

        {/* Header Banner */}
        <div className="ios-hero relative overflow-hidden text-foreground">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br from-blue-500/40 to-purple-500/40 blur-3xl" />
          <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/40 border border-white/60 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-[0.35em]">Now streaming</p>
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                  {selectedTab === "foryou"
                    ? "Your Personalized Feed"
                    : selectedTab === "bookmarks"
                    ? "Saved Gists"
                    : "All Content"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <NotificationCenter />
              </div>
              <button
                onClick={() => {
                  const firstGist = filteredGists[0];
                  if (firstGist) handlePlay(firstGist.id, firstGist.audio_url);
                }}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl border border-white/40 flex items-center justify-center transition-transform hover:scale-105"
                aria-label="Play latest gist"
              >
                <Play className="w-7 h-7 md:w-8 md:h-8" />
              </button>
            </div>
          </div>
          <p className="text-base md:text-lg text-foreground/70 mt-4 relative z-10 max-w-3xl">
            {selectedTab === "foryou"
              ? "Content curated based on your interests. Tap play to hear the highlights instantly."
              : selectedTab === "bookmarks"
              ? "Your saved gists, always within reach for offline listening."
              : "Explore every story in the universe with Fluxa's sonic briefing."}
          </p>
        </div>

        {/* Search and Filters */}
        <div className="ios-panel flex flex-col md:flex-row gap-4 items-stretch animate-fade-in">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search gists by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 rounded-full bg-white/70 border border-white/60 text-base shadow-inner"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium gap-1 rounded-full bg-white/70 hover:bg-white"
                >
                  {platforms.find(p => p.name === selectedPlatform)?.name === "X" ? (
                    <span className="text-base font-bold">𝕏</span>
                  ) : (
                    (() => {
                      const Icon = platforms.find(p => p.name === selectedPlatform)?.icon;
                      return Icon && typeof Icon !== 'string' ? <Icon className="w-4 h-4" /> : null;
                    })()
                  )}
                  <span>{selectedPlatform}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 ios-card rounded-3xl border-none">
                <div className="space-y-1">
                  {platforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => setSelectedPlatform(platform.name)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-2xl text-sm transition-colors",
                        selectedPlatform === platform.name
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-white/60"
                      )}
                    >
                      {platform.name === "X" ? (
                        <span className="text-lg font-bold">𝕏</span>
                      ) : (
                        (() => {
                          const Icon = platform.icon;
                          return typeof Icon !== 'string' ? <Icon className="w-4 h-4" /> : null;
                        })()
                      )}
                      <span>{platform.name}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Button variant="glass-light" className="bg-white/70 border-white/60 text-foreground rounded-full h-14">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-3 overflow-x-auto pb-2 mb-4 animate-fade-in" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "ios-pill text-sm px-5 py-2 flex-shrink-0",
                selectedCategory === category ? "ios-pill-active text-white" : "ios-pill-idle bg-white/70"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Trending Carousel */}
        {trendingGists.length > 0 && !searchQuery && selectedTab !== "bookmarks" && (
          <TrendingCarousel 
            gists={trendingGists}
            onPlay={handlePlay}
            currentPlayingId={currentPlayingId}
          />
        )}

        {/* Personalized Recommendations */}
        {recommendedGists.length > 0 && !searchQuery && selectedTab === "foryou" && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-bold">Recommended for You</h2>
              <Badge variant="secondary" className="ml-auto">
                Based on your history
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedGists.map((gist) => (
                <Card
                  key={gist.id}
                  className="cursor-pointer ios-card ios-card--interactive"
                  onClick={() => handlePlay(gist.id, gist.audio_url)}
                >
                  {gist.image_url && (
                    <img
                      src={gist.image_url}
                      alt={gist.headline}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2">{gist.headline}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{gist.context}</p>
                    <Badge variant="secondary" className="mt-2 text-xs rounded-full px-3 py-1">
                      {gist.topic}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Feed Grid */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Main Feed */}
          <div className="space-y-6">
            {combinedFeed.length === 0 ? (
              <Card className="ios-card p-12 text-center">
                <p className="text-muted-foreground mb-4">No content available yet</p>
                <Button onClick={() => window.location.href = '/admin'}>
                  Go to Admin Panel
                </Button>
              </Card>
            ) : (
              combinedFeed.map((item, idx) => 
                item.type === 'gist' ? (
                  <FeedCardWithSocial
                    key={`gist-${item.data.id}`}
                    id={item.data.id}
                    imageUrl={item.data.image_url || undefined}
                    headline={searchQuery ? highlightText(item.data.headline, searchQuery) as any : item.data.headline}
                    context={searchQuery ? highlightText(item.data.context, searchQuery) as any : item.data.context}
                    author="Fluxa"
                    timeAgo="2h ago"
                    category={item.data.topic}
                    readTime="5 min"
                    comments={item.data.analytics?.comments || 0}
                    views={item.data.analytics?.views || 0}
                    plays={item.data.analytics?.plays || 0}
                    shares={item.data.analytics?.shares || 0}
                    isPlaying={currentPlayingId === item.data.id && isPlaying}
                    onPlay={() => handlePlay(item.data.id, item.data.audio_url)}
                    onComment={() => handleTellMore(item.data)}
                    onShare={() => handleShare(item.data)}
                  />
                ) : (
                  <NewsCard
                    key={`news-${item.data.id}`}
                    id={item.data.id}
                    title={item.data.title}
                    source={item.data.source}
                    time={item.data.time}
                    description={item.data.description}
                    url={item.data.url}
                    imageUrl={item.data.image}
                    category={item.data.category}
                    entityName={item.data.entityName}
                    isPlaying={currentPlayingNewsId === item.data.id && isNewsPlaying}
                    isLiked={likedGists.includes(item.data.id)}
                    isBookmarked={bookmarkedGists.includes(item.data.id)}
                    onPlay={async (audioUrl?: string) => {
                      if (currentPlayingNewsId === item.data.id && isNewsPlaying) {
                        newsAudioRef.current?.pause();
                        setIsNewsPlaying(false);
                        setCurrentPlayingNewsId(null);
                      } else {
                        if (newsAudioRef.current) {
                          newsAudioRef.current.pause();
                        }
                        
                        if (audioUrl) {
                          const audio = new Audio(audioUrl);
                          newsAudioRef.current = audio;
                          audio.play();
                          setIsNewsPlaying(true);
                          setCurrentPlayingNewsId(item.data.id);

                          audio.onended = () => {
                            setIsNewsPlaying(false);
                            setCurrentPlayingNewsId(null);
                          };
                        } else {
                          toast.error('Audio not available');
                        }
                      }
                    }}
                    onLike={() => handleLike(item.data.id)}
                    onComment={() => toast.info('Discussion coming soon!')}
                    onBookmark={() => handleBookmark(item.data.id)}
                    onShare={() => {
                      if (item.data.url) {
                        navigator.clipboard.writeText(item.data.url);
                        toast.success('Link copied!');
                      }
                    }}
                  />
                )
              )
            )}
            
            {/* Infinite Scroll Trigger */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isLoadingMore && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Loading more gists...
                </div>
              )}
              {!hasMore && gists.length > 0 && (
                <p className="text-muted-foreground text-sm">You've reached the end!</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Trending Topics */}
              <Card className="ios-card">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Trending Topics</h3>
                  </div>
                  <div className="space-y-3">
                    {[
                      { topic: "AI Revolution", posts: "1.2k posts" },
                      { topic: "Audio Content", posts: "856 posts" },
                      { topic: "Digital Wellness", posts: "643 posts" },
                      { topic: "Voice Tech", posts: "521 posts" },
                      { topic: "Productivity", posts: "412 posts" },
                    ].map((item, i) => (
                      <div
                       key={i}
                        className="p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 cursor-pointer transition-colors"
                      >
                        <p className="text-sm font-medium">{item.topic}</p>
                        <p className="text-xs text-muted-foreground">{item.posts}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User Stats */}
              <Card className="ios-card bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Your Activity</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-blue-100">Articles Read</p>
                      <p className="text-2xl font-bold">247</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-100">Hours Listened</p>
                      <p className="text-2xl font-bold">18.5</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-100">Bookmarks</p>
                      <p className="text-2xl font-bold">{bookmarkedGists.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
      <FloatingActionButtons />

      {/* Share Dialog */}
      {selectedGist && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          gist={selectedGist}
        />
      )}
    </div>
  );
};

export default Feed;
