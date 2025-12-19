/**
 * Admin Observability - Source Health API Endpoint
 * 
 * GET /api/admin-observability-sources - Get health status for all content sources
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

interface SourceHealthResponse {
  id: string;
  source_key: string;
  name: string;
  is_active: boolean;
  config: Record<string, any>;
  health: {
    last_success_at: string | null;
    last_error_at: string | null;
    last_error_reason: string | null;
    items_generated_last_run: number;
    consecutive_failures: number;
    last_run_id: string | null;
  } | null;
}

/**
 * GET handler - List sources with health status
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  try {
    // Fetch all sources
    const { data: sources, error: sourcesError } = await supabase
      .from('content_sources')
      .select('id, source_key, name, is_active, config')
      .order('name', { ascending: true });
    
    if (sourcesError) {
      console.error('[Admin Observability Sources] Sources query error:', sourcesError);
      sendError(res, 500, 'Database error', 'Failed to fetch sources');
      return;
    }
    
    if (!sources || sources.length === 0) {
      sendSuccess(res, { sources: [], total: 0 });
      return;
    }
    
    // Fetch health records for all sources
    const sourceIds = sources.map(s => s.id);
    const { data: healthRecords, error: healthError } = await supabase
      .from('content_source_health')
      .select('*')
      .in('source_id', sourceIds);
    
    if (healthError) {
      console.error('[Admin Observability Sources] Health query error:', healthError);
      // Continue without health data - it's optional
    }
    
    // Create a map of source_id -> health record
    const healthMap = new Map(
      (healthRecords || []).map(h => [h.source_id, h])
    );
    
    // Build response
    const response: SourceHealthResponse[] = sources.map(source => {
      const health = healthMap.get(source.id);
      
      return {
        id: source.id,
        source_key: source.source_key,
        name: source.name,
        is_active: source.is_active,
        config: source.config || {},
        health: health ? {
          last_success_at: health.last_success_at,
          last_error_at: health.last_error_at,
          last_error_reason: health.last_error_reason,
          items_generated_last_run: health.items_generated_last_run || 0,
          consecutive_failures: health.consecutive_failures || 0,
          last_run_id: health.last_run_id,
        } : null,
      };
    });
    
    sendSuccess(res, {
      sources: response,
      total: response.length,
    });
  } catch (error: any) {
    console.error('[Admin Observability Sources] Unexpected error:', error);
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
