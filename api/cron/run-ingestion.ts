/**
 * Vercel serverless function for content ingestion
 * 
 * PRIMARY CRON ENDPOINT - Orchestrates admin-controlled ingestion pipeline.
 * 
 * Key behaviors:
 * - Queries content_sources table for is_active=true sources only
 * - Uses adapter registry to fetch content
 * - Inserts content_items with correct source_id (matches active sources)
 * - Content becomes feed-eligible immediately (no disabled source exclusion)
 * 
 * Configured in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/run-ingestion",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runIngestion } from '../_internal/ingestion/runner.js';
import { getSupabaseClient } from '../_internal/ingestion/db.js';

interface OrchestrationResult {
  success: boolean;
  timestamp: string;
  sources_processed: number;
  sources_run: string[];
  sources_skipped: string[];
  results: Array<{
    sourceKey: string;
    runId: string;
    itemsFetched: number;
    itemsCreated: number;
    itemsSkipped: number;
    itemsUpdated: number;
    success: boolean;
    error: string | null;
  }>;
  errors: Array<{
    sourceKey: string;
    error: string;
  }>;
  execution_time_ms?: number;
}

/**
 * Validate cron execution
 * - Allows Vercel scheduled cron via x-vercel-cron header
 * - Allows manual execution via ?secret=CRON_SECRET
 */
function validateCron(req: VercelRequest): boolean {
  // ✅ Allow Vercel scheduled cron jobs
  // Method 1: Check x-vercel-cron header (primary method)
  // Vercel sends x-vercel-cron header with value "1" for scheduled cron jobs
  const headerKeys = Object.keys(req.headers || {});
  const cronHeaderKey = headerKeys.find(k => k.toLowerCase() === 'x-vercel-cron');
  const cronHeaderValue = cronHeaderKey ? req.headers[cronHeaderKey] : undefined;
  
  // Check if this is a Vercel scheduled cron (header present with value "1" or "true")
  if (cronHeaderValue !== undefined && cronHeaderValue !== null) {
    const headerStr = Array.isArray(cronHeaderValue) ? cronHeaderValue[0] : String(cronHeaderValue);
    const isVercelCron = headerStr === "1" || headerStr === "true" || headerStr.toLowerCase() === "1";
    
    if (isVercelCron) {
      return true;
    }
  }
  
  // Method 2: Fallback to User-Agent check (vercel-cron/1.0)
  // This is a reliable indicator when header is missing or not accessible
  const userAgent = req.headers['user-agent'];
  const userAgentStr = Array.isArray(userAgent) ? userAgent[0] : (typeof userAgent === 'string' ? userAgent : String(userAgent || ''));
  if (userAgentStr && userAgentStr.startsWith('vercel-cron/')) {
    return true;
  }

  // ✅ Allow manual runs via secret
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    // Allow in dev if secret is not configured
    return true;
  }

  const requestSecret = req.query.secret as string | undefined;
  return requestSecret === cronSecret;
}

/**
 * Get all enabled content sources from database
 * Filters out expired/unsupported adapters (guardian, old mediastack, old newsapi)
 */
async function getAllEnabledSources(sourceFilter?: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient();
    
    let query = supabase
      .from("content_sources")
      .select("*")
      .eq("is_active", true);

    if (sourceFilter) {
      query = query.eq("source_key", sourceFilter);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to load content sources: ${error.message}`);
    }

    // Filter out expired/unsupported adapters
    const expiredAdapters = ["guardian", "mediastack", "newsapi"];
    const validSources = (data || []).filter(
      (source) => !expiredAdapters.includes(source.source_key)
    );

    // Sort: RapidAPI adapters first, then others
    const rapidApiSources = validSources.filter((s) => 
      s.source_key.includes("rapidapi") || s.source_key === "mediastack-rapidapi" || s.source_key === "newsapi-rapidapi"
    );
    const otherSources = validSources.filter((s) => 
      !s.source_key.includes("rapidapi") && s.source_key !== "mediastack-rapidapi" && s.source_key !== "newsapi-rapidapi"
    );

    // Return RapidAPI sources first, then others
    return [...rapidApiSources, ...otherSources];
  } catch (error: any) {
    throw error;
  }
}

/**
 * Main orchestration logic
 */
async function orchestrateIngestion(
  force: boolean,
  sourceFilter?: string
): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // [DIAGNOSTIC] Log pipeline identification
  console.log(`[Cron] ═══════════════════════════════════════════════════════`);
  console.log(`[Cron] ADMIN-CONTROLLED INGESTION PIPELINE`);
  console.log(`[Cron] Timestamp: ${timestamp}`);
  console.log(`[Cron] Force mode: ${force}`);
  console.log(`[Cron] Source filter: ${sourceFilter || 'none (all active sources)'}`);
  console.log(`[Cron] ═══════════════════════════════════════════════════════`);

  // Load enabled sources
  const sources = await getAllEnabledSources(sourceFilter);
  
  // [DIAGNOSTIC] Log active sources with IDs
  console.log(`[Cron] Active sources from content_sources table: ${sources.length}`);
  for (const source of sources) {
    console.log(`[Cron]   - ${source.source_key} (id: ${source.id}, name: ${source.name})`);
  }
  
  if (sources.length === 0) {
    console.warn(`[Cron] WARNING: No active sources found. Enable sources in Admin to populate feeds.`);
    return {
      success: true,
      timestamp,
      sources_processed: 0,
      sources_run: [],
      sources_skipped: [],
      results: [],
      errors: [],
      execution_time_ms: Date.now() - startTime,
    };
  }

  const sourcesRun: string[] = [];
  const sourcesSkipped: string[] = [];
  const results: OrchestrationResult["results"] = [];
  const errors: OrchestrationResult["errors"] = [];

  // Process each source
  for (const source of sources) {
    try {
      console.log(`[Cron] ───────────────────────────────────────────────────`);
      console.log(`[Cron] Processing source: ${source.source_key}`);
      console.log(`[Cron]   source_id: ${source.id}`);
      console.log(`[Cron]   is_active: ${source.is_active}`);
      
      const result = await runIngestion(source.source_key, { force });
      
      // #region agent log
      console.log(`[DEBUG orchestrateIngestion] Source ${source.source_key} result:`, {
        success: result.success,
        runId: result.runId,
        itemsFetched: result.itemsFetched,
        itemsCreated: result.itemsCreated,
        error: result.error,
        skippedReason: result.skippedReason
      });
      // #endregion
      
      if (result.success) {
        sourcesRun.push(source.source_key);
        // [DIAGNOSTIC] Log items created with source_id
        if (result.itemsCreated > 0) {
          console.log(`[Cron] ✅ Created ${result.itemsCreated} items with source_id: ${source.id}`);
          console.log(`[Cron]    These items are FEED-ELIGIBLE (source is active)`);
        } else {
          console.log(`[Cron] ⚠️ Source ${source.source_key} succeeded but created 0 items (runId: ${result.runId})`);
        }
        results.push({
          sourceKey: source.source_key,
          runId: result.runId,
          itemsFetched: result.itemsFetched,
          itemsCreated: result.itemsCreated,
          itemsSkipped: result.itemsSkipped,
          itemsUpdated: result.itemsUpdated,
          success: true,
          error: null,
        });
      } else {
        // Check if skipped due to cadence
        if (result.error?.includes("Skipped: cadence")) {
          console.log(`[Cron] ⏭️ Source ${source.source_key} skipped due to cadence (runId: ${result.runId})`);
          sourcesSkipped.push(source.source_key);
          results.push({
            sourceKey: source.source_key,
            runId: result.runId || "",
            itemsFetched: 0,
            itemsCreated: 0,
            itemsSkipped: 0,
            itemsUpdated: 0,
            success: true,
            error: result.error || null,
          });
        } else {
          // Failed for other reasons
          sourcesRun.push(source.source_key); // Still attempted
          errors.push({
            sourceKey: source.source_key,
            error: result.error || "Unknown error",
          });
          results.push({
            sourceKey: source.source_key,
            runId: result.runId || "",
            itemsFetched: result.itemsFetched,
            itemsCreated: result.itemsCreated,
            itemsSkipped: result.itemsSkipped,
            itemsUpdated: result.itemsUpdated,
            success: false,
            error: result.error || null,
          });
        }
      }
    } catch (error: any) {
      // Catch unexpected errors (adapter not found, etc.)
      const errorMessage = error?.message || String(error);
      console.error(`[Cron] Error processing source ${source.source_key}:`, errorMessage);
      errors.push({
        sourceKey: source.source_key,
        error: errorMessage,
      });
      // Don't add to sources_run or sources_skipped for unexpected errors
    }
  }

  const executionTime = Date.now() - startTime;
  const executionTimeSeconds = executionTime / 1000;

  // Log warning if execution takes too long
  if (executionTimeSeconds > 300) {
    console.warn(
      `[Cron] Execution time exceeded 5 minutes: ${executionTimeSeconds.toFixed(2)}s`
    );
  }

  // [DIAGNOSTIC] Summary log
  const totalCreated = results.reduce((sum, r) => sum + r.itemsCreated, 0);
  const runIds = results.map(r => r.runId).filter(Boolean);
  console.log(`[Cron] ═══════════════════════════════════════════════════════`);
  console.log(`[Cron] INGESTION COMPLETE`);
  console.log(`[Cron]   Sources processed: ${sources.length}`);
  console.log(`[Cron]   Sources run: ${sourcesRun.length}`);
  console.log(`[Cron]   Sources skipped (cadence): ${sourcesSkipped.length}`);
  console.log(`[Cron]   Errors: ${errors.length}`);
  console.log(`[Cron]   Total items created: ${totalCreated}`);
  console.log(`[Cron]   Execution time: ${executionTimeSeconds.toFixed(2)}s`);
  console.log(`[Cron]   Run IDs created: ${runIds.length} (${runIds.join(', ')})`);
  if (totalCreated > 0) {
    console.log(`[Cron] ✅ New content is FEED-ELIGIBLE (from active sources)`);
  }
  console.log(`[Cron] ═══════════════════════════════════════════════════════`);
  
  // #region agent log
  console.log(`[DEBUG orchestrateIngestion] Final result summary:`, {
    totalSources: sources.length,
    sourcesRun,
    sourcesSkipped,
    totalItemsCreated: totalCreated,
    runIds,
    results: results.map(r => ({ source: r.sourceKey, runId: r.runId, status: r.success ? 'success' : 'error', itemsCreated: r.itemsCreated }))
  });
  // #endregion

  return {
    success: errors.length === 0 || sourcesRun.length > 0,
    timestamp,
    sources_processed: sources.length,
    sources_run: sourcesRun,
    sources_skipped: sourcesSkipped,
    results,
    errors,
    execution_time_ms: executionTime,
  };
}

/**
 * Main handler - supports both GET and POST
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Validate cron execution (Vercel cron or manual secret)
    if (!validateCron(req)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid cron execution",
      });
    }


    // Parse query params
    const force = req.query.force === "true" || req.query.force === true;
    const sourceFilter = req.query.source as string | undefined;

    const result = await orchestrateIngestion(force, sourceFilter);

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("[Cron] Orchestration failed:", error);
    return res.status(500).json({
      success: false,
      error: "Orchestration failed",
      message: error?.message || String(error),
      timestamp: new Date().toISOString(),
    });
  }
}
