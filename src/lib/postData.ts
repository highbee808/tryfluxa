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
  if (source === "gist") {
    const { data, error } = await supabase
      .from("gists")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching gist:", error);
      return null;
    }

    if (data) {
      return { source: "gist", data };
    }
  } else if (source === "news") {
    const { data, error } = await supabase
      .from("news_cache")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching news item:", error);
      return null;
    }

    if (data) {
      return { source: "news", data };
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
      // news_cache has views_count column - fetch current value and increment
      const { data } = await supabase
        .from("news_cache")
        .select("views_count")
        .eq("id", id)
        .single();

      if (data) {
        await supabase
          .from("news_cache")
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq("id", id);
      }
    }
    // For gists, skip incrementing if views_count doesn't exist in schema
  } catch (error) {
    // Silently fail - views count is not critical
    console.error("Failed to increment view count:", error);
  }
}

