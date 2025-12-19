/**
 * Admin Observability - List Runs API Endpoint
 * 
 * GET /api/admin-observability-runs - List recent ingestion runs with filtering
 * 
 * Query Parameters:
 * - source_key (optional): Filter by source
 * - status (optional): Filter by status (completed, failed, running, skipped)
 * - limit (optional, default 50, max 100)
 * - offset (optional, default 0)
 * 
 * Requires x-admin-secret header for authentication.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  requireAdminAuth,
  getAdminSupabaseClient,
  sendError,
  sendSuccess,
} from './_internal/admin-auth.js';

interface RunResponse {
  id: string;
  source_id: string;
  source_key: string;
  source_name: string;
  status: string;
  items_fetched: number;
  items_created: number;
  items_skipped: number;
  items_updated: number;
  skipped_reason: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

/**
 * GET handler - List recent ingestion runs
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse query parameters
  const sourceKey = req.query.source_key as string | undefined;
  const status = req.query.status as string | undefined;
  const limit = Math.min(
    Math.max(1, parseInt(req.query.limit as string) || 50),
    100 // Max limit
  );
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  
  try {
    // First, get source mapping
    const { data: sources, error: sourcesError } = await supabase
      .from('content_sources')
      .select('id, source_key, name');
    
    if (sourcesError) {
      console.error('[Admin Observability Runs] Sources query error:', sourcesError);
      sendError(res, 500, 'Database error', 'Failed to fetch sources');
      return;
    }
    
    const sourceMap = new Map(
      (sources || []).map(s => [s.id, { source_key: s.source_key, name: s.name }])
    );
    
    // Build runs query
    let query = supabase
      .from('content_runs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Filter by source_key if provided
    if (sourceKey) {
      const matchingSource = sources?.find(s => s.source_key === sourceKey);
      if (matchingSource) {
        query = query.eq('source_id', matchingSource.id);
      } else {
        // No matching source, return empty
        sendSuccess(res, { runs: [], total: 0, limit, offset });
        return;
      }
    }
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Admin Observability Runs] Query error:', error);
      sendError(res, 500, 'Database error', 'Failed to fetch runs');
      return;
    }
    
    // Transform data
    const runs: RunResponse[] = (data || []).map(run => {
      const source = sourceMap.get(run.source_id);
      return {
        id: run.id,
        source_id: run.source_id,
        source_key: source?.source_key || 'unknown',
        source_name: source?.name || 'Unknown Source',
        status: run.status,
        items_fetched: run.items_fetched || 0,
        items_created: run.items_created || 0,
        items_skipped: run.items_skipped || 0,
        items_updated: run.items_updated || 0,
        skipped_reason: run.skipped_reason || null,
        error_message: run.error_message || null,
        started_at: run.started_at,
        completed_at: run.completed_at,
      };
    });
    
    sendSuccess(res, {
      runs,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Admin Observability Runs] Unexpected error:', error);
    sendError(res, 500, 'Internal error', error.message);
  }
}

/**
 * Main handler
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Validate admin authentication
  if (!requireAdminAuth(req, res)) {
    return;
  }
  
  if (req.method !== 'GET') {
    sendError(res, 405, 'Method not allowed', 'Only GET is supported');
    return;
  }
  
  await handleGet(req, res);
}
