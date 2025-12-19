/**
 * Admin Action - Trigger Cron API Endpoint
 * 
 * POST /api/admin-action-trigger-cron - Manually trigger the ingestion pipeline
 * 
 * Request Body (optional):
 * - source_key?: string - Run specific source only
 * - force?: boolean - Ignore freshness window (default false)
 * 
 * Rate Limiting: Logs all attempts with timestamp and IP
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

interface TriggerResult {
  source_key: string;
  run_id: string;
  items_created: number;
  status: string;
  error: string | null;
}

interface TriggerResponse {
  success: boolean;
  message: string;
  results?: TriggerResult[];
  execution_time_ms: number;
}

/**
 * Get all enabled content sources
 */
async function getEnabledSources(sourceFilter?: string): Promise<any[]> {
  const supabase = getAdminSupabaseClient();
  
  let query = supabase
    .from('content_sources')
    .select('id, source_key, name, is_active')
    .eq('is_active', true);
  
  if (sourceFilter) {
    query = query.eq('source_key', sourceFilter);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(`Failed to load content sources: ${error.message}`);
  }
  
  // Filter out expired adapters
  const expiredAdapters = ['guardian', 'mediastack', 'newsapi'];
  return (data || []).filter(
    source => !expiredAdapters.includes(source.source_key)
  );
}

/**
 * POST handler - Trigger ingestion
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const startTime = Date.now();
  
  // Parse request body
  const { source_key, force = false } = req.body || {};
  
  // Log the admin action
  logAdminAction('trigger_cron', {
    source_key: source_key || 'all',
    force,
  }, req);
  
  try {
    // Get sources to process
    const sources = await getEnabledSources(source_key);
    
    if (sources.length === 0) {
      const response: TriggerResponse = {
        success: true,
        message: source_key 
          ? `No active source found with key "${source_key}"`
          : 'No active sources configured',
        results: [],
        execution_time_ms: Date.now() - startTime,
      };
      sendSuccess(res, response);
      return;
    }
    
    const results: TriggerResult[] = [];
    
    // Process each source
    for (const source of sources) {
      try {
        console.log(`[Admin Action] Processing source: ${source.source_key}`);
        
        const result = await runIngestion(source.source_key, { force });
        
        results.push({
          source_key: source.source_key,
          run_id: result.runId || '',
          items_created: result.itemsCreated,
          status: result.success ? 'success' : (result.skippedReason || 'failed'),
          error: result.error || null,
        });
      } catch (err: any) {
        console.error(`[Admin Action] Error processing ${source.source_key}:`, err.message);
        results.push({
          source_key: source.source_key,
          run_id: '',
          items_created: 0,
          status: 'error',
          error: err.message || 'Unknown error',
        });
      }
    }
    
    const executionTime = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed' || r.status === 'error').length;
    
    const response: TriggerResponse = {
      success: failedCount === 0 || successCount > 0,
      message: `Processed ${sources.length} source(s): ${successCount} succeeded, ${failedCount} failed`,
      results,
      execution_time_ms: executionTime,
    };
    
    sendSuccess(res, response);
  } catch (error: any) {
    console.error('[Admin Action] Trigger cron error:', error);
    const response: TriggerResponse = {
      success: false,
      message: error.message || 'Failed to trigger cron',
      execution_time_ms: Date.now() - startTime,
    };
    sendError(res, 500, 'Internal error', response.message);
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
