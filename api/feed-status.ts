/**
 * Feed Status API Endpoint
 * 
 * GET /api/feed-status - Returns the latest content timestamp
 * 
 * Used by the frontend to determine if cached feed content is stale.
 * Compare the returned `newestItemAt` with the cached timestamp to decide
 * whether to refresh the feed.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from './_internal/ingestion/db.js';

interface FeedStatusResponse {
  newestItemAt: string | null;
  activeSourceCount: number;
  lastIngestionAt: string | null;
  sources: Array<{
    source_key: string;
    name: string;
    is_active: boolean;
    item_count: number;
  }>;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabaseClient();

    // Get active sources with their item counts
    const { data: sources, error: sourcesError } = await supabase
      .from('content_sources')
      .select('id, source_key, name, is_active')
      .eq('is_active', true);

    if (sourcesError) {
      console.error('[Feed Status] Sources query error:', sourcesError);
      return res.status(500).json({ error: 'Failed to fetch sources' });
    }

    if (!sources || sources.length === 0) {
      return res.status(200).json({
        newestItemAt: null,
        activeSourceCount: 0,
        lastIngestionAt: null,
        sources: [],
      });
    }

    const sourceIds = sources.map(s => s.id);

    // Get the newest content item timestamp
    const { data: newestItem, error: newestError } = await supabase
      .from('content_items')
      .select('published_at, created_at')
      .in('source_id', sourceIds)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (newestError) {
      console.error('[Feed Status] Newest item query error:', newestError);
    }

    // Get the last successful ingestion run
    const { data: lastRun, error: runError } = await supabase
      .from('content_runs')
      .select('completed_at')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (runError) {
      console.error('[Feed Status] Last run query error:', runError);
    }

    // Get item counts per source (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: itemCounts, error: countsError } = await supabase
      .from('content_items')
      .select('source_id')
      .in('source_id', sourceIds)
      .gte('created_at', sevenDaysAgo.toISOString());

    const countsBySource: Record<string, number> = {};
    if (!countsError && itemCounts) {
      for (const item of itemCounts) {
        countsBySource[item.source_id] = (countsBySource[item.source_id] || 0) + 1;
      }
    }

    const sourcesWithCounts = sources.map(s => ({
      source_key: s.source_key,
      name: s.name,
      is_active: s.is_active,
      item_count: countsBySource[s.id] || 0,
    }));

    const newestItemAt = newestItem?.published_at || newestItem?.created_at || null;
    const lastIngestionAt = lastRun?.completed_at || null;

    const response: FeedStatusResponse = {
      newestItemAt,
      activeSourceCount: sources.length,
      lastIngestionAt,
      sources: sourcesWithCounts,
    };

    // Short cache - status should be checked frequently
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.setHeader('X-Feed-Newest-At', newestItemAt || '');

    return res.status(200).json(response);
  } catch (error: any) {
    console.error('[Feed Status] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || String(error),
    });
  }
}
