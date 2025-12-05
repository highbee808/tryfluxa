import { supabase } from "@/integrations/supabase/client";

/**
 * Database gist row structure from Supabase
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
  meta: Record<string, unknown> | null;
  source_image_url?: string | null;
  ai_generated_image?: string | null;
}

/**
 * Fetch recent published gists from the database
 * Used as a fallback when fetch-content returns no items
 */
export async function fetchRecentGists(limit = 20): Promise<DbGist[]> {
  try {
    const { data, error } = await supabase
      .from("gists")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading recent gists", error);
      return [];
    }

    return (data as DbGist[]) ?? [];
  } catch (error) {
    console.error("Error fetching recent gists:", error);
    return [];
  }
}

