/**
 * Admin Sources Config API Endpoint
 * 
 * POST /api/admin-sources-config - Update source-specific configuration
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
 * Deep merge two objects (non-destructive)
 */
function mergeConfig(existing: Record<string, any>, updates: Record<string, any>): Record<string, any> {
  const result = { ...existing };
  
  for (const key of Object.keys(updates)) {
    const existingValue = result[key];
    const updateValue = updates[key];
    
    // Deep merge objects, but replace arrays and primitives
    if (
      existingValue &&
      typeof existingValue === 'object' &&
      !Array.isArray(existingValue) &&
      updateValue &&
      typeof updateValue === 'object' &&
      !Array.isArray(updateValue)
    ) {
      result[key] = mergeConfig(existingValue, updateValue);
    } else {
      result[key] = updateValue;
    }
  }
  
  return result;
}

/**
 * POST handler - Update source config
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse and validate request body
  const { source_key, config, rate_limit_per_hour } = req.body || {};
  
  if (!source_key || typeof source_key !== 'string') {
    sendError(res, 400, 'Invalid input', 'Missing or invalid "source_key" field');
    return;
  }
  
  if (config !== undefined && (typeof config !== 'object' || config === null || Array.isArray(config))) {
    sendError(res, 400, 'Invalid input', '"config" must be an object');
    return;
  }
  
  if (rate_limit_per_hour !== undefined) {
    if (typeof rate_limit_per_hour !== 'number' || rate_limit_per_hour < 0 || !Number.isInteger(rate_limit_per_hour)) {
      sendError(res, 400, 'Invalid input', '"rate_limit_per_hour" must be a non-negative integer');
      return;
    }
  }
  
  if (config === undefined && rate_limit_per_hour === undefined) {
    sendError(res, 400, 'Invalid input', 'Must provide at least one of "config" or "rate_limit_per_hour"');
    return;
  }
  
  try {
    // Check if source exists and get current config
    const { data: existing, error: selectError } = await supabase
      .from('content_sources')
      .select('id, source_key, config, rate_limit_per_hour')
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
    
    const oldConfig = existing.config || {};
    const oldRateLimit = existing.rate_limit_per_hour;
    
    // Build update payload
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    
    if (config !== undefined) {
      // Merge config non-destructively
      updateData.config = mergeConfig(oldConfig, config);
    }
    
    if (rate_limit_per_hour !== undefined) {
      updateData.rate_limit_per_hour = rate_limit_per_hour;
    }
    
    // Update source
    const { data, error } = await supabase
      .from('content_sources')
      .update(updateData)
      .eq('source_key', source_key)
      .select('*')
      .single();
    
    if (error) {
      console.error('[Admin Sources] Update error:', error);
      sendError(res, 500, 'Database error', 'Failed to update source config');
      return;
    }
    
    // Log the admin action
    logAdminAction(
      'update_source_config',
      {
        source_key,
        old_config: oldConfig,
        new_config: updateData.config || oldConfig,
        old_rate_limit: oldRateLimit,
        new_rate_limit: rate_limit_per_hour ?? oldRateLimit,
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
