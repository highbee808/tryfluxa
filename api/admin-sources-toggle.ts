/**
 * Admin Sources Toggle API Endpoint
 * 
 * POST /api/admin-sources-toggle - Enable or disable a content source
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

/**
 * POST handler - Toggle source active status
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse and validate request body
  const { source_key, is_active } = req.body || {};
  
  if (!source_key || typeof source_key !== 'string') {
    sendError(res, 400, 'Invalid input', 'Missing or invalid "source_key" field');
    return;
  }
  
  if (typeof is_active !== 'boolean') {
    sendError(res, 400, 'Invalid input', 'Missing or invalid "is_active" field (must be boolean)');
    return;
  }
  
  try {
    // Check if source exists
    const { data: existing, error: selectError } = await supabase
      .from('content_sources')
      .select('id, source_key, is_active')
      .eq('source_key', source_key)
      .maybeSingle();
    
    if (selectError) {
      console.error('[Admin Sources] Database error:', selectError);
      sendError(res, 500, 'Database error', 'Failed to check existing source');
      return;
    }
    
    if (!existing) {
      sendError(res, 404, 'Not found', `Source '${source_key}' not found`);
      return;
    }
    
    const oldValue = existing.is_active;
    
    // Update source status
    const { data, error } = await supabase
      .from('content_sources')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('source_key', source_key)
      .select('*')
      .single();
    
    if (error) {
      console.error('[Admin Sources] Update error:', error);
      sendError(res, 500, 'Database error', 'Failed to update source');
      return;
    }
    
    // Log the admin action
    logAdminAction(
      'toggle_source',
      {
        source_key,
        old_is_active: oldValue,
        new_is_active: is_active,
      },
      req
    );
    
    sendSuccess(res, {
      success: true,
      source: data,
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
