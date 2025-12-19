import {
  getCategoryIds,
  getContentConfig,
  getContentSource,
  getLastSuccessfulRun,
  insertContentItem,
  insertItemCategories,
  updateContentItemByExternalId,
  createContentRun,
  createSkippedRun,
  updateContentRun,
  checkContentHashExists,
  getSupabaseClient,
  upsertSourceHealth,
} from "./db.js";
import { checkAndIncrementBudget } from "./budget.js";
import { getAdapter } from "./adapters/index.js";
import {
  canonicalPublishedTime,
  generateContentHash,
} from "../contentHash.js";
import type {
  IngestionOptions,
  IngestionResult,
  NormalizedItem,
} from "./types.js";

const DEFAULT_REFRESH_HOURS = 3;
const DEFAULT_MAX_ITEMS_PER_RUN = 100;
const DEFAULT_API_SPORTS_DAILY_BUDGET = 1000;

async function getNumericConfig(
  key: string,
  fallback: number
): Promise<number> {
  const { data } = await getContentConfig<number>(key);
  if (!data || data.config_value == null) return fallback;
  const value = Number(data.config_value);
  return Number.isFinite(value) ? value : fallback;
}

function shouldEnforceBudget(sourceKey: string): boolean {
  return sourceKey === "api-sports";
}

async function getExternalItemId(
  sourceId: string,
  externalId: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("id")
    .eq("source_id", sourceId)
    .eq("external_id", externalId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data?.id ?? null;
}

export async function runIngestion(
  sourceKey: string,
  options: IngestionOptions = {}
): Promise<IngestionResult> {
  const fetchedAt = options.fetchedAt ?? new Date();

  // Load source
  const { data: source, error: sourceError } = await getContentSource(sourceKey);
  if (sourceError || !source) {
    return {
      success: false,
      runId: "",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsSkipped: 0,
      itemsUpdated: 0,
      error: sourceError?.message || "Source not found",
    };
  }
  if (!source.is_active) {
    // Create a skipped run record for observability
    const { data: skippedRun } = await createSkippedRun(source.id, "disabled");
    const runId = skippedRun?.id || "";
    
    // Update source health (failure case - source disabled)
    if (runId) {
      await upsertSourceHealth(source.id, runId, false, 0, "Source is disabled");
    }
    
    return {
      success: false,
      runId,
      itemsFetched: 0,
      itemsCreated: 0,
      itemsSkipped: 0,
      itemsUpdated: 0,
      error: "Source is disabled",
      skippedReason: "disabled",
    };
  }

  // Config defaults (safe defaults, override if present)
  const refreshHours = await getNumericConfig(
    "ingestion.refresh_hours",
    DEFAULT_REFRESH_HOURS
  );
  const maxItemsPerRunConfig = await getNumericConfig(
    "ingestion.max_items_per_run",
    DEFAULT_MAX_ITEMS_PER_RUN
  );
  const apiSportsDailyBudget = await getNumericConfig(
    "api_sports_daily_budget",
    DEFAULT_API_SPORTS_DAILY_BUDGET
  );

  const sourceRefreshHours =
    typeof source.config?.default_refresh_hours === "number"
      ? source.config.default_refresh_hours
      : undefined;
  const effectiveRefreshHours = sourceRefreshHours ?? refreshHours;

  const sourceMaxItems =
    typeof source.config?.max_items_per_run === "number"
      ? source.config.max_items_per_run
      : undefined;
  const maxItemsPerRun = sourceMaxItems ?? maxItemsPerRunConfig;

  // Cadence check
  if (!options.force) {
    const { data: lastRun } = await getLastSuccessfulRun(source.id);
    if (lastRun?.completed_at) {
      const last = new Date(lastRun.completed_at);
      const elapsedHours = (fetchedAt.getTime() - last.getTime()) / (1000 * 60 * 60);
      if (elapsedHours < effectiveRefreshHours) {
        // Create a skipped run record for observability
        const { data: skippedRun } = await createSkippedRun(source.id, "cadence");
        const runId = skippedRun?.id || "";
        
        return {
          success: true,
          runId,
          itemsFetched: 0,
          itemsCreated: 0,
          itemsSkipped: 0,
          itemsUpdated: 0,
          error: `Skipped: cadence window (${effectiveRefreshHours}h) not met`,
          skippedReason: "cadence",
        };
      }
    }
  }

  // Create run record
  const { data: run, error: runError } = await createContentRun(source.id);
  if (runError || !run) {
    return {
      success: false,
      runId: "",
      itemsFetched: 0,
      itemsCreated: 0,
      itemsSkipped: 0,
      itemsUpdated: 0,
      error: runError?.message || "Failed to create content_run",
    };
  }

  let itemsFetched = 0;
  let itemsCreated = 0;
  let itemsSkipped = 0;
  let itemsUpdated = 0;
  let errorMessage: string | undefined;

  try {
    console.log(`[Ingestion] Getting adapter for source: ${sourceKey}`);
    const adapter = getAdapter(sourceKey, { maxItemsPerRun });

    const raw = await adapter.fetch();

    if (shouldEnforceBudget(sourceKey)) {
      const ok = await checkAndIncrementBudget(source.id, apiSportsDailyBudget);
      if (!ok) {
        await updateContentRun(run.id, {
          status: "skipped",
          skipped_reason: "budget_exceeded",
          error_message: "Budget exceeded",
          completed_at: new Date().toISOString(),
        });
        
        // Update source health (failure case - budget exceeded)
        await upsertSourceHealth(source.id, run.id, false, 0, "Budget exceeded");
        
        return {
          success: false,
          runId: run.id,
          itemsFetched: 0,
          itemsCreated: 0,
          itemsSkipped: 0,
          itemsUpdated: 0,
          error: "Budget exceeded",
          skippedReason: "budget_exceeded",
        };
      }
    }

    const parsed = await adapter.parse(raw);
    itemsFetched = parsed.length;

    for (const item of parsed.slice(0, maxItemsPerRun)) {
      const canonicalTime = canonicalPublishedTime(
        item.publishedAt ?? null,
        fetchedAt
      );
      const contentHash = await generateContentHash({
        title: item.title,
        sourceKey,
        publishedAt: item.publishedAt ?? null,
        fetchedAt,
      });

      const exists = await checkContentHashExists(contentHash);
      if (exists) {
        itemsSkipped += 1;
        continue;
      }

      // If externalId exists and row exists, update mutable fields
      let updatedExisting = false;
      if (item.externalId) {
        const existingId = await getExternalItemId(source.id, item.externalId);
        if (existingId) {
          const { error: updateError } = await updateContentItemByExternalId(
            source.id,
            item.externalId,
            {
              id: existingId,
              excerpt: item.excerpt ?? null,
              image_url: item.imageUrl ?? null,
              raw_data: item.rawData ?? {},
            }
          );
          if (!updateError) {
            itemsUpdated += 1;
            updatedExisting = true;
          }
        }
      }

      if (updatedExisting) continue;

      const { data: inserted, error: insertError } = await insertContentItem({
        source_id: source.id,
        external_id: item.externalId ?? null,
        content_hash: contentHash,
        title: item.title,
        url: item.sourceUrl,
        excerpt: item.excerpt ?? null,
        published_at: canonicalTime.toISOString(),
        image_url: item.imageUrl ?? null,
        raw_data: item.rawData ?? {},
      });

      if (insertError || !inserted) {
        throw insertError || new Error("Failed to insert content item");
      }

      if (item.categories?.length) {
        const { data: categoryIds } = await getCategoryIds(item.categories);
        if (categoryIds?.length) {
          await insertItemCategories(
            inserted.id,
            categoryIds.map((c) => c.id)
          );
        }
      }

      itemsCreated += 1;
    }

    await updateContentRun(run.id, {
      status: "completed",
      items_fetched: itemsFetched,
      items_created: itemsCreated,
      items_skipped: itemsSkipped,
      items_updated: itemsUpdated,
      completed_at: new Date().toISOString(),
    });

    // Update source health (success case)
    await upsertSourceHealth(source.id, run.id, true, itemsCreated);

    return {
      success: true,
      runId: run.id,
      itemsFetched,
      itemsCreated,
      itemsSkipped,
      itemsUpdated,
    };
  } catch (err: any) {
    errorMessage = err?.message || String(err);
    await updateContentRun(run.id, {
      status: "failed",
      error_message: errorMessage,
      items_fetched: itemsFetched,
      items_created: itemsCreated,
      items_skipped: itemsSkipped,
      items_updated: itemsUpdated,
      completed_at: new Date().toISOString(),
    });
    
    // Update source health (failure case)
    await upsertSourceHealth(source.id, run.id, false, itemsCreated, errorMessage);
    
    return {
      success: false,
      runId: run.id,
      itemsFetched,
      itemsCreated,
      itemsSkipped,
      itemsUpdated,
      error: errorMessage,
    };
  }
}
