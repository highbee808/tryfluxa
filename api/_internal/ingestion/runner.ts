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
  updateContentItemAISummary,
} from "./db.js";
import { checkAndIncrementBudget } from "./budget.js";
import { getAdapter } from "./adapters/index.js";
import {
  canonicalPublishedTime,
  generateContentHash,
} from "../contentHash.js";
import {
  generateAISummary,
  shouldSkipSummarization,
  createSummaryStats,
} from "./ai-summary.js";
import type {
  IngestionOptions,
  IngestionResult,
  NormalizedItem,
  AISummaryStats,
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
    const { data: skippedRun, error: skipError } = await createSkippedRun(source.id, "disabled");
    
    // Extract runId - ensure we have a valid ID
    let runId = "";
    if (skippedRun?.id) {
      runId = skippedRun.id;
    } else if (skipError) {
      console.error(`[Ingestion] Failed to create skipped run record for disabled source (continuing anyway):`, {
        sourceKey,
        sourceId: source.id,
        error: skipError.message,
        code: skipError.code
      });
    } else {
      console.warn(`[Ingestion] Skipped run created but no ID returned for disabled source:`, {
        sourceKey,
        sourceId: source.id
      });
    }
    
    // Update source health (failure case - source disabled)
    if (runId) {
      await upsertSourceHealth(source.id, runId, false, 0, "Source is disabled");
    }
    
    console.log(`[Ingestion] Source skipped (disabled):`, {
      sourceKey,
      sourceId: source.id,
      runId
    });
    
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
        const { data: skippedRun, error: skipError } = await createSkippedRun(source.id, "cadence");
        
        // Extract runId - ensure we have a valid ID
        let runId = "";
        if (skippedRun?.id) {
          runId = skippedRun.id;
        } else if (skipError) {
          // Log error but continue - this is observability, not critical path
          console.error(`[Ingestion] Failed to create skipped run record (continuing anyway):`, {
            sourceKey,
            sourceId: source.id,
            error: skipError.message,
            code: skipError.code
          });
        } else {
          // This should not happen with improved createSkippedRun, but handle gracefully
          console.warn(`[Ingestion] Skipped run created but no ID returned:`, {
            sourceKey,
            sourceId: source.id
          });
        }
        
        console.log(`[Ingestion] Source skipped due to cadence:`, {
          sourceKey,
          sourceId: source.id,
          runId,
          elapsedHours: elapsedHours.toFixed(2),
          effectiveRefreshHours
        });
        
        // Update health to clear any previous errors (cadence skip is successful, not a failure)
        if (runId) {
          await upsertSourceHealth(source.id, runId, true, 0);
        }
        
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

  // AI Summary stats for observability
  const summaryStats: AISummaryStats = createSummaryStats();

  // Check if this source should skip AI summarization
  const skipAISummary = shouldSkipSummarization(source.config ?? null);
  if (skipAISummary) {
    console.log(`[Ingestion] AI summarization disabled for source: ${sourceKey} (ai_generated=true)`);
  }

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

      // Generate AI summary for newly created item (unless source is ai_generated)
      if (!skipAISummary) {
        try {
          const summaryResult = await generateAISummary(
            item.title,
            item.excerpt ?? "",
            inserted.id
          );

          if (summaryResult) {
            const { error: summaryError } = await updateContentItemAISummary(
              inserted.id,
              summaryResult
            );

            if (summaryError) {
              console.warn(
                `[Ingestion] Failed to save AI summary for ${inserted.id}:`,
                summaryError.message
              );
              summaryStats.failed += 1;
            } else {
              summaryStats.generated += 1;
            }
          } else {
            // generateAISummary returns null on failure or quality issues
            summaryStats.failed += 1;
          }
        } catch (summaryErr: any) {
          // Don't block ingestion on summary failures
          console.warn(
            `[Ingestion] AI summary error for ${inserted.id}:`,
            summaryErr?.message || summaryErr
          );
          summaryStats.failed += 1;
        }
      } else {
        summaryStats.skipped += 1;
      }

      itemsCreated += 1;
    }

    // Log AI summary stats
    console.log(
      `[Ingestion] AI Summary stats for ${sourceKey}: generated=${summaryStats.generated}, skipped=${summaryStats.skipped}, failed=${summaryStats.failed}`
    );

    await updateContentRun(run.id, {
      status: "completed",
      items_fetched: itemsFetched,
      items_created: itemsCreated,
      items_skipped: itemsSkipped,
      items_updated: itemsUpdated,
      completed_at: new Date().toISOString(),
      metadata: {
        summaries_generated: summaryStats.generated,
        summaries_skipped: summaryStats.skipped,
        summaries_failed: summaryStats.failed,
      },
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
