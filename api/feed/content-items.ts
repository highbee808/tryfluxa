/**
 * Vercel serverless function for fetching content_items for feed display
 * 
 * PRIMARY SOURCE: content_items table (from ingestion pipeline)
 * 
 * Queries content_items from active sources, filters by user_content_seen,
 * and returns items sorted by published_at (fallback to created_at) for chronological feed display.
 * 
 * Observability: Logs source attribution and exclusion reasons for each request.
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
  ai_summary: string | null;
  published_at: string | null;
  image_url: string | null;
  categories: string[];
  created_at: string;
}

interface FeedResponse {
  items: ContentItemResponse[];
  count: number;
  meta?: {
    sources: Record<string, number>;
    excluded: {
      inactiveSource: number;
      seenByUser: number;
      outsideFreshness: number;
    };
    newestItemAt: string | null;
    queryTimeMs: number;
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  
  // Observability counters
  const excluded = {
    inactiveSource: 0,
    seenByUser: 0,
    outsideFreshness: 0,
  };
  const sourceCounts: Record<string, number> = {};

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
    const includeMeta = req.query.meta === 'true'; // Include observability metadata

    // Calculate cutoff time
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - maxAgeHours);

    // Get Supabase client (service role)
    const supabase = getSupabaseClient();

    // First, get active source IDs (unless source override)
    let sourceQuery = supabase
      .from('content_sources')
      .select('id, source_key, name, is_active');
    
    if (sourceKey) {
      // Override: filter by specific source_key (for testing)
      sourceQuery = sourceQuery.eq('source_key', sourceKey);
    }
    // Note: we fetch all sources to track inactive exclusions, then filter

    const { data: allSources, error: sourcesError } = await sourceQuery;

    if (sourcesError) {
      console.error('[Feed API] Sources query error:', sourcesError);
      return res.status(500).json({
        error: 'Failed to fetch sources',
        message: sourcesError.message,
      });
    }

    // Filter to active sources only (unless specific source requested)
    const sources = (allSources || []).filter(s => {
      if (sourceKey) return true; // If specific source requested, include it
      if (!s.is_active) {
        excluded.inactiveSource++;
        return false;
      }
      return true;
    });

    if (!sources || sources.length === 0) {
      console.log('[Feed API] No active sources found');
      return res.status(200).json({ items: [], count: 0 });
    }

    const sourceIds = sources.map(s => s.id);
    const sourceMap = new Map(sources.map(s => [s.id, s]));

    // Build query for content_items
    // Sort by published_at first, fallback to created_at for items without published_at
    let query = supabase
      .from('content_items')
      .select(`
        id,
        source_id,
        title,
        url,
        excerpt,
        ai_summary,
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
      .order('created_at', { ascending: false }) // Secondary sort for items without published_at
      .limit(limit * 2); // Fetch extra to account for filtering

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
      const sourceKeyVal = source?.source_key || 'unknown';
      
      // Track source attribution
      sourceCounts[sourceKeyVal] = (sourceCounts[sourceKeyVal] || 0) + 1;
      
      const categories = (item.content_item_categories || [])
        .map((cic: any) => cic.content_categories?.name)
        .filter(Boolean);

      return {
        id: item.id,
        source_id: item.source_id,
        source_key: sourceKeyVal,
        source_name: source?.name || '',
        title: item.title,
        url: item.url,
        excerpt: item.excerpt,
        ai_summary: item.ai_summary || null,
        published_at: item.published_at,
        image_url: item.image_url,
        categories,
        created_at: item.created_at,
      };
    });

    // Filter by category if provided (client-side since Supabase join filtering is complex)
    if (category) {
      const beforeCount = items.length;
      items = items.filter(item => item.categories.includes(category));
      console.log(`[Feed API] Category filter "${category}": ${beforeCount} -> ${items.length}`);
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
        excluded.seenByUser = seenIds.size;
        filteredItems = items.filter(item => !seenIds.has(item.id));
      }
    }

    // Apply final limit
    filteredItems = filteredItems.slice(0, limit);

    // Determine newest item timestamp (for cache invalidation)
    const newestItemAt = filteredItems.length > 0 
      ? filteredItems[0].published_at || filteredItems[0].created_at 
      : null;

    const queryTimeMs = Date.now() - startTime;

    // Log observability summary
    console.log(`[Feed API] Served ${filteredItems.length} items from ${Object.keys(sourceCounts).length} sources in ${queryTimeMs}ms`, {
      sources: sourceCounts,
      excluded,
      newestItemAt,
    });

    const response: FeedResponse = {
      items: filteredItems,
      count: filteredItems.length,
    };

    // Include metadata if requested (for debugging/observability)
    if (includeMeta) {
      response.meta = {
        sources: sourceCounts,
        excluded,
        newestItemAt,
        queryTimeMs,
      };
    }

    // Set cache headers: short TTL since content updates frequently
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.setHeader('X-Feed-Newest-At', newestItemAt || '');
    res.setHeader('X-Feed-Query-Time', String(queryTimeMs));

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Feed API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || String(error),
    });
  }
}
