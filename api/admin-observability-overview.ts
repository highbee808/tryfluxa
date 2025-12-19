/**
 * Admin Observability - Pipeline Overview API Endpoint
 * 
 * GET /api/admin-observability-overview - Get high-level pipeline summary
 * 
 * Provides:
 * - Last cron window summary
 * - Source counts (total, active, inactive, healthy, unhealthy)
 * - Recent runs summary
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

interface OverviewResponse {
  last_cron_window: {
    started_at: string | null;
    sources_processed: number;
    sources_succeeded: number;
    sources_failed: number;
    sources_skipped: number;
    total_items_created: number;
  };
  source_counts: {
    total: number;
    active: number;
    inactive: number;
    healthy: number;
    unhealthy: number;
  };
  recent_runs: Array<{
    source_key: string;
    status: string;
    completed_at: string;
    items_created: number;
    skipped_reason: string | null;
  }>;
}

/**
 * GET handler - Get pipeline overview
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  const supabase = getAdminSupabaseClient();
  
  try {
    // 1. Get source counts
    const { data: sources, error: sourcesError } = await supabase
      .from('content_sources')
      .select('id, source_key, name, is_active');
    
    if (sourcesError) {
      console.error('[Admin Observability Overview] Sources query error:', sourcesError);
      sendError(res, 500, 'Database error', 'Failed to fetch sources');
      return;
    }
    
    const sourceMap = new Map(
      (sources || []).map(s => [s.id, s])
    );
    
    const totalSources = sources?.length || 0;
    const activeSources = sources?.filter(s => s.is_active).length || 0;
    const inactiveSources = totalSources - activeSources;
    
    // 2. Get health records to determine healthy vs unhealthy
    const { data: healthRecords, error: healthError } = await supabase
      .from('content_source_health')
      .select('source_id, last_success_at, last_error_at, consecutive_failures');
    
    if (healthError) {
      console.error('[Admin Observability Overview] Health query error:', healthError);
    }
    
    // Healthy = last_success_at > last_error_at OR consecutive_failures = 0
    let healthySources = 0;
    let unhealthySources = 0;
    
    const healthMap = new Map(
      (healthRecords || []).map(h => [h.source_id, h])
    );
    
    for (const source of (sources || [])) {
      if (!source.is_active) continue; // Only count active sources for health
      
      const health = healthMap.get(source.id);
      if (!health) {
        // No health record yet - consider it neutral (not unhealthy)
        continue;
      }
      
      const isHealthy = 
        health.consecutive_failures === 0 ||
        (health.last_success_at && health.last_error_at && 
         new Date(health.last_success_at) > new Date(health.last_error_at));
      
      if (isHealthy) {
        healthySources++;
      } else {
        unhealthySources++;
      }
    }
    
    // 3. Get recent runs (last 24 hours or last 20, whichever is more useful)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const { data: recentRuns, error: runsError } = await supabase
      .from('content_runs')
      .select('source_id, status, completed_at, items_created, skipped_reason, started_at')
      .gte('started_at', twentyFourHoursAgo.toISOString())
      .order('started_at', { ascending: false })
      .limit(100);
    
    if (runsError) {
      console.error('[Admin Observability Overview] Runs query error:', runsError);
      sendError(res, 500, 'Database error', 'Failed to fetch runs');
      return;
    }
    
    // 4. Calculate last cron window stats
    // Find the most recent "batch" of runs (runs started within 5 minutes of each other)
    let lastCronWindow = {
      started_at: null as string | null,
      sources_processed: 0,
      sources_succeeded: 0,
      sources_failed: 0,
      sources_skipped: 0,
      total_items_created: 0,
    };
    
    if (recentRuns && recentRuns.length > 0) {
      const latestRun = recentRuns[0];
      const latestStarted = new Date(latestRun.started_at);
      const windowCutoff = new Date(latestStarted.getTime() - 5 * 60 * 1000); // 5 min window
      
      const windowRuns = recentRuns.filter(run => 
        new Date(run.started_at) >= windowCutoff
      );
      
      lastCronWindow.started_at = latestRun.started_at;
      lastCronWindow.sources_processed = windowRuns.length;
      
      for (const run of windowRuns) {
        if (run.status === 'completed') {
          lastCronWindow.sources_succeeded++;
          lastCronWindow.total_items_created += run.items_created || 0;
        } else if (run.status === 'failed') {
          lastCronWindow.sources_failed++;
        } else if (run.status === 'skipped') {
          lastCronWindow.sources_skipped++;
        }
      }
    }
    
    // 5. Build recent runs response (last 10 non-skipped runs)
    const recentRunsResponse = (recentRuns || [])
      .filter(run => run.completed_at) // Only completed runs
      .slice(0, 10)
      .map(run => {
        const source = sourceMap.get(run.source_id);
        return {
          source_key: source?.source_key || 'unknown',
          status: run.status,
          completed_at: run.completed_at,
          items_created: run.items_created || 0,
          skipped_reason: run.skipped_reason || null,
        };
      });
    
    const response: OverviewResponse = {
      last_cron_window: lastCronWindow,
      source_counts: {
        total: totalSources,
        active: activeSources,
        inactive: inactiveSources,
        healthy: healthySources,
        unhealthy: unhealthySources,
      },
      recent_runs: recentRunsResponse,
    };
    
    sendSuccess(res, { overview: response });
  } catch (error: any) {
    console.error('[Admin Observability Overview] Unexpected error:', error);
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
