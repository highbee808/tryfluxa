import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase
      .from("gists")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:15',message:'fetchPostBySourceAndId gist query',data:{source,id,found:!!data,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion

    if (error) {
      console.error("Error fetching gist:", error);
      return null;
    }

    if (data) {
      return { source: "gist", data };
    }
  } else if (source === "news") {
    // First try news_cache (for fetch-content items)
    const { data: newsData, error: newsError } = await supabase
      .from("news_cache")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:30',message:'fetchPostBySourceAndId news_cache query',data:{source,id,found:!!newsData,error:newsError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion

    if (!newsError && newsData) {
      return { source: "news", data: newsData };
    }

    // If not found in news_cache, try content_items table
    const { data: contentItemData, error: contentItemError } = await supabase
      .from("content_items")
      .select(`
        id,
        source_id,
        title,
        url,
        excerpt,
        published_at,
        image_url,
        created_at,
        content_item_categories(
          content_categories(
            name,
            slug
          )
        ),
        content_sources(
          source_key,
          name
        )
      `)
      .eq("id", id)
      .maybeSingle();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:50',message:'fetchPostBySourceAndId content_items query',data:{source,id,found:!!contentItemData,error:contentItemError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
    // #endregion

    if (!contentItemError && contentItemData) {
      // Map content_item to expected format
      const categories = (contentItemData.content_item_categories || [])
        .map((cic: any) => cic.content_categories?.name)
        .filter(Boolean);
      
      const mappedData = {
        id: contentItemData.id,
        title: contentItemData.title,
        headline: contentItemData.title, // Alias for headline
        summary: contentItemData.excerpt || "",
        context: contentItemData.excerpt || "",
        image_url: contentItemData.image_url,
        published_at: contentItemData.published_at,
        created_at: contentItemData.created_at,
        url: contentItemData.url,
        source_url: contentItemData.url,
        category: categories[0] || null,
        topic: contentItemData.content_sources?.name || "News",
        topic_category: categories[0] || null,
        views_count: 0,
        comments_count: 0,
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'postData.ts:72',message:'fetchPostBySourceAndId content_item mapped',data:{id:mappedData.id,title:mappedData.title,categories},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'J'})}).catch(()=>{});
      // #endregion

      return { source: "news", data: mappedData };
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

