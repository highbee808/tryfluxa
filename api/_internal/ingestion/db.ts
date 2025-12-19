import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentConfigEntry,
  ContentRunRecord,
  ContentSourceRecord,
  DbResult,
  InsertContentItemInput,
  UpdateContentItemInput,
  AISummaryResult,
} from "./types.js";

let client: SupabaseClient | null = null;

function getEnv(key: string): string | undefined {
  return (
    process.env[key] ||
    (typeof process !== "undefined" ? (process as any)?.env?.[key] : undefined)
  );
}

function getSupabaseUrl(): string {
  const url =
    getEnv("SUPABASE_URL") ||
    getEnv("VITE_SUPABASE_URL") ||
    getEnv("PUBLIC_SUPABASE_URL");
  if (!url) {
    throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL");
  }
  return url;
}

function getServiceRoleKey(): string {
  const key =
    getEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("VITE_SUPABASE_SERVICE_ROLE_KEY") ||
    getEnv("SB_SERVICE_ROLE_KEY");
  if (!key) {
    throw new Error("Missing service role key (SUPABASE_SERVICE_ROLE_KEY)");
  }
  return key;
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();
  client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export async function getContentSource(
  sourceKey: string
): Promise<DbResult<ContentSourceRecord>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_sources")
    .select("*")
    .eq("source_key", sourceKey)
    .single();
  return { data, error };
}

export async function getContentConfig<T = any>(
  configKey: string
): Promise<DbResult<ContentConfigEntry<T>>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_config")
    .select("config_key, config_value, description, is_active")
    .eq("config_key", configKey)
    .eq("is_active", true)
    .single();
  return { data, error };
}

export async function getLastSuccessfulRun(
  sourceId: string
): Promise<DbResult<ContentRunRecord>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_runs")
    .select("id, source_id, status, started_at, completed_at")
    .eq("source_id", sourceId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();
  return { data, error };
}

export async function createContentRun(
  sourceId: string
): Promise<DbResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_runs")
    .insert({
      source_id: sourceId,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  return { data, error };
}

/**
 * Create a skipped run record for observability
 * Used when a source is skipped due to cadence, disabled status, etc.
 * 
 * @param sourceId - The content source ID
 * @param skippedReason - Why the run was skipped (cadence, disabled, budget_exceeded, no_data)
 */
export async function createSkippedRun(
  sourceId: string,
  skippedReason: string
): Promise<DbResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  const insertPayload = {
    source_id: sourceId,
    status: "skipped",
    skipped_reason: skippedReason,
    started_at: now,
    completed_at: now,
    items_fetched: 0,
    items_created: 0,
    items_skipped: 0,
    items_updated: 0,
  };
  
  // #region agent log
  console.log(`[DEBUG createSkippedRun] Attempting to create skipped run:`, {
    sourceId,
    skippedReason,
    insertPayload
  });
  // #endregion
  
  const { data, error } = await supabase
    .from("content_runs")
    .insert(insertPayload)
    .select("id")
    .single();
  
  // #region agent log
  console.log(`[DEBUG createSkippedRun] Database result:`, {
    sourceId,
    skippedReason,
    data: data ? { id: data.id } : null,
    error: error ? { message: error.message, code: error.code, details: error.details } : null
  });
  // #endregion
  
  return { data, error };
}

export async function updateContentRun(
  runId: string,
  values: Record<string, any>
): Promise<DbResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_runs")
    .update(values)
    .eq("id", runId)
    .select("id")
    .single();
  return { data, error };
}

export async function checkContentHashExists(
  contentHash: string
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id")
    .eq("content_hash", contentHash)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function insertContentItem(
  item: InsertContentItemInput
): Promise<DbResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .insert({
      source_id: item.source_id,
      external_id: item.external_id ?? null,
      content_hash: item.content_hash,
      title: item.title,
      url: item.url ?? null,
      excerpt: item.excerpt ?? null,
      published_at: item.published_at ?? null,
      image_url: item.image_url ?? null,
      raw_data: item.raw_data ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  return { data, error };
}

export async function updateContentItemByExternalId(
  sourceId: string,
  externalId: string,
  updates: UpdateContentItemInput
): Promise<DbResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      excerpt: updates.excerpt ?? null,
      image_url: updates.image_url ?? null,
      raw_data: updates.raw_data ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("source_id", sourceId)
    .eq("external_id", externalId)
    .select("id")
    .single();
  return { data, error };
}

export async function getCategoryIds(
  names: string[]
): Promise<DbResult<{ id: string; name: string }[]>> {
  if (!names.length) return { data: [], error: null };
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_categories")
    .select("id, name")
    .in("name", names);
  return { data: data ?? [], error };
}

export async function insertItemCategories(
  contentItemId: string,
  categoryIds: string[]
): Promise<DbResult<null>> {
  if (!categoryIds.length) return { data: null, error: null };
  const supabase = getSupabaseClient();
  const rows = categoryIds.map((categoryId) => ({
    content_item_id: contentItemId,
    category_id: categoryId,
  }));
  const { error } = await supabase.from("content_item_categories").insert(rows);
  return { data: null, error };
}

/**
 * Update a content item with AI summary data
 *
 * @param itemId - The content item ID
 * @param result - The AI summary result containing summary, model, timestamp, and length
 */
export async function updateContentItemAISummary(
  itemId: string,
  result: AISummaryResult
): Promise<DbResult<{ id: string }>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      ai_summary: result.summary,
      ai_summary_model: result.model,
      ai_summary_generated_at: result.generatedAt,
      ai_summary_length: result.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("id")
    .single();
  return { data, error };
}

/**
 * Check if a content item already has an AI summary
 *
 * @param itemId - The content item ID
 * @returns true if the item already has an AI summary
 */
export async function hasAISummary(itemId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("ai_summary")
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    console.error("[DB] Error checking AI summary:", error.message);
    return false;
  }

  return Boolean(data?.ai_summary);
}

/**
 * Upsert source health record after each ingestion run
 * 
 * @param sourceId - The content source ID
 * @param runId - The content run ID
 * @param success - Whether the run succeeded
 * @param itemsCreated - Number of items created in this run
 * @param errorReason - Error message if the run failed
 */
export async function upsertSourceHealth(
  sourceId: string,
  runId: string,
  success: boolean,
  itemsCreated: number,
  errorReason?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  try {
    if (success) {
      // Success case: update last_success_at and reset consecutive_failures
      const { error } = await supabase
        .from("content_source_health")
        .upsert(
          {
            source_id: sourceId,
            last_run_id: runId,
            items_generated_last_run: itemsCreated,
            last_success_at: now,
            consecutive_failures: 0,
            updated_at: now,
          },
          {
            onConflict: "source_id",
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error("[DB] Failed to upsert source health (success):", error.message);
      }
    } else {
      // Failure case: update last_error_at and increment consecutive_failures
      // First, try to get current consecutive_failures count
      const { data: existing } = await supabase
        .from("content_source_health")
        .select("consecutive_failures")
        .eq("source_id", sourceId)
        .maybeSingle();

      const currentFailures = existing?.consecutive_failures ?? 0;

      const { error } = await supabase
        .from("content_source_health")
        .upsert(
          {
            source_id: sourceId,
            last_run_id: runId,
            items_generated_last_run: itemsCreated,
            last_error_at: now,
            last_error_reason: errorReason || "Unknown error",
            consecutive_failures: currentFailures + 1,
            updated_at: now,
          },
          {
            onConflict: "source_id",
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error("[DB] Failed to upsert source health (failure):", error.message);
      }
    }
  } catch (err: any) {
    // Don't throw - health tracking is non-critical
    console.error("[DB] Error upserting source health:", err?.message || err);
  }
}
