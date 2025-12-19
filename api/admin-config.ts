/**
 * Admin Config API Endpoint
 * 
 * GET /api/admin-config - Read all or specific config entries
 * POST /api/admin-config - Update a config value
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
 * Allowed config keys with their expected types for validation
 */
const CONFIG_SCHEMA: Record<string, { type: string; description: string }> = {
  'ingestion.enabled': { type: 'boolean', description: 'Global ingestion pause/resume' },
  'ingestion.max_items_per_run': { type: 'number', description: 'Max items per ingestion run' },
  'ingestion.refresh_interval_minutes': { type: 'number', description: 'Ingestion refresh interval in minutes' },
  'ingestion.default_categories': { type: 'array', description: 'Default categories for content' },
  'deduplication.hash_algorithm': { type: 'string', description: 'Hash algorithm for deduplication' },
  'sports.enabled': { type: 'boolean', description: 'Enable sports content ingestion' },
  'sports.leagues': { type: 'array', description: 'Active sports leagues' },
};

/**
 * Validate config value type
 */
function validateConfigValue(key: string, value: any): { valid: boolean; error?: string } {
  const schema = CONFIG_SCHEMA[key];
  
  if (!schema) {
    // Allow unknown keys but log a warning
    console.warn(`[Admin Config] Unknown config key: ${key}`);
    return { valid: true };
  }
  
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (schema.type !== actualType) {
    return {
      valid: false,
      error: `Invalid type for ${key}: expected ${schema.type}, got ${actualType}`,
    };
  }
  
  // Additional validation for numbers
  if (schema.type === 'number' && (value < 0 || !Number.isFinite(value))) {
    return {
      valid: false,
      error: `Invalid value for ${key}: must be a non-negative finite number`,
    };
  }
  
  return { valid: true };
}

/**
 * GET handler - Read config entries
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  const key = req.query.key as string | undefined;
  
  try {
    let query = supabase
      .from('content_config')
      .select('config_key, config_value, description, is_active, created_at, updated_at');
    
    if (key) {
      query = query.eq('config_key', key);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[Admin Config] Database error:', error);
      sendError(res, 500, 'Database error', 'Failed to fetch config entries');
      return;
    }
    
    if (key && (!data || data.length === 0)) {
      sendError(res, 404, 'Not found', `Config key '${key}' not found`);
      return;
    }
    
    sendSuccess(res, { configs: data || [] });
  } catch (error: any) {
    console.error('[Admin Config] Unexpected error:', error);
    sendError(res, 500, 'Internal error', error.message);
  }
}

/**
 * POST handler - Update config value
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse and validate request body
  const { key, value, description } = req.body || {};
  
  if (!key || typeof key !== 'string') {
    sendError(res, 400, 'Invalid input', 'Missing or invalid "key" field');
    return;
  }
  
  if (value === undefined) {
    sendError(res, 400, 'Invalid input', 'Missing "value" field');
    return;
  }
  
  // Validate value type against schema
  const validation = validateConfigValue(key, value);
  if (!validation.valid) {
    sendError(res, 400, 'Invalid input', validation.error);
    return;
  }
  
  try {
    // Check if config key exists
    const { data: existing, error: selectError } = await supabase
      .from('content_config')
      .select('config_key, config_value')
      .eq('config_key', key)
      .maybeSingle();
    
    if (selectError) {
      console.error('[Admin Config] Database error:', selectError);
      sendError(res, 500, 'Database error', 'Failed to check existing config');
      return;
    }
    
    const oldValue = existing?.config_value;
    const now = new Date().toISOString();
    
    let result;
    if (existing) {
      // Update existing config
      const updateData: Record<string, any> = {
        config_value: value,
        updated_at: now,
      };
      
      if (description !== undefined) {
        updateData.description = description;
      }
      
      const { data, error } = await supabase
        .from('content_config')
        .update(updateData)
        .eq('config_key', key)
        .select('*')
        .single();
      
      if (error) {
        console.error('[Admin Config] Update error:', error);
        sendError(res, 500, 'Database error', 'Failed to update config');
        return;
      }
      
      result = data;
    } else {
      // Insert new config
      const { data, error } = await supabase
        .from('content_config')
        .insert({
          config_key: key,
          config_value: value,
          description: description || CONFIG_SCHEMA[key]?.description || null,
          is_active: true,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('[Admin Config] Insert error:', error);
        sendError(res, 500, 'Database error', 'Failed to create config');
        return;
      }
      
      result = data;
    }
    
    // Log the admin action
    logAdminAction(
      existing ? 'update_config' : 'create_config',
      {
        key,
        old_value: oldValue,
        new_value: value,
      },
      req
    );
    
    sendSuccess(res, {
      success: true,
      config: result,
    });
  } catch (error: any) {
    console.error('[Admin Config] Unexpected error:', error);
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
  
  switch (req.method) {
    case 'GET':
      await handleGet(req, res);
      break;
    case 'POST':
      await handlePost(req, res);
      break;
    default:
      sendError(res, 405, 'Method not allowed', `${req.method} is not supported`);
  }
}
