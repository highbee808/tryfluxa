/**
 * Admin Ingestion Pause API Endpoint
 * 
 * POST /api/admin-ingestion-pause - Pause all content ingestion
 * 
 * Sets ingestion.enabled = false in content_config table.
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

const CONFIG_KEY = 'ingestion.enabled';

/**
 * POST handler - Pause ingestion
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  const now = new Date().toISOString();
  
  try {
    // Get current state
    const { data: existing, error: selectError } = await supabase
      .from('content_config')
      .select('config_value')
      .eq('config_key', CONFIG_KEY)
      .maybeSingle();
    
    if (selectError) {
      console.error('[Admin Ingestion] Database error:', selectError);
      sendError(res, 500, 'Database error', 'Failed to check ingestion status');
      return;
    }
    
    const wasEnabled = existing?.config_value === true;
    
    // Update or insert config
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('content_config')
        .update({
          config_value: false,
          updated_at: now,
        })
        .eq('config_key', CONFIG_KEY)
        .select('*')
        .single();
      
      if (error) {
        console.error('[Admin Ingestion] Update error:', error);
        sendError(res, 500, 'Database error', 'Failed to pause ingestion');
        return;
      }
      
      result = data;
    } else {
      // Create config if it doesn't exist
      const { data, error } = await supabase
        .from('content_config')
        .insert({
          config_key: CONFIG_KEY,
          config_value: false,
          description: 'Enable/disable content ingestion',
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('[Admin Ingestion] Insert error:', error);
        sendError(res, 500, 'Database error', 'Failed to create ingestion config');
        return;
      }
      
      result = data;
    }
    
    // Log the admin action
    logAdminAction(
      'pause_ingestion',
      {
        was_enabled: wasEnabled,
        now_enabled: false,
      },
      req
    );
    
    sendSuccess(res, {
      success: true,
      ingestion_enabled: false,
      message: wasEnabled 
        ? 'Ingestion has been paused' 
        : 'Ingestion was already paused',
      config: result,
    });
  } catch (error: any) {
    console.error('[Admin Ingestion] Unexpected error:', error);
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
