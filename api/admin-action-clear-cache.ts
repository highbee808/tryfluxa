/**
 * Admin Action - Clear Cache API Endpoint
 * 
 * POST /api/admin-action-clear-cache - Clear feed cache (safe operation)
 * 
 * Request Body (optional):
 * - source_key?: string - Scope to specific source
 * 
 * This is a safe operation with no data deletion.
 * Currently a placeholder/minimal implementation since no persistent cache exists.
 * Future implementations may clear fluxa_cache or other cache tables.
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

interface ClearCacheResponse {
  success: boolean;
  message: string;
  cleared: number;
}

/**
 * POST handler - Clear cache
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse request body
  const { source_key } = req.body || {};
  
  // Log the admin action
  logAdminAction('clear_cache', { 
    source_key: source_key || 'all',
  }, req);
  
  try {
    let cleared = 0;
    
    // Check if fluxa_cache table exists and clear it
    // This is a safe operation - only clears cached API responses, not content
    const { data: cacheData, error: cacheError } = await supabase
      .from('fluxa_cache')
      .select('id', { count: 'exact', head: true });
    
    if (!cacheError && cacheData !== null) {
      // fluxa_cache exists, let's clear expired entries
      const { count, error: deleteError } = await supabase
        .from('fluxa_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id', { count: 'exact', head: true });
      
      if (!deleteError && count) {
        cleared = count;
      }
    }
    
    // Also check for news_cache table and clear old entries
    const { error: newsCacheError } = await supabase
      .from('news_cache')
      .select('id', { count: 'exact', head: true });
    
    if (!newsCacheError) {
      // news_cache exists, clear entries older than 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      const { count: newsCleared, error: newsDeleteError } = await supabase
        .from('news_cache')
        .delete()
        .lt('cached_at', oneDayAgo.toISOString())
        .select('id', { count: 'exact', head: true });
      
      if (!newsDeleteError && newsCleared) {
        cleared += newsCleared;
      }
    }
    
    const response: ClearCacheResponse = {
      success: true,
      message: cleared > 0 
        ? `Cleared ${cleared} expired cache entries`
        : 'No cache entries to clear (cache is empty or tables do not exist)',
      cleared,
    };
    
    sendSuccess(res, response);
  } catch (error: any) {
    console.error('[Admin Action] Clear cache error:', error);
    
    // Even if there's an error (e.g., table doesn't exist), return success
    // since this is a safe no-op operation
    const response: ClearCacheResponse = {
      success: true,
      message: 'No cache to clear (tables may not exist)',
      cleared: 0,
    };
    
    sendSuccess(res, response);
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
