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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:7',message:'fetchPostBySourceAndId entry',data:{source,id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
  // #endregion
  
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:15',message:'fetchPostBySourceAndId gist query timeout',data:{source,id,elapsed:Date.now()-gistQueryStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      console.warn(`[PostDetail] gists query timed out after ${gistQueryTimeout}ms`);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:33',message:'fetchPostBySourceAndId gist query result',data:{source,id,found:!!gistData,error:gistError?.message,elapsed:Date.now()-gistQueryStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion

    if (gistError) {
      console.error("Error fetching gist:", gistError);
      return null;
    }

    if (gistData) {
      return { source: "gist", data: gistData };
    }
  } else if (source === "news") {
    // For content_items, use the API endpoint (faster, bypasses RLS complexity)
    // The API endpoint works (we see items in feed), so use it for single item lookup
    const apiQueryStartTime = Date.now();
    const apiQueryTimeout = 3000; // 3 second timeout (shorter since API is faster)
    
    try {
      const frontendUrl = getFrontendUrl();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      
      // Use API endpoint that we know works (same one used in feed)
      const apiUrl = `${frontendUrl}/api/feed/content-items?limit=100&excludeSeen=false${userId ? `&userId=${userId}` : ''}`;
      
      const fetchPromise = fetch(apiUrl, {
        headers: {
          "Content-Type": "application/json",
        },
      }).then(async (response) => {
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const data = await response.json();
        // Find the specific item by ID
        const item = (data.items || []).find((item: any) => item.id === id);
        return item;
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("API timeout")), apiQueryTimeout)
      );

      const contentItemData = await Promise.race([fetchPromise, timeoutPromise]) as any;

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:60',message:'fetchPostBySourceAndId content_items API query',data:{source,id,found:!!contentItemData,elapsed:Date.now()-apiQueryStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion

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

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:85',message:'fetchPostBySourceAndId content_item mapped from API',data:{id:mappedData.id,title:mappedData.title},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
        // #endregion

        return { source: "news", data: mappedData };
      }
    } catch (apiError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:92',message:'fetchPostBySourceAndId content_items API error',data:{source,id,error:apiError instanceof Error?apiError.message:String(apiError),elapsed:Date.now()-apiQueryStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      console.warn(`[PostDetail] content_items API query failed:`, apiError);
      // Fall through to try news_cache as fallback
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:110',message:'fetchPostBySourceAndId news_cache fallback query',data:{source,id,found:!!result.data,elapsed:Date.now()-newsQueryStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion

      if (result.data && !result.error) {
        return { source: "news", data: result.data };
      }
    } catch (timeoutError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:120',message:'fetchPostBySourceAndId news_cache fallback timeout',data:{source,id,elapsed:Date.now()-newsQueryStartTime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion
      // Ignore timeout - API is primary method
    }

    if (newsError) {
      console.error("Error fetching news item:", newsError);
      return null;
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:85',message:'fetchPostBySourceAndId not found',data:{source,id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
  // #endregion

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

