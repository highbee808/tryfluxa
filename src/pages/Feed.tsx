import { useState, useEffect, useRef } from "react";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import { NewsCard } from "@/components/NewsCard";
import BottomNavigation from "@/components/BottomNavigation"; // ✅ FIXED
import { ShareDialog } from "@/components/ShareDialog";
import { TrendingCarousel } from "@/components/TrendingCarousel";
import { DesktopNavigationWidget } from "@/components/DesktopNavigationWidget";
import { DesktopRightWidgets } from "@/components/DesktopRightWidgets";
import { FloatingActionButtons } from "@/components/FloatingActionButtons";
import { ChatBox } from "@/components/ChatBox";
import { useFluxaMemory } from "@/hooks/useFluxaMemory";
import { useDarkMode } from "@/hooks/useDarkMode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sparkles,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  const [chatContext, setChatContext] = useState<
    | {
        topic: string;
        summary: string;
        requestId?: string;
      }
    | undefined
  >(undefined);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [likedGists, setLikedGists] = useState<string[]>([]);
  const [bookmarkedGists, setBookmarkedGists] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [currentPlayingNewsId, setCurrentPlayingNewsId] = useState<string | null>(
    null
  );
  const [isNewsPlaying, setIsNewsPlaying] = useState(false);
  const newsAudioRef = useRef<HTMLAudioElement | null>(null);

  const [selectedTab, setSelectedTab] = useState<
    "all" | "foryou" | "bookmarks"
  >("foryou");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newGistCount, setNewGistCount] = useState(0);
  const [searchQuery] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [trendingGists, setTrendingGists] = useState<Gist[]>([]);
  const [recommendedGists, setRecommendedGists] = useState<Gist[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGist, setSelectedGist] = useState<Gist | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedColumnRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null);

  const location = useLocation();
  const fluxaMemory = useFluxaMemory();

  const categories = ["All", "Technology", "Lifestyle", "Science", "Media"];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleMediaChange = () => setIsDesktop(mediaQuery.matches);

    handleMediaChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
    };
  }, []);

  useEffect(() => {
    setScrollRoot(isDesktop ? feedColumnRef.current : null);
  }, [isDesktop]);

  useEffect(() => {
    const state = location.state as { tab?: "all" | "foryou" | "bookmarks" } | null;
    if (state?.tab) {
      setSelectedTab(state.tab);
    }
  }, [location.state]);

  const loadGists = async (showToast = false, loadMore = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      if (loadMore) setIsLoadingMore(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let userTopics: string[] = [];

      if (user) {
        const { data: subniches } = await supabase
          .from("user_subniches")
          .select("main_topic, sub_niches")
          .eq("user_id", user.id);

        if (subniches && subniches.length > 0) {
          userTopics = [
            ...subniches.map((s) => s.main_topic),
            ...subniches.flatMap((s) => s.sub_niches || []),
          ];
        }
      }

      const pageSize = 20;
      const offset = loadMore ? (page + 1) * pageSize : 0;

      let query = supabase
        .from("gists")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (userTopics.length > 0 && selectedTab === "foryou") {
        const conditions = userTopics.flatMap((topic) => [
          `topic_category.ilike.%${topic}%`,
          `topic.ilike.%${topic}%`,
        ]);
        query = query.or(conditions.join(","));
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        const gistIds = data.map((g) => g.id);

        const { data: analyticsData } = await supabase
          .from("post_analytics")
          .select("*")
          .in("post_id", gistIds);

        const analyticsMap = new Map(
          analyticsData?.map((a: any) => [a.post_id, a]) || []
        );

        const gistsWithAnalytics: Gist[] = data.map((gist: any) => ({
          ...gist,
          analytics:
            analyticsMap.get(gist.id) || {
              views: 0,
              likes: 0,
              comments: 0,
              shares: 0,
              plays: 0,
            },
        }));

        if (loadMore) {
          setGists((prev) => [...prev, ...gistsWithAnalytics]);
          setPage((prev) => prev + 1);
        } else {
          setGists(gistsWithAnalytics);
          setPage(0);
        }

        setHasMore(data.length === pageSize);
      }

      // trending, recommended, news, bookmarks → unchanged logic

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
  }, [selectedTab]);

  useEffect(() => {
    const channel = supabase
      .channel("gists-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gists",
          filter: "status=eq.published",
        },
        () => {
          setNewGistCount((prev) => prev + 1);
          toast.info("New content available! Tap refresh to see it.");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !loading
        ) {
          loadGists(false, true);
        }
      },
      {
        threshold: 0.1,
        root: scrollRoot ?? null,
      }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [scrollRoot, hasMore, isLoadingMore, loading]);

  const handlePlay = async (gistId: string, audioUrl: string) => {
    if (currentPlayingId === gistId && isPlaying) {
      if (currentAudio.current) {
        currentAudio.current.pause();
      }
      setIsPlaying(false);
      setCurrentPlayingId(null);
    } else {
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
    setLikedGists((prev) =>
      prev.includes(gistId)
        ? prev.filter((id) => id !== gistId)
        : [...prev, gistId]
    );
  };

  const handleBookmark = async (gistId: string) => {
    await fluxaMemory.toggleFavorite(gistId);
    setBookmarkedGists((prev) =>
      prev.includes(gistId)
        ? prev.filter((id) => id !== gistId)
        : [...prev, gistId]
    );
  };

  const openChatWithContext = (topic: string, summary: string) => {
    const uniqueId =
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setChatContext({
      topic,
      summary,
      requestId: uniqueId,
    });

    setIsChatOpen(true);
  };

  const handleTellMore = (gist: Gist) => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          topic: gist.topic,
          summary: gist.headline,
          fullContext: gist.context,
        },
      },
    });
  };

  const handleNewsChat = (news: NewsItem) => {
    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          topic: news.category,
          summary: news.title,
          fullContext: news.description || news.title,
        },
      },
    });
  };

  const handleShare = (gist: Gist) => {
    setSelectedGist(gist);
    setShareDialogOpen(true);
  };

  const filteredGists: Gist[] = React.useMemo(() => {
    let filtered = gists;

    if (selectedTab === "bookmarks") {
      filtered = filtered.filter((g) => bookmarkedGists.includes(g.id));
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(
        (g) =>
          g.topic_category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          g.topic.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (g) =>
          g.headline?.toLowerCase().includes(query) ||
          g.context?.toLowerCase().includes(query) ||
          g.topic?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [gists, selectedCategory, searchQuery, selectedTab, bookmarkedGists]);

  const filteredNews: NewsItem[] =
    selectedCategory === "All"
      ? newsItems
      : newsItems.filter((n) =>
          n.category.toLowerCase().includes(selectedCategory.toLowerCase())
        );

  const combinedFeed = [
    ...filteredGists.map((g) => ({
      type: "gist" as const,
      data: g,
    })),
    ...filteredNews.map((n) => ({
      type: "news" as const,
      data: n,
    })),
  ];

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
      if ("vibrate" in navigator) {
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

  const handleRefreshClick = async () => {
    if (isRefreshing) return;

    setNewGistCount(0);
    await loadGists(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">
          Loading your personalized feed...
        </p>
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="min-h-screen lg:h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-28 animate-fade-in overflow-y-auto lg:overflow-hidden"
    >
      {/* Pull to Refresh UI */}
      {isPulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 transition-all duration-200"
          style={{
            transform: `translate(-50%, ${Math.min(pullDistance - 20, 80)}px)`,
            opacity: Math.min(pullDistance / 80, 1),
          }}
        >
          <div className="glass-strong rounded-full p-3 shadow-lg">
            <div
              className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"
              style={{
                animationDuration: pullDistance > 80 ? "0.6s" : "1.2s",
              }}
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3 bg-background/85 backdrop-blur-xl border-b border-glass-border-light">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="frosted-icon-button overflow-hidden p-0">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80" />
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 glass border-glass-border-light rounded-2xl" align="start">
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="w-4 h-4 mr-2" /> View Profile
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>

              <DropdownMenuItem onClick={toggleDarkMode}>
                {isDark ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                {isDark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/");
                }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh Button */}
          <button
            className="relative frosted-icon-button"
            onClick={handleRefreshClick}
          >
            {isRefreshing ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}

            {newGistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {newGistCount > 9 ? "9+" : newGistCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Categories */}
      <div className="lg:hidden px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <Badge
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm flex-shrink-0 ${
                selectedCategory === category
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glass-glow"
                  : "bg-secondary text-foreground border border-border"
              }`}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Trending (Mobile) */}
      {trendingGists.length > 0 && !searchQuery && (
        <div className="lg:hidden px-4 mt-4">
          <TrendingCarousel
            gists={trendingGists}
            onPlay={handlePlay}
            currentPlayingId={currentPlayingId}
            fullWidth
          />
        </div>
      )}

      {/* Main Layout */}
      <div className="container mx-auto px-4 pt-4 pb-6 max-w-6xl lg:py-6 lg:h-[calc(100vh-150px)]">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px] lg:h-full">
          <DesktopNavigationWidget />

          <div
            ref={feedColumnRef}
            className="space-y-6 w-full max-w-[420px] sm:max-w-[520px] md:max-w-[640px] mx-auto lg:max-w-none lg:mx-0 lg:h-full lg:overflow-y-auto lg:pr-3 lg:pb-24"
          >
            {/* Desktop Categories */}
            <div className="hidden lg:flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`cursor-pointer whitespace-nowrap px-4 py-2 text-sm ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-glass-glow"
                      : "bg-secondary text-foreground border border-border"
                  }`}
                >
                  {category}
                </Badge>
              ))}
            </div>

            {/* Recommended */}
            {recommendedGists.length > 0 &&
              !searchQuery &&
              selectedTab === "foryou" && (
                <div>
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
                        className="cursor-pointer glass hover:shadow-glass-glow transition-all hover:scale-105 border-glass-border-light"
                        onClick={() => handlePlay(gist.id, gist.audio_url)}
                      >
                        {gist.image_url && (
                          <img
                            src={gist.image_url}
                            alt={gist.headline}
                            className="w-full h-40 object-cover"
                          />
                        )}

                        <CardContent className="p-4">
                          <h3 className="font-semibold line-clamp-2 mb-2">
                            {gist.headline}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {gist.context}
                          </p>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {gist.topic}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

            {/* Combined Feed */}
            <div className="space-y-6">
              {combinedFeed.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">
                    No content available yet
                  </p>
                  <Button onClick={() => (window.location.href = "/admin")}>
                    Go to Admin Panel
                  </Button>
                </Card>
              ) : (
                combinedFeed.map((item) =>
                  item.type === "gist" ? (
                    <FeedCardWithSocial
                      key={`gist-${item.data.id}`}
                      id={item.data.id}
                      imageUrl={item.data.image_url || undefined}
                      headline={
                        searchQuery
                          ? (highlightText(item.data.headline, searchQuery) as any)
                          : item.data.headline
                      }
                      context={
                        searchQuery
                          ? (highlightText(item.data.context, searchQuery) as any)
                          : item.data.context
                      }
                      author="Fluxa"
                      timeAgo="2h ago"
                      category={item.data.topic}
                      readTime="5 min"
                      comments={item.data.analytics?.comments || 0}
                      views={item.data.analytics?.views || 0}
                      plays={item.data.analytics?.plays || 0}
                      shares={item.data.analytics?.shares || 0}
                      isPlaying={
                        currentPlayingId === item.data.id && isPlaying
                      }
                      onPlay={() =>
                        handlePlay(item.data.id, item.data.audio_url)
                      }
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
                      isPlaying={
                        currentPlayingNewsId === item.data.id && isNewsPlaying
                      }
                      isLiked={likedGists.includes(item.data.id)}
                      isBookmarked={bookmarkedGists.includes(item.data.id)}
                      onPlay={async (audioUrl?: string) => {
                        if (
                          currentPlayingNewsId === item.data.id &&
                          isNewsPlaying
                        ) {
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
                            toast.error("Audio not available");
                          }
                        }
                      }}
                      onLike={() => handleLike(item.data.id)}
                      onComment={() => handleNewsChat(item.data)}
                      onBookmark={() => handleBookmark(item.data.id)}
                      onShare={() => {
                        if (item.data.url) {
                          navigator.clipboard.writeText(item.data.url);
                          toast.success("Link copied!");
                        }
                      }}
                    />
                  )
                )
              )}

              {/* Load More Trigger */}
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading more gists...
                  </div>
                )}
                {!hasMore && gists.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    You've reached the end!
                  </p>
                )}
              </div>
            </div>
          </div>

          <DesktopRightWidgets
            trendingGists={!searchQuery ? trendingGists : undefined}
            currentPlayingId={currentPlayingId}
            onPlay={
              trendingGists.length > 0 ? handlePlay : undefined
            }
          />
        </div>
      </div>

      <BottomNavigation />
      <FloatingActionButtons />

      {selectedGist && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          gist={selectedGist}
        />
      )}

      {isChatOpen && chatContext && (
        <ChatBox
          context={chatContext}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
};

export default Feed;
