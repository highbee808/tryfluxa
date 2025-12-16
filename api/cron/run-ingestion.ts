/**
 * Vercel serverless function for content ingestion
 * 
 * Orchestrates Phase 3 ingestion engine for all enabled content sources.
 * 
 * Configure in vercel.json (optional - can run on same schedule as /api/cron/generate):
 * {
 *   "crons": [{
 *     "path": "/api/cron/run-ingestion",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Module-level cached imports
let runIngestion: any = null;
let getSupabaseClient: any = null;
let importInitPromise: Promise<void> | null = null;

// Initialize imports once (lazy, but at module level for bundler detection)
async function initializeImports() {
  if (importInitPromise) return importInitPromise;
  
  importInitPromise = (async () => {
    // Get current file directory for path resolution
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const projectRoot = resolve(__dirname, '../..');
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:31',message:'Initializing imports',data:{cwd:process.cwd(),__dirname,projectRoot},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Try multiple import path strategies
    // Note: includeFiles copies files but doesn't bundle them for import
    // These paths attempt various resolution strategies including absolute paths
    const importPaths = [
      // Relative paths from api/cron/
      '../../src/lib/ingestion/runner.js',
      '../src/lib/ingestion/runner.js',
      // Absolute path constructed at runtime
      `file://${resolve(projectRoot, 'src/lib/ingestion/runner.js')}`,
      // Try without .js extension
      '../../src/lib/ingestion/runner',
      // Try with @ alias (won't work but worth trying)
      '@/lib/ingestion/runner',
    ];
    
    let runnerModule: any = null;
    let lastRunnerError: any = null;
    
    for (const path of importPaths) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:38',message:'Trying runner import path',data:{path},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        runnerModule = await import(path);
        runIngestion = runnerModule.runIngestion;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:42',message:'Runner import succeeded',data:{path,hasRunIngestion:!!runIngestion},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        break; // Success
      } catch (error: any) {
        lastRunnerError = error;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:48',message:'Runner import path failed',data:{path,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
    }
    
    if (!runIngestion) {
      console.error('[Cron] Failed to import runner after trying all paths:', lastRunnerError?.message);
    }
    
    // Try multiple import path strategies for db
    const dbPaths = [
      // Relative paths from api/cron/
      '../../src/lib/ingestion/db.js',
      '../src/lib/ingestion/db.js',
      // Absolute path constructed at runtime
      `file://${resolve(projectRoot, 'src/lib/ingestion/db.js')}`,
      // Try without .js extension
      '../../src/lib/ingestion/db',
      // Try with @ alias (won't work but worth trying)
      '@/lib/ingestion/db',
    ];
    
    let dbModule: any = null;
    let lastDbError: any = null;
    
    for (const path of dbPaths) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:65',message:'Trying db import path',data:{path},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        dbModule = await import(path);
        getSupabaseClient = dbModule.getSupabaseClient;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:69',message:'DB import succeeded',data:{path,hasGetSupabaseClient:!!getSupabaseClient},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        break; // Success
      } catch (error: any) {
        lastDbError = error;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:75',message:'DB import path failed',data:{path,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run6',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
    }
    
    if (!getSupabaseClient) {
      console.error('[Cron] Failed to import db after trying all paths:', lastDbError?.message);
    }
  })();
  
  return importInitPromise;
}

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
 */
async function getAllEnabledSources(sourceFilter?: string): Promise<any[]> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:60',message:'getAllEnabledSources entry',data:{sourceFilter,hasGetSupabaseClient:!!getSupabaseClient},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!getSupabaseClient) {
    throw new Error('getSupabaseClient not available - import failed during module load');
  }
  
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:67',message:'Before getSupabaseClient call',data:{envVars:{hasSupabaseUrl:!!process.env.SUPABASE_URL,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY}},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const supabase = getSupabaseClient();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:102',message:'After getSupabaseClient call',data:{hasClient:!!supabase},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    let query = supabase
      .from("content_sources")
      .select("*")
      .eq("is_active", true)
      .order("source_key", { ascending: true });

    if (sourceFilter) {
      query = query.eq("source_key", sourceFilter);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:113',message:'Before Supabase query',data:{sourceFilter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const { data, error } = await query;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:116',message:'After Supabase query',data:{hasData:!!data,hasError:!!error,errorMessage:error?.message,dataLength:data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (error) {
      throw new Error(`Failed to load content sources: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:124',message:'getAllEnabledSources error',data:{error:error?.message,stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
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

  // Load enabled sources
  const sources = await getAllEnabledSources(sourceFilter);
  
  if (sources.length === 0) {
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
      if (!runIngestion) {
        throw new Error('runIngestion not available - import failed during module load');
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:130',message:'Before runIngestion call',data:{sourceKey:source.source_key,force,hasRunIngestion:!!runIngestion},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const result = await runIngestion(source.source_key, { force });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:153',message:'After runIngestion call',data:{sourceKey:source.source_key,success:result?.success,hasError:!!result?.error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (result.success) {
        sourcesRun.push(source.source_key);
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:55',message:'Handler entry',data:{method:req.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
  // #endregion
  
  try {
    // Initialize imports if not already done
    await initializeImports();
    
    // Check if imports succeeded
    if (!runIngestion || !getSupabaseClient) {
      const missing = [];
      if (!runIngestion) missing.push('runIngestion');
      if (!getSupabaseClient) missing.push('getSupabaseClient');
      
      console.error(`[Cron] Required modules not available: ${missing.join(', ')}`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:66',message:'Module imports failed',data:{missing},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      
      return res.status(500).json({
        success: false,
        error: "Module import failed",
        message: `Required modules not available: ${missing.join(', ')}. The ingestion engine files from src/lib/ingestion/ are not being included in the Vercel serverless function bundle. Check vercel.json includeFiles configuration.`,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate cron secret
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:363',message:'Before secret validation',data:{hasCronSecret:!!process.env.CRON_SECRET,requestSecret:req.query.secret},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    if (!validateCronSecret(req)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:366',message:'Secret validation failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing cron secret",
      });
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:373',message:'Secret validation passed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion

    // Parse query params
    const force = req.query.force === "true" || req.query.force === true;
    const sourceFilter = req.query.source as string | undefined;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:380',message:'Before orchestrateIngestion',data:{force,sourceFilter},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    const result = await orchestrateIngestion(force, sourceFilter);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:383',message:'After orchestrateIngestion',data:{success:result?.success,sourcesProcessed:result?.sources_processed},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion

    return res.status(200).json(result);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:388',message:'Handler catch block',data:{error:error?.message,stack:error?.stack,name:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run4',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    console.error("[Cron] Orchestration failed:", error);
    return res.status(500).json({
      success: false,
      error: "Orchestration failed",
      message: error?.message || String(error),
      timestamp: new Date().toISOString(),
    });
  }
}
