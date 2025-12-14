console.log("CURSOR SYNC TEST", new Date().toISOString());
import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import BottomNavigation from "@/components/BottomNavigation"; // ✅ FIXED
import { ShareDialog } from "@/components/ShareDialog";
import { sharePost } from "@/lib/shareUtils";
import { buildAskFluxaPrompt } from "@/lib/fluxaPrompt";
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
import { getApiBaseUrl, getDefaultHeaders } from "@/lib/apiConfig";
import { fetchRecentGists, type DbGist } from "@/lib/feedData";

type ContentCategory = "news" | "sports" | "music";

interface FetchContentItem {
  id: string;
  category: ContentCategory;
  query: string;
  title: string;
  url: string;
  image_url?: string | null;
  summary?: string | null;
  published_at?: string | null;
  views_count?: number | null;
  comments_count?: number | null;
}

interface FetchContentResponse {
  source: string;
  items: FetchContentItem[];
}

interface Gist {
  id: string;
  source: "gist" | "news";
  headline: string;
  summary?: string; // Short version for Feed cards
  context: string; // Full version for PostDetail
  audio_url?: string | null;
  image_url: string | null;
  source_image_url?: string | null;
  ai_image_url?: string | null;
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

const DEFAULT_CATEGORY_TABS = ["All", "News", "Sports", "Music"] as const;

const DEFAULT_CATEGORY_QUERIES: Record<ContentCategory, string> = {
  news: "trending_global",
  sports: "premier_league",
  music: "afrobeats",
};

const DEFAULT_LIMIT = 20;
const DEFAULT_TTL_MINUTES = 60;

const Feed = () => {
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useDarkMode();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
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
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [selectedTab, setSelectedTab] = useState<
    "all" | "foryou" | "bookmarks"
  >("foryou");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newGistCount, setNewGistCount] = useState(0);
  const [searchQuery] = useState("");
  const [trendingGists, setTrendingGists] = useState<Gist[]>([]);
  const [recommendedGists, setRecommendedGists] = useState<Gist[]>([]);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedGist, setSelectedGist] = useState<Gist | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  const feedColumnRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const fluxaMemory = useFluxaMemory();

  const categories = DEFAULT_CATEGORY_TABS;

  useEffect(() => {
    const state = location.state as { tab?: "all" | "foryou" | "bookmarks" } | null;
    if (state?.tab) {
      setSelectedTab(state.tab);
    }
  }, [location.state]);

  const resolveCategoryKey = (label: string): ContentCategory => {
    const normalized = label.toLowerCase();
    if (normalized === "sports") return "sports";
    if (normalized === "music") return "music";
    return "news";
  };

  const formatTimeAgo = (iso?: string | null) => {
    if (!iso) return "Just now";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Just now";

    const diff = Date.now() - date.getTime();
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < hour) {
      const minutes = Math.max(1, Math.floor(diff / minute));
      return `${minutes}m ago`;
    }
    if (diff < day) {
      const hours = Math.max(1, Math.floor(diff / hour));
      return `${hours}h ago`;
    }

    const days = Math.max(1, Math.floor(diff / day));
    return `${days}d ago`;
  };

  /**
   * DATA FLOW DOCUMENTATION:
   * 
   * mapContentItemToGist: Maps API content items to Gist format
   * - Uses item.image_url directly (from fetch-content API)
   * - Uses item.title for headline
   * - Uses item.url for source_url
   * - All fields come from the same item (no mixing)
   * 
   * mapDbGistToGist: Maps database gists to Gist format
   * - Uses gist.headline (or topic as fallback for cron-generated gists)
   * - Uses gist.image_url (fallback image shown if null)
   * - Uses gist.source_url if available
   * - Uses gist.topic and gist.topic_category for categorization
   * - All fields come from the same gist row
   * 
   * Note: Cron-generated gists don't have raw_trend_id, so no join is needed.
   */

  const mapContentItemToGist = (item: FetchContentItem): Gist => ({
    id: item.id,
    source: "news",
    headline: item.title,
    summary: item.summary?.slice(0, 150) + (item.summary && item.summary.length > 150 ? "..." : ""),
    context: item.summary || "Fluxa is still summarizing this gist.",
    audio_url: null,
    image_url: item.image_url || null,
    source_image_url: null,
    ai_image_url: null,
    topic: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    topic_category: item.query,
    published_at: item.published_at || undefined,
    url: item.url,
    analytics: {
      views: item.views_count ?? 0,
      likes: 0,
      comments: item.comments_count ?? 0,
      shares: 0,
      plays: 0,
    },
  });

  const mapDbGistToGist = (gist: DbGist): Gist => {
    // Extract image URLs from meta
    const meta = gist.meta as any;
    const sourceImageUrl = meta?.source_image_url || null;
    const aiImageUrl = meta?.ai_generated_image || null;
    
    // Priority: source image > AI image > fallback to image_url
    // If image_url exists but we have source_image_url in meta, prefer source
    const primaryImageUrl = sourceImageUrl || aiImageUrl || gist.image_url || null;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed.tsx:225',message:'mapDbGistToGist image priority',data:{gistId:gist.id,headline:gist.headline?.substring(0,50),hasSourceImage:!!sourceImageUrl,hasAiImage:!!aiImageUrl,hasImageUrl:!!gist.image_url,primaryImageUrl:primaryImageUrl?.substring(0,50)||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return {
      id: gist.id,
      source: "gist",
      headline: gist.headline,
      summary: meta?.summary || gist.context?.slice(0, 150) + (gist.context && gist.context.length > 150 ? "..." : ""),
      context: gist.context || '',
      audio_url: gist.audio_url || null,
      image_url: primaryImageUrl,
      source_image_url: sourceImageUrl,
      ai_image_url: aiImageUrl,
      topic: gist.topic,
      topic_category: gist.topic_category || null,
      published_at: gist.published_at || gist.created_at || undefined,
      url: gist.source_url || undefined,
      analytics: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        plays: 0,
      },
    };
  };

  const fetchCategoryContent = useCallback(
    async (category: ContentCategory, forceFresh = false) => {
      const API_BASE = getApiBaseUrl();
      
      // Use URL and URLSearchParams to properly encode query parameters
      // Ensure base URL doesn't have trailing slash to avoid double slashes
      const baseUrl = API_BASE.replace(/\/$/, "");
      const urlObj = new URL(`${baseUrl}/fetch-content`);
      
      // All query parameters are automatically URL-encoded by URLSearchParams
      urlObj.searchParams.set("category", category);
      urlObj.searchParams.set("query", DEFAULT_CATEGORY_QUERIES[category]);
      urlObj.searchParams.set("limit", String(DEFAULT_LIMIT));
      
      // If forcing fresh content, set TTL to 0 or add cache-busting parameter
      if (forceFresh) {
        urlObj.searchParams.set("ttl_minutes", "0");
        urlObj.searchParams.set("_t", String(Date.now())); // Cache-busting timestamp
      } else {
        urlObj.searchParams.set("ttl_minutes", String(DEFAULT_TTL_MINUTES));
      }
      
      const url = urlObj.toString();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed.tsx:248',message:'fetchCategoryContent called',data:{category,forceFresh,url:url.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      try {
        const response = await fetch(url, {
          headers: getDefaultHeaders(),
        });
        if (!response.ok) {
          const errorText = await response.text();
          // For 5xx errors, log but don't throw - we'll use fallback
          if (response.status >= 500) {
            console.warn(
              `fetch-content returned ${response.status}, using fallback:`,
              errorText
            );
            return [];
          }
          throw new Error(
            `fetch-content error ${response.status}: ${errorText || "Unknown"}`
          );
        }

        const payload = (await response.json()) as FetchContentResponse;
        if (!payload.items || !Array.isArray(payload.items)) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed.tsx:284',message:'fetchCategoryContent empty response',data:{category,hasItems:!!payload.items,isArray:Array.isArray(payload.items)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return [];
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed.tsx:289',message:'fetchCategoryContent success',data:{category,itemCount:payload.items.length,firstItemId:payload.items[0]?.id,firstItemTitle:payload.items[0]?.title?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        return payload.items;
      } catch (err) {
        console.error("Fluxa API error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn("fetch-content failed, using fallback. Error:", errorMessage);
        // Always return empty array for fallback - loadGists will handle the error display
        return [];
      }
    },
    []
  );

  const loadGists = useCallback(
    async (showToast = false, forceFresh = false) => {
      try {
        if (showToast) setIsRefreshing(true);
        setFeedError(null);
        if (!showToast) setLoading(true);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed.tsx:300',message:'loadGists started',data:{showToast,forceFresh,selectedCategory},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // Determine which categories to fetch based on user interests
        const hasSportsInterest = userInterests.some(i => i.toLowerCase() === "sports");
        const hasMusicInterest = userInterests.some(i => i.toLowerCase() === "music");
        
        let categoriesToFetch: ContentCategory[] = ["news"]; // Always include news
        
        if (selectedCategory === "All") {
          // For "All" tab, only include categories user is interested in
          if (hasSportsInterest) categoriesToFetch.push("sports");
          if (hasMusicInterest) categoriesToFetch.push("music");
        } else {
          // For specific category tabs, always show that category
          const category = resolveCategoryKey(selectedCategory);
          // But if it's sports/music and user doesn't have that interest, still show it (they clicked the tab)
          categoriesToFetch = [category];
        }

        const categoryResponses = await Promise.all(
          categoriesToFetch.map((category) => fetchCategoryContent(category, forceFresh))
        );

        let mergedItems = categoryResponses.flat();
        
        // Filter out sports content if user doesn't have Sports interest (only for "All" tab)
        if (selectedCategory === "All" && !hasSportsInterest) {
          mergedItems = mergedItems.filter(item => item.category !== "sports");
        }

        if (selectedCategory === "All") {
          // For the "All" tab we fetch each category in parallel and then
          // merge/sort by published date so the UI feels consistent.
          mergedItems.sort((a, b) => {
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return dateB - dateA;
          });
        }

        // If fetch-content returned items, use them
        if (mergedItems.length > 0) {
          // Deduplicate by ID and headline to prevent showing duplicate content
          const seenHeadlines = new Set<string>();
          const uniqueItems = mergedItems.filter(item => {
            const key = `${item.id}-${item.title?.toLowerCase().trim()}`;
            if (seenHeadlines.has(key)) return false;
            seenHeadlines.add(key);
            return true;
          });
          setGists(uniqueItems.map(mapContentItemToGist));
          setFeedError(null); // Clear error if we have content
        } else {
          // Fallback: fetch recent gists from database when fetch-content returns empty
          console.log("fetch-content returned no items, falling back to database gists");
          const dbGists = await fetchRecentGists(50); // Increased limit
          if (dbGists.length > 0) {
            // Deduplicate by ID and headline to show unique content
            const seenHeadlines = new Set<string>();
            const hasSportsInterest = userInterests.some(i => i.toLowerCase() === "sports");
            
            const uniqueGists = dbGists.filter(gist => {
              const key = `${gist.id}-${gist.headline?.toLowerCase().trim()}`;
              if (seenHeadlines.has(key)) return false;
              // Also check if we've seen this headline before (different ID but same content)
              const headlineKey = gist.headline?.toLowerCase().trim() || '';
              if (seenHeadlines.has(headlineKey)) return false;
              
              // Filter sports content if user doesn't have Sports interest (only for "All" tab)
              if (selectedCategory === "All" && !hasSportsInterest) {
                const isSports = gist.topic?.toLowerCase().includes('sport') || 
                                 gist.topic_category?.toLowerCase().includes('sport') ||
                                 gist.topic?.toLowerCase() === 'sports';
                if (isSports) return false;
              }
              
              seenHeadlines.add(key);
              seenHeadlines.add(headlineKey);
              return true;
            });
            setGists(uniqueGists.map(mapDbGistToGist));
            setFeedError(null); // Clear error if fallback succeeded
          } else {
            setGists([]);
            // Only set error if both fetch-content and fallback failed
            setFeedError("No content available. Please try again later.");
          }
        }
    } catch (error) {
        console.error("Error loading feed content:", error);
        // Try fallback before showing error
        try {
          const dbGists = await fetchRecentGists(50); // Increased limit
          if (dbGists.length > 0) {
            // Deduplicate by ID and headline to show unique content
            const seenHeadlines = new Set<string>();
            const hasSportsInterest = userInterests.some(i => i.toLowerCase() === "sports");
            
            const uniqueGists = dbGists.filter(gist => {
              const key = `${gist.id}-${gist.headline?.toLowerCase().trim()}`;
              if (seenHeadlines.has(key)) return false;
              // Also check if we've seen this headline before (different ID but same content)
              const headlineKey = gist.headline?.toLowerCase().trim() || '';
              if (seenHeadlines.has(headlineKey)) return false;
              
              // Filter sports content if user doesn't have Sports interest (only for "All" tab)
              if (selectedCategory === "All" && !hasSportsInterest) {
                const isSports = gist.topic?.toLowerCase().includes('sport') || 
                                 gist.topic_category?.toLowerCase().includes('sport') ||
                                 gist.topic?.toLowerCase() === 'sports';
                if (isSports) return false;
              }
              
              seenHeadlines.add(key);
              seenHeadlines.add(headlineKey);
              return true;
            });
            setGists(uniqueGists.map(mapDbGistToGist));
            setFeedError(null); // Fallback succeeded, no error banner
            // Debug flag - set to false to hide cache banner from users
            const SHOW_CACHE_DEBUG = false;
            if (SHOW_CACHE_DEBUG) {
              toast.info("Using cached content while live news is updating");
            }
          } else {
            setGists([]);
            setFeedError(
              error instanceof Error ? error.message : "Failed to load feed content"
            );
            toast.error("Failed to load feed");
          }
        } catch (fallbackError) {
          // Both failed
          setGists([]);
          setFeedError(
            error instanceof Error ? error.message : "Failed to load feed content"
          );
          toast.error("Failed to load feed");
        }
    } finally {
      setLoading(false);
      if (showToast) {
        setIsRefreshing(false);
        toast.success("Feed refreshed!");
      }
    }
    },
    [fetchCategoryContent, selectedCategory, userInterests]
  );

  // Fetch user interests
  useEffect(() => {
    const fetchUserInterests = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback to localStorage
        const stored = localStorage.getItem("fluxaInterests");
        if (stored) {
          try {
            setUserInterests(JSON.parse(stored));
          } catch (e) {
            console.error("Error parsing stored interests:", e);
          }
        }
        return;
      }

      const { data } = await supabase
        .from("user_interests")
        .select("interest")
        .eq("user_id", user.id);

      if (data) {
        const interests = data.map((r) => r.interest);
        setUserInterests(interests);
        // Also update localStorage for consistency
        localStorage.setItem("fluxaInterests", JSON.stringify(interests));
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("fluxaInterests");
        if (stored) {
          try {
            setUserInterests(JSON.parse(stored));
          } catch (e) {
            console.error("Error parsing stored interests:", e);
          }
        }
      }
    };

    fetchUserInterests();
  }, []);

  useEffect(() => {
    loadGists();
  }, [loadGists, selectedTab]);

  // Auto-reload feed every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("🔄 Auto-reloading feed...");
      loadGists(true); // showToast = true
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [loadGists]);

  const handlePlay = async (
    gistId: string,
    audioUrl?: string | null,
    linkUrl?: string
  ) => {
    if (!audioUrl) {
      if (linkUrl) {
        window.open(linkUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.info("Audio not available for this gist yet.");
      }
      return;
    }

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

  const handleCardClick = (gist: Gist) => {
    navigate(`/post/${gist.source}/${gist.id}?origin=feed`);
  };

  const handleCommentClick = (gist: Gist) => {
    navigate(`/post/${gist.source}/${gist.id}?origin=feed`);
  };

  const handleFluxaAnalysis = (gist: Gist) => {
    const prompt = buildAskFluxaPrompt({
      title: gist.headline,
      summary: gist.context,
      category: gist.topic,
    });

    navigate("/fluxa-mode", {
      state: {
        initialContext: {
          prompt: prompt,
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

  const combinedFeed = filteredGists;

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
      // Force fresh content on pull-to-refresh
      await loadGists(true, true);
      setIsRefreshing(false);
    }

    setIsPulling(false);
    setPullDistance(0);
    touchStartY.current = 0;
  };

  const handleRefreshClick = async () => {
    if (isRefreshing) return;

    setNewGistCount(0);
    // Force fresh content by bypassing cache
    await loadGists(true, true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">
          Fluxa is loading gists...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="min-h-screen pb-28 animate-fade-in overflow-y-auto relative"
        style={{ position: 'relative', zIndex: 1 }}
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
      <div className="container mx-auto px-4 pt-4 pb-6 max-w-6xl lg:py-6 relative" style={{ position: 'relative', zIndex: 10 }}>
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)_320px]">
          <DesktopNavigationWidget />

          <div
            ref={feedColumnRef}
            className="space-y-6 w-full max-w-[420px] sm:max-w-[520px] md:max-w-[640px] mx-auto lg:max-w-none lg:mx-0 lg:max-h-[calc(100vh-200px)] lg:overflow-y-auto lg:pr-3 lg:pb-24 scrollbar-hide"
            style={{ position: 'relative', zIndex: 100 }}
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

            {feedError && (
              <div className="rounded-2xl border border-red-200 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                {feedError}
              </div>
            )}

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
            <div className="space-y-6" style={{ position: 'relative', zIndex: 100 }}>
              {combinedFeed.length === 0 ? (
                <Card className="p-12 text-center" style={{ position: 'relative', zIndex: 100 }}>
                  <p className="text-muted-foreground mb-4">
                    No content available yet
                  </p>
                  <Button onClick={() => (window.location.href = "/admin")}>
                    Go to Admin Panel
                  </Button>
                </Card>
              ) : (
                combinedFeed.map((item) => (
                    <FeedCardWithSocial
                    key={`gist-${item.id}`}
                    id={item.id}
                    imageUrl={item.image_url || undefined}
                    imageUrls={{
                      primary: item.image_url,
                      source: item.source_image_url,
                      ai: item.ai_image_url,
                    }}
                      headline={
                        searchQuery
                        ? (highlightText(item.headline, searchQuery) as any)
                        : item.headline
                      }
                      context={
                        searchQuery
                        ? (highlightText(item.summary || item.context || '', searchQuery) as any)
                        : (item.summary || item.context || '').trim() || 'No description available'
                      }
                      author="Fluxa"
                    timeAgo={item.published_at ? formatTimeAgo(item.published_at) : "Just now"}
                    category={item.topic}
                    readTime="2 min"
                    comments={item.analytics?.comments || 0}
                    views={item.analytics?.views || 0}
                    plays={item.analytics?.plays || 0}
                    shares={item.analytics?.shares || 0}
                    isPlaying={currentPlayingId === item.id && isPlaying}
                    onPlay={() => handlePlay(item.id, item.audio_url, item.url)}
                    onComment={() => handleCommentClick(item)}
                    onShare={() => handleShare(item)}
                    onCardClick={() => handleCardClick(item)}
                    onFluxaAnalysis={() => handleFluxaAnalysis(item)}
                  />
                ))
              )}
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
    </div>
  );
};

export default Feed;
