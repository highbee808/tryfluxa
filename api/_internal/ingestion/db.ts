import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ContentConfigEntry,
  ContentRunRecord,
  ContentSourceRecord,
  DbResult,
  InsertContentItemInput,
  UpdateContentItemInput,
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
