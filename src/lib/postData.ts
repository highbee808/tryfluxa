import { supabase } from "@/integrations/supabase/client";
import { getFrontendUrl } from "@/lib/apiConfig";

/**
 * Fetch a post by source and ID from the specified table
 * Returns null if not found
 */
export async function fetchPostBySourceAndId(
  source: "gist" | "news",
  id: string
): Promise<{
  source: "gist" | "news";
  data: any;
} | null> {
  
  if (source === "gist") {
    const gistQueryStartTime = Date.now();
    const gistQueryTimeout = 5000; // 5 second timeout
    
    const gistQueryPromise = supabase
      .from("gists")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    const gistTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Query timeout")), gistQueryTimeout)
    );

    let gistData: any = null;
    let gistError: any = null;
    
    try {
      const result = await Promise.race([gistQueryPromise, gistTimeoutPromise]) as any;
      gistData = result.data;
      gistError = result.error;
    } catch (timeoutError) {
      console.warn(`[PostDetail] gists query timed out after ${gistQueryTimeout}ms`);
    }

    if (gistError) {
      console.error("Error fetching gist:", gistError);
      return null;
    }

    if (gistData) {
      return { source: "gist", data: gistData };
    }
  } else if (source === "news") {
    // Use optimized single-item API endpoint (fast, bypasses RLS complexity)
    const apiQueryStartTime = Date.now();
    const apiQueryTimeout = 3000; // 3 second timeout
    
    try {
      const frontendUrl = getFrontendUrl();
      
      // Use single-item API endpoint (much faster than fetching 100 items)
      const apiUrl = `${frontendUrl}/api/feed/content-item/${id}`;
      
      const fetchPromise = fetch(apiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      }).then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        return data;
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("API timeout")), apiQueryTimeout)
      );

      const contentItemData = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (contentItemData) {
        const mappedData = {
          id: contentItemData.id,
          title: contentItemData.title,
          headline: contentItemData.title,
          summary: contentItemData.excerpt || "",
          context: contentItemData.excerpt || "",
          image_url: contentItemData.image_url,
          published_at: contentItemData.published_at,
          created_at: contentItemData.created_at,
          url: contentItemData.url,
          source_url: contentItemData.url,
          category: contentItemData.categories?.[0] || null,
          topic: contentItemData.source_name || "News",
          topic_category: contentItemData.categories?.[0] || null,
          views_count: 0,
          comments_count: 0,
        };

        return { source: "news", data: mappedData };
      }
    } catch (apiError) {
      console.warn(`[PostDetail] content_items API query failed:`, apiError);
      
      // If API endpoint doesn't exist (404), fall back to fetching from feed API
      if (apiError instanceof Error && apiError.message.includes('404')) {
        try {
          const feedApiUrl = `${frontendUrl}/api/feed/content-items?limit=100`;
          const feedResponse = await fetch(feedApiUrl, {
            headers: { "Content-Type": "application/json" },
          });
          
          if (feedResponse.ok) {
            const feedData = await feedResponse.json();
            const item = (feedData.items || []).find((item: any) => item.id === id);
            
            if (item) {
              const mappedData = {
                id: item.id,
                title: item.title,
                headline: item.title,
                summary: item.excerpt || "",
                context: item.excerpt || "",
                image_url: item.image_url,
                published_at: item.published_at,
                created_at: item.created_at,
                url: item.url,
                source_url: item.url,
                category: item.categories?.[0] || null,
                topic: item.source_name || "News",
                topic_category: item.categories?.[0] || null,
                views_count: 0,
                comments_count: 0,
              };
              
              return { source: "news", data: mappedData };
            }
          }
        } catch (fallbackError) {
          console.warn(`[PostDetail] Feed API fallback also failed:`, fallbackError);
        }
      }
      
      // Fall through to try news_cache as final fallback
    }

    // Fallback: Try news_cache (for fetch-content items, not content_items)
    // This is a quick check with timeout
    const newsQueryStartTime = Date.now();
    const newsQueryTimeout = 2000; // 2 second timeout (shorter since it's fallback)
    
    try {
      const newsQueryPromise = supabase
        .from("news_cache")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      const newsTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Query timeout")), newsQueryTimeout)
      );

      const result = await Promise.race([newsQueryPromise, newsTimeoutPromise]) as any;

      if (result.data && !result.error) {
        return { source: "news", data: result.data };
      }
    } catch (timeoutError) {
      // Ignore timeout - API is primary method
    }
  }

  return null;
}

/**
 * Fetch a post by ID from either gists or news_cache table (fallback for legacy routes)
 * Returns null if not found
 * @deprecated Use fetchPostBySourceAndId instead
 */
export async function fetchPostById(id: string): Promise<{
  source: "gist" | "news";
  data: any;
} | null> {
  // Try gists table first (admin pipeline)
  const { data: gistData, error: gistError } = await supabase
    .from("gists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!gistError && gistData) {
    return { source: "gist", data: gistData };
  }

  // Try news_cache table (fetch-content)
  const { data: newsData, error: newsError } = await supabase
    .from("news_cache")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!newsError && newsData) {
    return { source: "news", data: newsData };
  }

  return null;
}

/**
 * Increment views_count for a post if the column exists
 * Note: This requires a database function or we fetch, increment, and update
 */
export async function incrementViewCount(
  source: "gist" | "news",
  id: string
): Promise<void> {
  try {
    if (source === "news") {
      // Try news_cache first
      const { data: newsData } = await supabase
        .from("news_cache")
        .select("views_count")
        .eq("id", id)
        .maybeSingle();

      if (newsData) {
        await supabase
          .from("news_cache")
          .update({ views_count: (newsData.views_count || 0) + 1 })
          .eq("id", id);
        return;
      }

      // If not in news_cache, try content_items (content_items don't have views_count, so skip)
      // Views tracking for content_items would need to be added to the schema
    }
    // For gists, skip incrementing if views_count doesn't exist in schema
  } catch (error) {
    // Silently fail - views count is not critical
    console.error("Failed to increment view count:", error);
  }
}

