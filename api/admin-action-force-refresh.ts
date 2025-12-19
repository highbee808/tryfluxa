/**
 * Admin Action - Force Refresh API Endpoint
 * 
 * POST /api/admin-action-force-refresh - Force refresh a specific source
 * 
 * Request Body:
 * - source_key: string (required) - Source to refresh
 * 
 * This endpoint bypasses the cadence/freshness window check.
 * 
 * Requires x-admin-secret header for authentication.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  requireAdminAuth,
  getAdminSupabaseClient,
  logAdminAction,
  sendError,
  sendSuccess,
} from './_internal/admin-auth.js';
import { runIngestion } from './_internal/ingestion/runner.js';

interface ForceRefreshResponse {
  success: boolean;
  run_id: string;
  items_fetched: number;
  items_created: number;
  items_skipped: number;
  message: string;
}

/**
 * POST handler - Force refresh a source
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse request body
  const { source_key } = req.body || {};
  
  if (!source_key || typeof source_key !== 'string') {
    sendError(res, 400, 'Missing parameter', 'Request body must include "source_key" string');
    return;
  }
  
  // Log the admin action
  logAdminAction('force_refresh', { source_key }, req);
  
  try {
    // Verify source exists and is active
    const { data: source, error: sourceError } = await supabase
      .from('content_sources')
      .select('id, source_key, name, is_active')
      .eq('source_key', source_key)
      .maybeSingle();
    
    if (sourceError) {
      console.error('[Admin Action] Source query error:', sourceError);
      sendError(res, 500, 'Database error', 'Failed to verify source');
      return;
    }
    
    if (!source) {
      sendError(res, 404, 'Not found', `Source "${source_key}" not found`);
      return;
    }
    
    if (!source.is_active) {
      sendError(res, 400, 'Source disabled', `Source "${source_key}" is currently disabled. Enable it first.`);
      return;
    }
    
    // Run ingestion with force=true
    console.log(`[Admin Action] Force refreshing source: ${source_key}`);
    const result = await runIngestion(source_key, { force: true });
    
    const response: ForceRefreshResponse = {
      success: result.success,
      run_id: result.runId || '',
      items_fetched: result.itemsFetched,
      items_created: result.itemsCreated,
      items_skipped: result.itemsSkipped,
      message: result.success 
        ? `Successfully refreshed ${source_key}: ${result.itemsCreated} items created`
        : `Force refresh failed: ${result.error || 'Unknown error'}`,
    };
    
    if (result.success) {
      sendSuccess(res, response);
    } else {
      // Still return 200 but indicate failure in response
      sendSuccess(res, response);
    }
  } catch (error: any) {
    console.error('[Admin Action] Force refresh error:', error);
    sendError(res, 500, 'Internal error', error.message || 'Failed to force refresh');
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
  
  if (req.method !== 'POST') {
    sendError(res, 405, 'Method not allowed', 'Only POST is supported');
    return;
  }
  
  await handlePost(req, res);
}
