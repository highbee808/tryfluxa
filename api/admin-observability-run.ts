/**
 * Admin Observability - Single Run Detail API Endpoint
 * 
 * GET /api/admin-observability-run?id=<uuid> - Get detailed run information
 * 
 * Query Parameters:
 * - id (required): Run UUID
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

interface RunDetailResponse {
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
  metadata: Record<string, any>;
}

/**
 * GET handler - Get single run detail
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse query parameters
  const runId = req.query.id as string | undefined;
  
  if (!runId) {
    sendError(res, 400, 'Missing parameter', 'Query parameter "id" is required');
    return;
  }
  
  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(runId)) {
    sendError(res, 400, 'Invalid parameter', 'Query parameter "id" must be a valid UUID');
    return;
  }
  
  try {
    // Fetch the run
    const { data: run, error: runError } = await supabase
      .from('content_runs')
      .select('*')
      .eq('id', runId)
      .maybeSingle();
    
    if (runError) {
      console.error('[Admin Observability Run] Query error:', runError);
      sendError(res, 500, 'Database error', 'Failed to fetch run');
      return;
    }
    
    if (!run) {
      sendError(res, 404, 'Not found', `Run with id "${runId}" not found`);
      return;
    }
    
    // Fetch the source
    const { data: source, error: sourceError } = await supabase
      .from('content_sources')
      .select('source_key, name')
      .eq('id', run.source_id)
      .maybeSingle();
    
    if (sourceError) {
      console.error('[Admin Observability Run] Source query error:', sourceError);
    }
    
    const response: RunDetailResponse = {
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
      metadata: run.metadata || {},
    };
    
    sendSuccess(res, { run: response });
  } catch (error: any) {
    console.error('[Admin Observability Run] Unexpected error:', error);
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
