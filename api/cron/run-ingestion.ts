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
 * Validate cron secret from query params
 */
function validateCronSecret(req: VercelRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // Allow in dev mode if secret not configured
    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
    if (isProduction) {
      console.warn("[Cron] CRON_SECRET not configured in production");
    }
    return true; // Allow in dev
  }

  const requestSecret = req.query.secret as string | undefined;
  
  if (!requestSecret) {
    return false;
  }

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
      
      if (result.success) {
        sourcesRun.push(source.source_key);
        // [DIAGNOSTIC] Log items created with source_id
        if (result.itemsCreated > 0) {
          console.log(`[Cron] ✅ Created ${result.itemsCreated} items with source_id: ${source.id}`);
          console.log(`[Cron]    These items are FEED-ELIGIBLE (source is active)`);
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
  console.log(`[Cron] ═══════════════════════════════════════════════════════`);
  console.log(`[Cron] INGESTION COMPLETE`);
  console.log(`[Cron]   Sources processed: ${sources.length}`);
  console.log(`[Cron]   Sources run: ${sourcesRun.length}`);
  console.log(`[Cron]   Sources skipped (cadence): ${sourcesSkipped.length}`);
  console.log(`[Cron]   Errors: ${errors.length}`);
  console.log(`[Cron]   Total items created: ${totalCreated}`);
  console.log(`[Cron]   Execution time: ${executionTimeSeconds.toFixed(2)}s`);
  if (totalCreated > 0) {
    console.log(`[Cron] ✅ New content is FEED-ELIGIBLE (from active sources)`);
  }
  console.log(`[Cron] ═══════════════════════════════════════════════════════`);

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
    // Validate cron secret
    if (!validateCronSecret(req)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing cron secret",
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
