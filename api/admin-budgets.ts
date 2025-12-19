/**
 * Admin Budgets API Endpoint
 * 
 * GET /api/admin-budgets - View current budget usage for all or specific sources
 * POST /api/admin-budgets - Set budget limit for a source
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
 * Get current period boundaries (UTC day)
 */
function getCurrentPeriod(): { start: string; end: string } {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  
  return {
    start: periodStart.toISOString(),
    end: periodEnd.toISOString(),
  };
}

/**
 * GET handler - View budget usage
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  const sourceKey = req.query.source_key as string | undefined;
  const period = getCurrentPeriod();
  
  try {
    // Get all sources first
    let sourcesQuery = supabase
      .from('content_sources')
      .select('id, source_key, name, rate_limit_per_hour');
    
    if (sourceKey) {
      sourcesQuery = sourcesQuery.eq('source_key', sourceKey);
    }
    
    const { data: sources, error: sourcesError } = await sourcesQuery;
    
    if (sourcesError) {
      console.error('[Admin Budgets] Database error:', sourcesError);
      sendError(res, 500, 'Database error', 'Failed to fetch sources');
      return;
    }
    
    if (sourceKey && (!sources || sources.length === 0)) {
      sendError(res, 404, 'Not found', `Source '${sourceKey}' not found`);
      return;
    }
    
    // Get budget usage for current period
    const sourceIds = (sources || []).map(s => s.id);
    
    let budgetsQuery = supabase
      .from('api_usage_budget')
      .select('*')
      .in('source_id', sourceIds)
      .gte('period_start', period.start)
      .lt('period_end', period.end);
    
    const { data: budgets, error: budgetsError } = await budgetsQuery;
    
    if (budgetsError) {
      console.error('[Admin Budgets] Database error:', budgetsError);
      sendError(res, 500, 'Database error', 'Failed to fetch budgets');
      return;
    }
    
    // Map budgets to sources
    const budgetMap = new Map((budgets || []).map(b => [b.source_id, b]));
    
    const result = (sources || []).map(source => {
      const budget = budgetMap.get(source.id);
      return {
        source_key: source.source_key,
        source_name: source.name,
        source_id: source.id,
        rate_limit_per_hour: source.rate_limit_per_hour,
        period_start: period.start,
        period_end: period.end,
        budget_limit: budget?.budget_limit ?? null,
        usage_count: budget?.usage_count ?? 0,
        remaining: budget?.budget_limit != null 
          ? Math.max(0, budget.budget_limit - (budget?.usage_count ?? 0))
          : null,
        last_reset_at: budget?.last_reset_at ?? null,
      };
    });
    
    sendSuccess(res, {
      budgets: result,
      current_period: period,
    });
  } catch (error: any) {
    console.error('[Admin Budgets] Unexpected error:', error);
    sendError(res, 500, 'Internal error', error.message);
  }
}

/**
 * POST handler - Set budget limit
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  // Parse and validate request body
  const { source_key, daily_limit } = req.body || {};
  
  if (!source_key || typeof source_key !== 'string') {
    sendError(res, 400, 'Invalid input', 'Missing or invalid "source_key" field');
    return;
  }
  
  if (typeof daily_limit !== 'number' || daily_limit < 0 || !Number.isInteger(daily_limit)) {
    sendError(res, 400, 'Invalid input', '"daily_limit" must be a non-negative integer');
    return;
  }
  
  try {
    // Check if source exists
    const { data: source, error: sourceError } = await supabase
      .from('content_sources')
      .select('id, source_key')
      .eq('source_key', source_key)
      .maybeSingle();
    
    if (sourceError) {
      console.error('[Admin Budgets] Database error:', sourceError);
      sendError(res, 500, 'Database error', 'Failed to check source');
      return;
    }
    
    if (!source) {
      sendError(res, 404, 'Not found', `Source '${source_key}' not found`);
      return;
    }
    
    const period = getCurrentPeriod();
    const now = new Date().toISOString();
    
    // Check if budget record exists for current period
    const { data: existing, error: selectError } = await supabase
      .from('api_usage_budget')
      .select('*')
      .eq('source_id', source.id)
      .gte('period_start', period.start)
      .lt('period_end', period.end)
      .maybeSingle();
    
    if (selectError) {
      console.error('[Admin Budgets] Database error:', selectError);
      sendError(res, 500, 'Database error', 'Failed to check existing budget');
      return;
    }
    
    const oldLimit = existing?.budget_limit;
    let result;
    
    if (existing) {
      // Update existing budget
      const { data, error } = await supabase
        .from('api_usage_budget')
        .update({
          budget_limit: daily_limit,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      
      if (error) {
        console.error('[Admin Budgets] Update error:', error);
        sendError(res, 500, 'Database error', 'Failed to update budget');
        return;
      }
      
      result = data;
    } else {
      // Create new budget record
      const { data, error } = await supabase
        .from('api_usage_budget')
        .insert({
          source_id: source.id,
          period_start: period.start,
          period_end: period.end,
          budget_limit: daily_limit,
          usage_count: 0,
          last_reset_at: period.start,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('[Admin Budgets] Insert error:', error);
        sendError(res, 500, 'Database error', 'Failed to create budget');
        return;
      }
      
      result = data;
    }
    
    // Log the admin action
    logAdminAction(
      existing ? 'update_budget' : 'create_budget',
      {
        source_key,
        old_limit: oldLimit,
        new_limit: daily_limit,
        period_start: period.start,
        period_end: period.end,
      },
      req
    );
    
    sendSuccess(res, {
      success: true,
      budget: {
        ...result,
        source_key,
        remaining: Math.max(0, daily_limit - (result.usage_count || 0)),
      },
    });
  } catch (error: any) {
    console.error('[Admin Budgets] Unexpected error:', error);
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
