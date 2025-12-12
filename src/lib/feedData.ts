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
    // CRITICAL: Join with raw_trends to ensure image_url comes from the correct row
    // This prevents image mismatches (e.g., Trump image on polar bear article)
    const { data, error } = await supabase
      .from("gists")
      .select(`
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
        raw_trend_id,
        raw_trends (
          id,
          title,
          url,
          image_url,
          category,
          source
        )
      `)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading recent gists", error);
      return [];
    }

    // CRITICAL: Map gists and prioritize raw_trends.image_url over gists.image_url
    // This ensures the correct image is always displayed (from the original scraped article)
    const gists = (data as any[]) ?? [];
    const mappedGists: DbGist[] = [];
    
    for (const gist of gists) {
      const rawTrend = gist.raw_trends;
      
      // PRIORITY RULE: Use raw_trends.image_url FIRST, then gists.image_url, then null
      // This guarantees the image matches the headline/content from the same raw_trend
      let primaryImage: string | null = null;
      if (rawTrend?.image_url) {
        primaryImage = rawTrend.image_url;
      } else if (gist.image_url) {
        primaryImage = gist.image_url;
      } else {
        primaryImage = null; // Frontend will use /fallback/news.jpg
      }
      
      // PRIORITY RULE: Use raw_trends.url for source_url if available
      const primarySourceUrl = rawTrend?.url || gist.source_url || null;
      
      // Create mapped gist with correct image_url
      const mappedGist: DbGist = {
        ...gist,
        image_url: primaryImage,
        source_url: primarySourceUrl,
      };
      
      console.log("[FEED MAP]", {
        gistId: gist.id,
        rawTrendId: gist.raw_trend_id || 'none',
        headline: gist.headline,
        rawImage: rawTrend?.image_url || 'none',
        gistImage: gist.image_url || 'none',
        primaryImage: primaryImage || 'none (will use /fallback/news.jpg)',
        rawSourceUrl: rawTrend?.url || 'none',
        gistSourceUrl: gist.source_url || 'none',
        primarySourceUrl: primarySourceUrl || 'none',
      });
      
      // Safety check: If raw_trend exists, validate consistency
      if (rawTrend && gist.raw_trend_id) {
        if (rawTrend.image_url && mappedGist.image_url !== rawTrend.image_url) {
          console.warn(`⚠️ Image mismatch detected! Expected ${rawTrend.image_url}, got ${mappedGist.image_url}. Using raw_trend.image_url.`);
          // Force correct image_url
          mappedGist.image_url = rawTrend.image_url;
        }
        if (rawTrend.url && mappedGist.source_url !== rawTrend.url) {
          console.warn(`⚠️ URL mismatch detected! Expected ${rawTrend.url}, got ${mappedGist.source_url}. Using raw_trend.url.`);
          // Force correct source_url
          mappedGist.source_url = rawTrend.url;
        }
      }
      
      mappedGists.push(mappedGist);
    }

    return mappedGists;
  } catch (error) {
    console.error("Error fetching recent gists:", error);
    return [];
  }
}

