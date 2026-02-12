import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FeedCardWithSocial } from "@/components/FeedCardWithSocial";
import { SkeletonFeedCard } from "@/components/SkeletonFeedCard";
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
import { fetchRecentGists, type DbGist, fetchContentItems, mapContentItemResponseToGist, mapContentCategoryToFeedCategory, markContentItemAsSeen } from "@/lib/feedData";

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
  sourceType?: "gist" | "content_item" | "category_content";
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
const CACHE_TTL_MINUTES = 15;
const CACHE_FRESH_THRESHOLD_MINUTES = 5;

// Cache utility functions
const getFeedCacheKey = (category: string, userInterests: string[]): string => {
  const interestsKey = userInterests.sort().join(",");
  return `fluxa_feed_cache_${category}_${interestsKey}`;
};

interface CacheEntry {
  gists: Gist[];
  timestamp: number;
  order: string[]; // Array of IDs to preserve order
}

const getFeedCache = (category: string, userInterests: string[]): Gist[] | null => {
  try {
    const key = getFeedCacheKey(category, userInterests);
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry = JSON.parse(cached);
    const ageMinutes = (Date.now() - entry.timestamp) / (1000 * 60);
    
    if (ageMinutes > CACHE_TTL_MINUTES) {
      localStorage.removeItem(key);
      return null;
    }
    
    // Restore order if cache is fresh
    if (ageMinutes < CACHE_FRESH_THRESHOLD_MINUTES && entry.order) {
      const orderMap = new Map(entry.order.map((id, idx) => [id, idx]));
      return entry.gists.sort((a, b) => {
        const aIdx = orderMap.get(a.id) ?? Infinity;
        const bIdx = orderMap.get(b.id) ?? Infinity;
        return aIdx - bIdx;
      });
    }
    
    return entry.gists;
  } catch (error) {
    console.warn("[Feed] Error reading cache:", error);
    return null;
  }
};

const setFeedCache = (category: string, userInterests: string[], gists: Gist[], ttlMinutes: number = CACHE_TTL_MINUTES): void => {
  try {
    const key = getFeedCacheKey(category, userInterests);
    const order = gists.map(g => g.id);
    const entry: CacheEntry = {
      gists,
      timestamp: Date.now(),
      order,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn("[Feed] Error writing cache:", error);
  }
};

const Feed = () => {
  const navigate = useNavigate();
  const { isDark, toggleDarkMode } = useDarkMode();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const [gists, setGists] = useState<Gist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingPartial, setIsLoadingPartial] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [sourceErrors, setSourceErrors] = useState<{ categoryContent?: string; contentItems?: string }>({});
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  
  // Cache and fetch tracking
  const memoryCache = useRef<Map<string, { gists: Gist[]; timestamp: number }>>(new Map());
  const lastFetchTime = useRef<number>(0);
  const sourcesCompleted = useRef<{ categoryContent: boolean; contentItems: boolean }>({
    categoryContent: false,
    contentItems: false,
  });

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
    sourceType: "category_content",
    analytics: {
      views: item.views_count ?? 0,
      likes: 0,
      comments: item.comments_count ?? 0,
      shares: 0,
      plays: 0,
    },
  });

  const mapDbGistToGist = (gist: DbGist): Gist => {
    // Extract image URLs from meta (for old format compatibility)
    const meta = gist.meta as any;
    const sourceImageUrl = meta?.source_image_url || null;
    const aiImageUrl = meta?.ai_generated_image || null;
    
    // Image priority logic:
    // 1. If meta has separate source_image_url or ai_generated_image (old format), use those
    // 2. Otherwise, use image_url directly (new API-first format stores it here)
    // 3. Validate that image_url is not null, empty string, or "null"
    const isValidImageUrl = (url: string | null | undefined): boolean => {
      return !!url && url !== 'null' && url.trim() !== '' && url.trim() !== 'null';
    };
    
    let primaryImageUrl: string | null = null;
    
    if (sourceImageUrl && isValidImageUrl(sourceImageUrl)) {
      primaryImageUrl = sourceImageUrl;
    } else if (aiImageUrl && isValidImageUrl(aiImageUrl)) {
      primaryImageUrl = aiImageUrl;
    } else if (gist.image_url && isValidImageUrl(gist.image_url)) {
      // New format: image_url contains the source or AI image directly
      primaryImageUrl = gist.image_url;
    }
    
    return {
      id: gist.id,
      source: "gist",
      headline: gist.headline,
      summary: meta?.summary || gist.context?.slice(0, 150) + (gist.context && gist.context.length > 150 ? "..." : ""),
      context: gist.context || '',
      audio_url: gist.audio_url || null,
      image_url: primaryImageUrl,
      source_image_url: sourceImageUrl && isValidImageUrl(sourceImageUrl) ? sourceImageUrl : null,
      ai_image_url: aiImageUrl && isValidImageUrl(aiImageUrl) ? aiImageUrl : null,
      topic: gist.topic,
      topic_category: gist.topic_category || null,
      published_at: gist.published_at || gist.created_at || undefined,
      url: gist.source_url || undefined,
      sourceType: "gist",
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
          return [];
        }
        
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

  // Helper function to merge, sort, and deduplicate gists
  const mergeAndSortGists = (newGists: Gist[], existingGists: Gist[] = []): Gist[] => {
    // Validate inputs
    if (!Array.isArray(newGists)) {
      console.warn("[Feed] mergeAndSortGists: newGists is not an array");
      return existingGists;
    }
    if (!Array.isArray(existingGists)) {
      console.warn("[Feed] mergeAndSortGists: existingGists is not an array");
      return newGists;
    }

    // Merge existing and new gists
    const allGists = [...existingGists, ...newGists];

    // Validate IDs before deduplication
    const validGists = allGists.filter(gist => {
      if (!gist || !gist.id) {
        console.warn("[Feed] Invalid gist found (missing id):", gist);
        return false;
      }
      return true;
    });

    // Deduplicate by ID
    const seenIds = new Set<string>();
    const uniqueGists = validGists.filter(gist => {
      if (seenIds.has(gist.id)) return false;
      seenIds.add(gist.id);
      return true;
    });

    // Sort: primary by published_at (descending, nulls last), secondary by id (ascending)
    uniqueGists.sort((a, b) => {
      // Validate dates before sorting
      let dateA = 0;
      let dateB = 0;
      
      if (a.published_at) {
        const parsedA = new Date(a.published_at).getTime();
        dateA = Number.isNaN(parsedA) ? 0 : parsedA;
      }
      
      if (b.published_at) {
        const parsedB = new Date(b.published_at).getTime();
        dateB = Number.isNaN(parsedB) ? 0 : parsedB;
      }
      
      // Primary sort: published_at (descending)
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      
      // Secondary sort: id (ascending) for stability
      return a.id.localeCompare(b.id);
    });

    if (import.meta.env.DEV) {
      const duplicateCount = allGists.length - uniqueGists.length;
      if (duplicateCount > 0) {
        console.log(`[Feed] Deduplicated ${duplicateCount} duplicates`);
      }
    }

    return uniqueGists;
  };

  // Helper to update gists state progressively
  const updateGistsProgressively = (newGists: Gist[], source: "categoryContent" | "contentItems") => {
    try {
      setGists(prev => {
        const merged = mergeAndSortGists(newGists, prev);
        return merged;
      });
      
      sourcesCompleted.current[source] = true;
      
      if (import.meta.env.DEV) {
        console.log(`[Feed] ${source} loaded: ${newGists.length} items`);
      }
    } catch (error) {
      console.error(`[Feed] Error updating gists from ${source}:`, error);
    }
  };

  const loadGists = useCallback(
    async (showToast = false, forceFresh = false) => {
      try {
        if (showToast) setIsRefreshing(true);
        setFeedError(null);
        setSourceErrors({});
        sourcesCompleted.current = { categoryContent: false, contentItems: false };

        // Check if we should skip fetch (not forceFresh, recent fetch, cache exists)
        const now = Date.now();
        const timeSinceLastFetch = now - lastFetchTime.current;
        const shouldSkipFetch = !forceFresh && 
                                 timeSinceLastFetch < 2 * 60 * 1000 && // 2 minutes
                                 gists.length > 0;
        
        if (shouldSkipFetch) {
          if (import.meta.env.DEV) {
            console.log("[Feed] Skipping fetch - recent fetch and cache available");
          }
          if (!showToast) setLoading(false);
          return;
        }

        // Check cache first
        const cachedGists = !forceFresh ? getFeedCache(selectedCategory, userInterests) : null;
        if (cachedGists && cachedGists.length > 0) {
          if (import.meta.env.DEV) {
            console.log(`[Feed] Cache hit for category: ${selectedCategory} (${cachedGists.length} items)`);
          }
          setGists(cachedGists);
          setLoading(false);
          setIsLoadingPartial(true); // Still loading fresh data in background
        } else {
          if (import.meta.env.DEV) {
            console.log(`[Feed] Cache miss for category: ${selectedCategory}`);
          }
          if (!showToast) setLoading(true);
        }

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
          categoriesToFetch = [category];
        }

        // Fetch category content and content_items in parallel
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        // Determine content_items category filter based on selectedCategory
        let contentItemsCategory: string | undefined;
        if (selectedCategory !== "All") {
          const feedCategory = resolveCategoryKey(selectedCategory);
          if (feedCategory === "sports") {
            contentItemsCategory = "Sports";
          } else if (feedCategory === "music") {
            contentItemsCategory = "Entertainment";
          }
        }

        // Fetch both sources, but handle them progressively
        const fetchPromises = [
          Promise.all(categoriesToFetch.map((category) => fetchCategoryContent(category, forceFresh)))
            .then((responses) => {
              let mergedItems = responses.flat();
              
              // Filter out sports content if user doesn't have Sports interest (only for "All" tab)
              if (selectedCategory === "All" && !hasSportsInterest) {
                mergedItems = mergedItems.filter(item => item.category !== "sports");
              }

              const categoryGists = mergedItems.map(mapContentItemToGist);
              updateGistsProgressively(categoryGists, "categoryContent");
              
              if (import.meta.env.DEV) {
                console.log(`[Feed] Merged ${mergedItems.length} category items`);
              }
              
              return mergedItems;
            })
            .catch((error) => {
              console.error("[Feed] Error fetching category content:", error);
              const errorMsg = error instanceof Error ? error.message : "Failed to load trending content";
              setSourceErrors(prev => ({ ...prev, categoryContent: errorMsg }));
              toast.warning("Some content couldn't load. Showing available items.");
              sourcesCompleted.current.categoryContent = true;
              return [];
            }),
          
          fetchContentItems({
            limit: 50,
            maxAgeHours: 168,
            category: contentItemsCategory,
            userId: userId,
          })
            .then((contentItemsData) => {
              // Map content_items to Gist format
              const contentItemsGists = contentItemsData.map(item => mapContentItemResponseToGist(item));

              // Filter content_items by selectedCategory (if not "All")
              const filteredContentItemsGists = selectedCategory === "All"
                ? contentItemsGists
                : contentItemsGists.filter(gist => {
                    const feedCategory = mapContentCategoryToFeedCategory(gist.topic_category || "");
                    const selectedFeedCategory = resolveCategoryKey(selectedCategory);
                    return feedCategory === selectedFeedCategory;
                  });

              // Apply sports interest filter for "All" tab
              const finalContentItemsGists = selectedCategory === "All" && !hasSportsInterest
                ? filteredContentItemsGists.filter(gist => {
                    const feedCategory = mapContentCategoryToFeedCategory(gist.topic_category || "");
                    return feedCategory !== "sports";
                  })
                : filteredContentItemsGists;

              updateGistsProgressively(finalContentItemsGists, "contentItems");
              
              if (import.meta.env.DEV) {
                console.log(`[Feed] Merged ${finalContentItemsGists.length} content_items`);
              }
              
              return finalContentItemsGists;
            })
            .catch((error) => {
              console.error("[Feed] Error fetching content items:", error);
              const errorMsg = error instanceof Error ? error.message : "Failed to load news content";
              setSourceErrors(prev => ({ ...prev, contentItems: errorMsg }));
              toast.warning("Some content couldn't load. Showing available items.");
              sourcesCompleted.current.contentItems = true;
              return [];
            }),
        ];

        // Wait for all sources with timeout
        const timeoutPromise = new Promise<void>((resolve) => {
          setTimeout(() => {
            resolve();
          }, 5000); // 5 second timeout
        });

        await Promise.race([
          Promise.all(fetchPromises),
          timeoutPromise,
        ]);

        // Wait a bit for progressive updates to complete, then check if we need fallback
        setTimeout(() => {
          setGists(current => {
            // Update cache and log stats
            if (current.length > 0) {
              setFeedCache(selectedCategory, userInterests, current);
              lastFetchTime.current = Date.now();
              
              if (import.meta.env.DEV) {
                const categoryCount = current.filter(g => g.sourceType === "category_content").length;
                const contentItemsCount = current.filter(g => g.sourceType === "content_item").length;
                const gistCount = current.filter(g => g.sourceType === "gist").length;
                console.log(`[Feed] Merged ${categoryCount} category items + ${contentItemsCount} content_items + ${gistCount} gists = ${current.length} total`);
              }
            }
            
            // Fallback: fetch recent gists from database if we still have no content
            if (current.length === 0 && sourcesCompleted.current.categoryContent && sourcesCompleted.current.contentItems) {
              fetchRecentGists(50)
                .then((dbGists) => {
                  if (dbGists.length > 0) {
                    const seenHeadlines = new Set<string>();
                    const uniqueGists = dbGists
                      .filter(gist => {
                        if (!gist.id || !gist.headline) return false;
                        const key = `${gist.id}-${gist.headline?.toLowerCase().trim()}`;
                        if (seenHeadlines.has(key)) return false;
                        const headlineKey = gist.headline?.toLowerCase().trim() || '';
                        if (seenHeadlines.has(headlineKey)) return false;
                        
                        if (selectedCategory === "All" && !hasSportsInterest) {
                          const isSports = gist.topic?.toLowerCase().includes('sport') || 
                                           gist.topic_category?.toLowerCase().includes('sport') ||
                                           gist.topic?.toLowerCase() === 'sports';
                          if (isSports) return false;
                        }
                        
                        seenHeadlines.add(key);
                        seenHeadlines.add(headlineKey);
                        return true;
                      })
                      .map(mapDbGistToGist);
                    
                    setGists(uniqueGists);
                    setFeedCache(selectedCategory, userInterests, uniqueGists);
                    setFeedError(null);
                  } else {
                    // Only show error if ALL sources failed
                    if (Object.keys(sourceErrors).length === 2) {
                      setFeedError("Failed to load feed content. Please try again later.");
                    } else {
                      setFeedError("No content available. Please try again later.");
                    }
                  }
                })
                .catch((error) => {
                  console.error("[Feed] Fallback fetch failed:", error);
                  if (Object.keys(sourceErrors).length === 2) {
                    setFeedError("Failed to load feed content. Please try again later.");
                  }
                });
            } else if (current.length > 0) {
              // Clear error if we have content
              setFeedError(null);
            }
            
            return current;
          });
        }, 100); // Small delay to allow progressive updates to complete

      } catch (error) {
        console.error("Error loading feed content:", error);
        setFeedError(error instanceof Error ? error.message : "Failed to load feed content");
        toast.error("Failed to load feed");
      } finally {
        setLoading(false);
        setIsLoadingPartial(false);
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
      loadGists(true);
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

  const handleCardClick = async (gist: Gist) => {
    // Mark content_item as seen if it's from content_items (source: "news" with URL indicates content_item)
    // For Phase 6, we'll attempt to mark all gists with URLs as seen
    // This is safe because user_content_seen will only accept valid content_item_ids
    if (gist.url) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to mark as seen (will silently fail if not a content_item)
        markContentItemAsSeen(gist.id, user.id).catch(() => {
          // Ignore errors - item might not be a content_item
        });
      }
    }
    
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
      const beforeCategoryFilter = filtered.length;
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

  // Show skeleton loaders if initial loading and no cached content
  const showSkeletons = loading && gists.length === 0;

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
              {showSkeletons ? (
                // Show skeleton loaders while loading
                Array.from({ length: 5 }).map((_, idx) => (
                  <SkeletonFeedCard key={`skeleton-${idx}`} />
                ))
              ) : combinedFeed.length === 0 ? (
                <Card className="p-12 text-center" style={{ position: 'relative', zIndex: 100 }}>
                  <p className="text-muted-foreground mb-4">
                    No content available yet
                  </p>
                  <Button onClick={() => (window.location.href = "/admin")}>
                    Go to Admin Panel
                  </Button>
                </Card>
              ) : (
                <>
                  {(() => {
                    return combinedFeed.map((item) => (
                    <FeedCardWithSocial
                    key={`gist-${item.id}`}
                    id={item.id}
                    imageUrl={item.image_url && item.image_url !== 'null' && item.image_url.trim() !== '' ? item.image_url : undefined}
                    imageUrls={{
                      primary: item.image_url && item.image_url !== 'null' && item.image_url.trim() !== '' ? item.image_url : null,
                      source: item.source_image_url && item.source_image_url !== 'null' && item.source_image_url.trim() !== '' ? item.source_image_url : null,
                      ai: item.ai_image_url && item.ai_image_url !== 'null' && item.ai_image_url.trim() !== '' ? item.ai_image_url : null,
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
                    sourceType={item.sourceType}
                    isPlaying={currentPlayingId === item.id && isPlaying}
                    onPlay={() => handlePlay(item.id, item.audio_url, item.url)}
                    onComment={() => handleCommentClick(item)}
                    onShare={() => handleShare(item)}
                    onCardClick={() => handleCardClick(item)}
                    onFluxaAnalysis={() => handleFluxaAnalysis(item)}
                  />
                    ));
                  })()}
                  {/* Show skeleton loaders for partial loading */}
                  {isLoadingPartial && Array.from({ length: 2 }).map((_, idx) => (
                    <SkeletonFeedCard key={`partial-skeleton-${idx}`} />
                  ))}
                </>
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
