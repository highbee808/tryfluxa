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
import { dirname, join, resolve } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lazy import cache
let runIngestionModule: any = null;
let dbModule: any = null;

async function getRunIngestion() {
  if (!runIngestionModule) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:28',message:'Lazy importing runIngestion',data:{__dirname,cwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Construct absolute path from current file location
    // From api/cron/run-ingestion.ts, go up 2 levels to root, then into src/lib/ingestion/runner
    const runnerPath = resolve(__dirname, '../../src/lib/ingestion/runner.js');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:33',message:'Constructed runner path',data:{runnerPath,__dirname},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Try multiple import strategies with both relative and absolute paths
    // Note: In Vercel, files from src/ need to be included via includeFiles config
    const importPaths = [
      // Try relative paths first (most likely to work if files are bundled)
      '../../src/lib/ingestion/runner.js',
      '../../src/lib/ingestion/runner',
      // Try file:// URL with absolute path (works if files are on filesystem)
      new URL('../../src/lib/ingestion/runner.js', import.meta.url).href,
      new URL('../../src/lib/ingestion/runner.js', import.meta.url).pathname,
    ];
    
    let lastError: any = null;
    for (const importPath of importPaths) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:45',message:'Trying import path',data:{importPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        runIngestionModule = await import(importPath);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:48',message:'runIngestion import succeeded',data:{importPath,hasRunIngestion:!!runIngestionModule?.runIngestion},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        break; // Success, exit loop
      } catch (error: any) {
        lastError = error;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:52',message:'Import path failed',data:{importPath,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        continue; // Try next path
      }
    }
    
    if (!runIngestionModule) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:58',message:'All import paths failed',data:{lastError:lastError?.message,stack:lastError?.stack,runnerPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw new Error(`Failed to import runIngestion after trying ${importPaths.length} paths. Last error: ${lastError?.message}. Runner path: ${runnerPath}`);
    }
  }
  return runIngestionModule.runIngestion;
}

async function getGetSupabaseClient() {
  if (!dbModule) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:67',message:'Lazy importing getSupabaseClient',data:{__dirname,cwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Construct absolute path from current file location
    const dbPath = resolve(__dirname, '../../src/lib/ingestion/db.js');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:71',message:'Constructed db path',data:{dbPath,__dirname},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // Try multiple import strategies
    const importPaths = [
      // Try relative paths first
      '../../src/lib/ingestion/db.js',
      '../../src/lib/ingestion/db',
      // Try file:// URL with import.meta.url (works if files are on filesystem)
      new URL('../../src/lib/ingestion/db.js', import.meta.url).href,
      new URL('../../src/lib/ingestion/db.js', import.meta.url).pathname,
    ];
    
    let lastError: any = null;
    for (const importPath of importPaths) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:83',message:'Trying import path',data:{importPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        dbModule = await import(importPath);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:86',message:'getSupabaseClient import succeeded',data:{importPath,hasGetSupabaseClient:!!dbModule?.getSupabaseClient},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        break; // Success, exit loop
      } catch (error: any) {
        lastError = error;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:90',message:'Import path failed',data:{importPath,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        continue; // Try next path
      }
    }
    
    if (!dbModule) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:96',message:'All import paths failed',data:{lastError:lastError?.message,stack:lastError?.stack,dbPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      throw new Error(`Failed to import getSupabaseClient after trying ${importPaths.length} paths. Last error: ${lastError?.message}. DB path: ${dbPath}`);
    }
  }
  return dbModule.getSupabaseClient;
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
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:70',message:'getAllEnabledSources entry',data:{sourceFilter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:74',message:'Before getSupabaseClient call',data:{envVars:{hasSupabaseUrl:!!process.env.SUPABASE_URL,hasServiceKey:!!process.env.SUPABASE_SERVICE_ROLE_KEY}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    const getSupabaseClient = await getGetSupabaseClient();
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:140',message:'Before runIngestion call',data:{sourceKey:source.source_key,force},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const runIngestion = await getRunIngestion();
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
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:245',message:'Handler entry',data:{method:req.method,hasQuery:!!req.query,queryKeys:Object.keys(req.query || {})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
  // #endregion
  
  try {
    // Validate cron secret
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:250',message:'Before secret validation',data:{hasCronSecret:!!process.env.CRON_SECRET,requestSecret:req.query.secret},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    if (!validateCronSecret(req)) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:253',message:'Secret validation failed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
      // #endregion
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or missing cron secret",
      });
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:260',message:'Secret validation passed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion

    // Parse query params
    const force = req.query.force === "true" || req.query.force === true;
    const sourceFilter = req.query.source as string | undefined;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:266',message:'Before orchestrateIngestion',data:{force,sourceFilter,hasOrchestrateIngestion:typeof orchestrateIngestion === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    const result = await orchestrateIngestion(force, sourceFilter);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:269',message:'After orchestrateIngestion',data:{success:result?.success,sourcesProcessed:result?.sources_processed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion

    return res.status(200).json(result);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'run-ingestion.ts:274',message:'Handler catch block',data:{error:error?.message,stack:error?.stack,name:error?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    console.error("[Cron] Orchestration failed:", error);
    return res.status(500).json({
      success: false,
      error: "Orchestration failed",
      message: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
