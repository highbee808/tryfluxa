import { supabase } from "@/integrations/supabase/client";
import { getApiBaseUrl, getDefaultHeaders, getFrontendUrl } from "@/lib/apiConfig";

/**
 * Content item response from feed API endpoint
 */
export interface ContentItemResponse {
  id: string;
  source_id: string;
  source_key: string;
  source_name: string;
  title: string;
  url: string | null;
  excerpt: string | null;
  published_at: string | null;
  image_url: string | null;
  categories: string[];
  created_at: string;
}

/**
 * Database gist row structure from Supabase
 * CRITICAL: raw_trend_id links to raw_trends table for 1:1 mapping
 * This ensures headline, image_url, and source_url all come from the same raw_trend row
 */
export interface DbGist {
  id: string;
  headline: string;
  context: string;
  audio_url: string | null;
  image_url: string | null;
  topic: string;
  topic_category: string | null;
  published_at: string | null;
  created_at: string | null;
  status: string | null;
  source_url: string | null;
  raw_trend_id?: string | null; // CRITICAL: Foreign key to raw_trends.id
  meta: Record<string, unknown> | null;
  source_image_url?: string | null;
  ai_generated_image?: string | null;
  raw_trends?: {
    id: string;
    title: string;
    url: string | null;
    image_url: string | null;
    category: string;
    source: string;
  } | null;
}

/**
 * Fetch recent published gists from the database
 * Used as a fallback when fetch-content returns no items
 */
export async function fetchRecentGists(limit = 20, maxAgeHours = 168): Promise<DbGist[]> {
  try {
    // Query only columns that exist in gists table
    // Note: raw_trends join removed - cron-generated gists don't have raw_trend_id
    // Using only verified columns from the schema
    const selectQuery = `
      id,
      headline,
      context,
      audio_url,
      image_url,
      topic,
      topic_category,
      published_at,
      created_at,
      status,
      source_url,
      meta,
      narration,
      script
    `;
    
    // Calculate cutoff time for fresh content (default: 7 days, but can be overridden)
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);
    
    const { data, error } = await supabase
      .from("gists")
      .select(selectQuery)
      .eq("status", "published")
      .gte("published_at", cutoffTime.toISOString()) // Only fetch recent content
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading recent gists", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    // Map gists using only available fields
    // For cron-generated gists: use topic as headline if headline is missing
    const gists = (data as any[]) ?? [];
    const mappedGists: DbGist[] = [];
    
    for (const gist of gists) {
      // Use headline if available, otherwise fall back to topic
      const displayHeadline = gist.headline || gist.topic || 'Untitled';
      
      // Create mapped gist with available fields
      const mappedGist: DbGist = {
        id: gist.id,
        headline: displayHeadline,
        context: gist.context || '',
        audio_url: gist.audio_url,
        image_url: gist.image_url || null, // Frontend will use fallback if null
        topic: gist.topic || '',
        topic_category: gist.topic_category || null,
        published_at: gist.published_at,
        created_at: gist.created_at,
        status: gist.status,
        source_url: gist.source_url || null,
        meta: gist.meta || null,
        raw_trend_id: null, // Cron-generated gists don't have raw_trend_id
        raw_trends: null, // No raw_trends for cron-generated gists
      };
      
      mappedGists.push(mappedGist);
    }

    return mappedGists;
  } catch (error) {
    console.error("Error fetching recent gists:", error);
    return [];
  }
}

/**
 * Map content_item category name to feed category
 * Maps content_categories.name to feed ContentCategory type
 */
export function mapContentCategoryToFeedCategory(categoryName: string): "news" | "sports" | "music" | null {
  const normalized = categoryName.toLowerCase().trim();
  
  // Sports mapping
  if (normalized === "sports") {
    return "sports";
  }
  
  // Entertainment -> Music (or could be "news", using "music" for Phase 6)
  if (normalized === "entertainment") {
    return "music";
  }
  
  // News categories
  const newsCategories = ["technology", "business", "world", "health", "science", "politics"];
  if (newsCategories.includes(normalized)) {
    return "news";
  }
  
  // Default unmapped categories -> news
  return "news";
}

/**
 * Fetch content_items from feed API endpoint
 */
export async function fetchContentItems(options?: {
  limit?: number;
  maxAgeHours?: number;
  category?: string;
  source?: string;
  userId?: string;
}): Promise<ContentItemResponse[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'feedData.ts:167',message:'fetchContentItems entry',data:{options},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    // Use frontend URL for Vercel serverless function, not Supabase Edge Function
    const frontendUrl = getFrontendUrl();
    const baseUrl = frontendUrl.replace(/\/$/, "");
    const urlObj = new URL(`${baseUrl}/api/feed/content-items`);
    
    if (options?.limit) {
      urlObj.searchParams.set("limit", String(options.limit));
    }
    if (options?.maxAgeHours) {
      urlObj.searchParams.set("maxAgeHours", String(options.maxAgeHours));
    }
    if (options?.category) {
      urlObj.searchParams.set("category", options.category);
    }
    if (options?.source) {
      urlObj.searchParams.set("source", options.source);
    }
    if (options?.userId) {
      urlObj.searchParams.set("userId", options.userId);
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'feedData.ts:195',message:'fetchContentItems request',data:{url:urlObj.toString().substring(0,150)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const response = await fetch(urlObj.toString(), {
      headers: getDefaultHeaders(),
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'feedData.ts:199',message:'fetchContentItems response status',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    if (!response.ok) {
      console.warn(`[Feed] content-items API returned ${response.status}`);
      return [];
    }
    
    const data = await response.json() as { items: ContentItemResponse[]; count: number };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'feedData.ts:205',message:'fetchContentItems response data',data:{itemsCount:data.items?.length||0,count:data.count,firstItemId:data.items?.[0]?.id,firstItemTitle:data.items?.[0]?.title?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return data.items || [];
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'feedData.ts:207',message:'fetchContentItems error',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error("[Feed] Error fetching content items:", error);
    return [];
  }
}

/**
 * Mark a content_item as seen for the current user
 * Used to track user_content_seen for content_items
 */
export async function markContentItemAsSeen(contentItemId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_content_seen')
      .insert({
        user_id: userId,
        content_item_id: contentItemId,
      })
      .select()
      .single();

    if (error) {
      // Ignore duplicate key errors (item already marked as seen)
      if (error.code === '23505') {
        return true; // Already seen, consider it successful
      }
      console.warn('[Feed] Failed to mark content item as seen:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Feed] Error marking content item as seen:', error);
    return false;
  }
}

/**
 * Map content_item API response to Gist interface
 * Used to integrate content_items into existing feed UI
 */
export function mapContentItemResponseToGist(item: ContentItemResponse): {
  id: string;
  source: "news";
  headline: string;
  summary: string;
  context: string;
  audio_url: null;
  image_url: string | null;
  source_image_url: null;
  ai_image_url: null;
  topic: string;
  topic_category: string | null;
  published_at: string | undefined;
  url: string | undefined;
  sourceType: "content_item";
  analytics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    plays: number;
  };
} {
  // Map excerpt to summary (truncate to 150 chars) and context (full)
  const excerpt = item.excerpt || "";
  const summary = excerpt.slice(0, 150) + (excerpt.length > 150 ? "..." : "");
  const context = excerpt || "Fluxa content.";
  
  // Use first category for topic_category, or source_name as fallback
  const topicCategory = item.categories.length > 0 ? item.categories[0] : null;
  
  return {
    id: item.id,
    source: "news", // Reuse "news" source type to match existing feed
    headline: item.title,
    summary,
    context,
    audio_url: null, // content_items don't have audio in Phase 6
    image_url: item.image_url || null,
    source_image_url: null,
    ai_image_url: null,
    topic: item.source_name || item.source_key, // Use source name as topic
    topic_category: topicCategory,
    published_at: item.published_at || undefined,
    url: item.url || undefined,
    sourceType: "content_item",
    analytics: {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      plays: 0,
    },
  };
}

