// FEED.TSX — Version A (NO audio in feed cards, fully cleaned)

import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import { NewsCard } from "@/components/NewsCard";
import { BottomNavigation } from "@/components/BottomNavigation";
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
import { highlightText } from "@/lib/highlightText";

// ONLY UI icons (no audio icons)
import {
  Sparkles,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
} from "lucide-react";

import type { User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

interface Gist {
  id: string;
  headline: string;
  context: string;
  image_url: string | null;
  topic: string;
  topic_category: string | null;
  published_at?: string;
  script?: string | null;
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
  const location = useLocation();

  // dark mode
  const { isDark, toggleDarkMode } = useDarkMode();

  // user
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  // feed data
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);

  // saved interactions
  const [likedGists, setLikedGists] = useState<string[]>([]);
  const [bookmarkedGists, setBookmarkedGists] = useState<string[]>([]);

  // filtering
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTab, setSelectedTab] = useState<"all" | "foryou" | "bookmarks">(
    "foryou"
  );
  const [searchQuery] = useState("");

  // loading more
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // trending & recommendations
  const [trendingGists, setTrendingGists] = useState<Gist[]>([]);
  const [recommendedGists, setRecommendedGists] = useState<Gist[]>([]);

  // news
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  // pull to refresh
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newGistCount, setNewGistCount] = useState(0);

  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // scroll root for desktop
  const [isDesktop, setIsDesktop] = useState(false);
  const [scrollRoot, setScrollRoot] = useState<Element | null>(null);
  const feedColumnRef = useRef<HTMLDivElement>(null);

  // Memory hook
  const fluxaMemory = useFluxaMemory();

  // Share dialog
  const [selectedGist, setSelectedGist] = useState<Gist | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const categories = ["All", "Technology", "Lifestyle", "Science", "Media"];

  // detect desktop for scroll root
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setScrollRoot(isDesktop ? feedColumnRef.current : null);
  }, [isDesktop]);

  // handle navigation state (bookmarks tab)
  useEffect(() => {
    const state = location.state as { tab?: "all" | "foryou" | "bookmarks" };
    if (state?.tab) setSelectedTab(state.tab);
  }, [location.state]);

  // load profile
  const loadProfile = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user ?? null;
    setAuthUser(user);

    if (!user) {
      setProfile(null);
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(profileData ?? null);
  }, []);

  useEffect(() => {
    loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;
        setAuthUser(nextUser);
        if (nextUser) loadProfile();
      }
    );
    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  // Load gists
  const loadGists = useCallback(
    async ({ showToast = false, append = false } = {}) => {
      try {
        if (showToast) setIsRefreshing(true);
        if (append) setIsLoadingMore(true);

        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;

        let userTopics: string[] = [];
        if (user) {
          const { data: subniches } = await supabase
            .from("user_subniches")
            .select("main_topic, sub_niches")
            .eq("user_id", user.id);

          if (subniches?.length) {
            userTopics = [
              ...subniches.map((s) => s.main_topic),
              ...subniches.flatMap((s) => s.sub_niches || []),
            ];
          }
        }

        const pageSize = 20;
        const nextPage = append ? pageRef.current + 1 : 0;
        const offset = nextPage * pageSize;

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

        // analytics
        const ids = data.map((g) => g.id);
        const { data: analytics } = await supabase
          .from("post_analytics")
          .select("*")
          .in("post_id", ids);

        const map = new Map(
          analytics?.map((a: any) => [a.post_id, a]) ?? []
        );

        const merged = data.map((g: any) => ({
          ...g,
          analytics: map.get(g.id) || {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            plays: 0,
          },
        }));

        if (append) {
          setGists((prev) => [...prev, ...merged]);
        } else {
          setGists(merged);
        }

        pageRef.current = nextPage;
        setHasMore(data.length === pageSize);

        // trending
        if (!append) {
          const { data: trending } = await supabase
            .from("gists")
            .select("*")
            .eq("status", "published")
            .gte(
              "published_at",
              new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            )
            .order("play_count", { ascending: false })
            .limit(5);

          if (trending) setTrendingGists(trending);
        }

        // Recommended
        if (user) {
          const { data: memory } = await supabase
            .from("fluxa_memory")
            .select("gist_history, favorite_topics")
            .eq("user_id", user.id)
            .maybeSingle();

          if (memory) {
            const historyTopics = Array.isArray(memory.gist_history)
              ? memory.gist_history.map((i: any) => i.topic)
              : [];
            const favoriteTopics = memory.favorite_topics || [];

            const allTopics = [...new Set([...historyTopics, ...favoriteTopics])];

            if (allTopics.length > 0) {
              const conditions = allTopics.flatMap((topic: string) => [
                `topic_category.ilike.%${topic}%`,
                `topic.ilike.%${topic}%`,
              ]);

              const { data: rec } = await supabase
                .from("gists")
                .select("*")
                .eq("status", "published")
                .or(conditions.join(","))
                .order("published_at", { ascending: false })
                .limit(6);

              if (rec) setRecommendedGists(rec);
            }
          }
        }

        // bookmarks
        if (!append && user) {
          const { data: favs } = await supabase
            .from("user_favorites")
            .select("gist_id")
            .eq("user_id", user.id);

          if (favs) setBookmarkedGists(favs.map((f) => f.gist_id));
        }

        // news (fanbase)
        if (user && !append) {
          const { data: follows } = await supabase
            .from("fan_follows")
            .select("entity_id")
            .eq("user_id", user.id);

          if (follows?.length) {
            const ids = follows.map((f) => f.entity_id);
            const { data: entities } = await supabase
              .from("fan_entities")
              .select("id, name, category, news_feed, background_url")
              .in("id", ids);

            const allNews: NewsItem[] = [];

            entities?.forEach((e: any) => {
              e.news_feed?.slice(0, 3).forEach((n: any, idx: number) => {
                allNews.push({
                  id: `news-${e.id}-${idx}`,
                  title: n.title,
                  source: n.source,
                  time: n.time ?? "1h ago",
                  description: n.description ?? `Latest news about ${e.name}`,
                  url: n.url,
                  image: n.image ?? e.background_url,
                  category: e.category,
                  entityName: e.name,
                  entityId: e.id,
                });
              });
            });

            setNewsItems(allNews);
          }
        }
      } catch (e) {
        toast.error("Failed to load feed");
      } finally {
        setLoading(false);
        setIsLoadingMore(false);

        if (showToast) {
          setIsRefreshing(false);
          toast.success("Feed refreshed!");
        }
      }
    },
    [selectedTab]
  );

  useEffect(() => {
    pageRef.current = 0;
    setHasMore(true);
    loadGists();
  }, [loadGists]);

  // real-time updates
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
          setNewGistCount((c) => c + 1);
          toast.info("New content available!");
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (i) => {
        if (i[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadGists({ append: true });
        }
      },
      { threshold: 0.1, root: scrollRoot ?? null }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => el && observer.unobserve(el);
  }, [scrollRoot, hasMore, isLoadingMore, loading, loadGists]);

  // like
  const handleLike = (id: string) => {
    setLikedGists((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // bookmark
  const handleBookmark = async (id: string) => {
    await fluxaMemory.toggleFavorite(id);
    setBookmarkedGists((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleShare = (g: Gist) => {
    setSelectedGist(g);
    setShareDialogOpen(true);
  };

  // Pull to Refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === 0) return;
    const dist = e.touches[0].clientY - touchStartY.current;
    if (dist > 0 && dist < 150) {
      setIsPulling(true);
      setPullDistance(dist);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 80) {
      navigator.vibrate?.(50);
      setIsRefreshing(true);
      await loadGists({ showToast: true });
    }
    setIsPulling(false);
    setPullDistance(0);
    touchStartY.current = 0;
  };

  const handleRefreshClick = async () => {
    if (isRefreshing) return;
    setNewGistCount(0);
    await loadGists({ showToast: true });
  };

  // build combined feed
  const filteredGists = React.useMemo(() => {
    let f = gists;

    if (selectedTab === "bookmarks") {
      f = f.filter((g) => bookmarkedGists.includes(g.id));
    }

    if (selectedCategory !== "All") {
      f = f.filter(
        (g) =>
          g.topic_category?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
          g.topic.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      f = f.filter(
        (g) =>
          g.headline?.toLowerCase().includes(q) ||
          g.context?.toLowerCase().includes(q) ||
          g.topic?.toLowerCase().includes(q)
      );
    }

    return f;
  }, [gists, selectedCategory, searchQuery, selectedTab, bookmarkedGists]);

  const filteredNews =
    selectedCategory === "All"
      ? newsItems
      : newsItems.filter((n) =>
          n.category.toLowerCase().includes(selectedCategory.toLowerCase())
        );

  const combinedFeed = [
    ...filteredGists.map((g) => ({ type: "gist" as const, data: g })),
    ...filteredNews.map((n) => ({ type: "news" as const, data: n })),
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
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
      className="min-h-screen pb-28 overflow-y-auto lg:overflow-hidden animate-fade-in"
    >
      {/* Pull Refresh Indicator */}
      {isPulling && (
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
          style={{
            transform: `translate(-50%, ${Math.min(pullDistance - 20, 80)}px)`,
            opacity: Math.min(pullDistance / 80, 1),
          }}
        >
          <div className="glass-strong rounded-full p-3 shadow-lg">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3 bg-background/85 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          {/* Avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/profile")}
              className="rounded-full overflow-hidden w-10 h-10"
            >
              <img
                src={
                  profile?.avatar_url ||
                  authUser?.user_metadata?.avatar_url ||
                  "https://api.dicebear.com/7.x/thumbs/svg?seed=fluxa"
                }
                className="w-full h-full object-cover"
              />
            </button>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-2">
            <button
              className="frosted-icon-button relative"
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
      </div>

      {/* Mobile Categories */}
      <div className="lg:hidden px-4 pt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <Badge
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`cursor-pointer px-4 py-2 text-sm ${
              selectedCategory === c
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow"
                : "bg-secondary text-foreground border"
            }`}
          >
            {c}
          </Badge>
        ))}
      </div>

      {/* Mobile Trending */}
      {trendingGists.length > 0 && !searchQuery && (
        <div className="lg:hidden px-4 mt-4">
          <TrendingCarousel gists={trendingGists} fullWidth />
        </div>
      )}

      {/* Layout */}
      <div className="container mx-auto px-4 pt-4 pb-6 max-w-6xl lg:py-6 lg:h-[calc(100vh-150px)]">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px] items-start lg:h-full">
          {/* Left rail */}
          <DesktopNavigationWidget />

          {/* Main Column */}
          <div
            ref={feedColumnRef}
            className="space-y-6 w-full max-w-2xl mx-auto lg:mx-0 lg:h-full lg:overflow-y-auto lg:pr-3 lg:pb-24"
          >
            {/* Desktop Categories */}
            <div className="hidden lg:flex flex-wrap gap-2">
              {categories.map((c) => (
                <Badge
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`cursor-pointer px-4 py-2 text-sm ${
                    selectedCategory === c
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow"
                      : "bg-secondary text-foreground border"
                  }`}
                >
                  {c}
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
                    {recommendedGists.map((g) => (
                      <Card
                        key={g.id}
                        className="cursor-pointer glass hover:shadow-lg transition-all hover:scale-[1.02]"
                        onClick={() => navigate(`/post/${g.id}`)}
                      >
                        {g.image_url && (
                          <img
                            src={g.image_url}
                            className="w-full h-40 object-cover"
                          />
                        )}
                        <CardContent className="p-4">
                          <h3 className="font-semibold line-clamp-2 mb-2">
                            {g.headline}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {g.context}
                          </p>
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {g.topic}
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
                      key={item.data.id}
                      id={item.data.id}
                      imageUrl={item.data.image_url || undefined}
                      headline={
                        searchQuery
                          ? (highlightText(
                              item.data.headline,
                              searchQuery
                            ) as any)
                          : item.data.headline
                      }
                      context={
                        searchQuery
                          ? (highlightText(
                              item.data.context,
                              searchQuery
                            ) as any)
                          : item.data.context
                      }
                      author="Fluxa"
                      timeAgo="2h ago"
                      category={item.data.topic}
                      readTime="5 min"
                      comments={item.data.analytics?.comments || 0}
                      views={item.data.analytics?.views || 0}
                      shares={item.data.analytics?.shares || 0}
                      onShare={() => handleShare(item.data)}
                    />
                  ) : (
                    <NewsCard
                      key={item.data.id}
                      id={item.data.id}
                      title={item.data.title}
                      source={item.data.source}
                      time={item.data.time}
                      description={item.data.description}
                      url={item.data.url}
                      imageUrl={item.data.image}
                      category={item.data.category}
                      entityName={item.data.entityName}
                      isLiked={likedGists.includes(item.data.id)}
                      isBookmarked={bookmarkedGists.includes(item.data.id)}
                      onLike={() => handleLike(item.data.id)}
                      onBookmark={() => handleBookmark(item.data.id)}
                      onShare={() => {
                        if (item.data.url) {
                          navigator.clipboard.writeText(item.data.url);
                          toast.success("Link copied!");
                        }
                      }}
                      onCardClick={() => navigate(`/post/${item.data.id}`)}
                    />
                  )
                )
              )}

              {/* Infinite Scroll */}
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Loading more gists...
                  </div>
                )}
                {!hasMore && gists.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    You’ve reached the end!
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right rail */}
          <DesktopRightWidgets trendingGists={!searchQuery ? trendingGists : undefined} />
        </div>
      </div>

      {/* Bottom Nav + Floating Buttons */}
      <BottomNavigation />
      <FloatingActionButtons />

      {selectedGist && (
        <ShareDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          gist={selectedGist}
        />
      )}

      {/* Floating Chat */}
      <ChatBox />
    </div>
  );
};

export default Feed;
