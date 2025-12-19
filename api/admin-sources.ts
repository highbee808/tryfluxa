/**
 * Admin Sources List API Endpoint
 * 
 * GET /api/admin-sources - List all content sources with their status
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

// #region agent log - Hypothesis A,E: Track that module loaded successfully
const MODULE_LOADED_AT = new Date().toISOString();
// #endregion

/**
 * GET handler - List all content sources
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('content_sources')
      .select('id, source_key, name, api_base_url, is_active, config, rate_limit_per_hour, created_at, updated_at')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('[Admin Sources] Database error:', error);
      sendError(res, 500, 'Database error', 'Failed to fetch content sources');
      return;
    }
    
    sendSuccess(res, {
      sources: data || [],
      total: data?.length || 0,
    });
  } catch (error: any) {
    console.error('[Admin Sources] Unexpected error:', error);
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
  // #region agent log - Hypothesis B,D: Debug mode to test if handler is reached
  if (req.query.debug === 'true') {
    return res.status(200).json({
      ok: true,
      route: '/api/admin-sources',
      moduleLoadedAt: MODULE_LOADED_AT,
      method: req.method,
      timestamp: new Date().toISOString(),
      message: 'Handler reached successfully - module imports worked',
    });
  }
  // #endregion

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
