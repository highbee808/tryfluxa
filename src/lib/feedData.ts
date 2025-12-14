import { supabase } from "@/integrations/supabase/client";

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
export async function fetchRecentGists(limit = 20): Promise<DbGist[]> {
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
    
    console.log('[fetchRecentGists] Executing query with select:', selectQuery);
    
    const { data, error } = await supabase
      .from("gists")
      .select(selectQuery)
      .eq("status", "published")
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

    console.log(`[fetchRecentGists] Received ${data?.length || 0} gists`);

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
      
      console.log("[FEED MAP]", {
        gistId: gist.id,
        headline: mappedGist.headline,
        topic: mappedGist.topic,
        image_url: mappedGist.image_url || 'none (will use fallback)',
        source_url: mappedGist.source_url || 'none',
      });
      
      mappedGists.push(mappedGist);
    }

    return mappedGists;
  } catch (error) {
    console.error("Error fetching recent gists:", error);
    return [];
  }
}

