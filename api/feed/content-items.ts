/**
 * Vercel serverless function for fetching content_items for feed display
 * 
 * Queries content_items from active sources, filters by user_content_seen,
 * and returns items sorted by published_at for chronological feed display.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_internal/ingestion/db.js';

interface ContentItemResponse {
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

interface FeedResponse {
  items: ContentItemResponse[];
  count: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Parse query parameters
    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      100 // Max limit
    );
    const maxAgeHours = parseInt(req.query.maxAgeHours as string) || 168; // Default 7 days
    const category = req.query.category as string | undefined;
    const sourceKey = req.query.source as string | undefined; // Override for testing
    const excludeSeen = req.query.excludeSeen !== 'false'; // Default true
    const userId = req.query.userId as string | undefined;

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    // Get Supabase client (service role)
    const supabase = getSupabaseClient();

    // First, get active source IDs (unless source override)
    let sourceQuery = supabase
      .from('content_sources')
      .select('id, source_key, name');
    
    if (sourceKey) {
      // Override: filter by specific source_key (for testing)
      sourceQuery = sourceQuery.eq('source_key', sourceKey);
    } else {
      // Default: only active sources
      sourceQuery = sourceQuery.eq('is_active', true);
    }

    const { data: sources, error: sourcesError } = await sourceQuery;

    if (sourcesError) {
      console.error('[Feed API] Sources query error:', sourcesError);
      return res.status(500).json({
        error: 'Failed to fetch sources',
        message: sourcesError.message,
      });
    }

    if (!sources || sources.length === 0) {
      return res.status(200).json({ items: [], count: 0 });
    }

    const sourceIds = sources.map(s => s.id);
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    // Build query for content_items
    let query = supabase
      .from('content_items')
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
        )
      `)
      .in('source_id', sourceIds)
      .gte('created_at', cutoffTime.toISOString())
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    // Filter by category if provided (requires join)
    // Note: This is approximate - we'll filter in code after fetch if needed
    // Supabase doesn't easily support filtering nested relations in this way

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('[Feed API] Query error:', error);
      return res.status(500).json({
        error: 'Database query failed',
        message: error.message,
      });
    }

    // Transform data to response format
    let items: ContentItemResponse[] = (data || []).map((item: any) => {
      const source = sourceMap.get(item.source_id);
      const categories = (item.content_item_categories || [])
        .map((cic: any) => cic.content_categories?.name)
        .filter(Boolean);

      return {
        id: item.id,
        source_id: item.source_id,
        source_key: source?.source_key || '',
        source_name: source?.name || '',
        title: item.title,
        url: item.url,
        excerpt: item.excerpt,
        published_at: item.published_at,
        image_url: item.image_url,
        categories,
        created_at: item.created_at,
      };
    });

    // Filter by category if provided (client-side since Supabase join filtering is complex)
    if (category) {
      items = items.filter(item => item.categories.includes(category));
    }

    // Filter out seen items if userId provided and excludeSeen is true
    let filteredItems = items;
    if (excludeSeen && userId && items.length > 0) {
      const itemIds = items.map(item => item.id);
      const { data: seenData, error: seenError } = await supabase
        .from('user_content_seen')
        .select('content_item_id')
        .eq('user_id', userId)
        .in('content_item_id', itemIds);

      if (!seenError && seenData) {
        const seenIds = new Set(seenData.map(row => row.content_item_id));
        filteredItems = items.filter(item => !seenIds.has(item.id));
      }
    }

    const response: FeedResponse = {
      items: filteredItems,
      count: filteredItems.length,
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Feed API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || String(error),
    });
  }
}
