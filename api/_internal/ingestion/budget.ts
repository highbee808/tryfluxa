import { getSupabaseClient } from "./db.js";

/**
 * Enforce daily API usage budget for a source.
 * - Creates a budget row for the current day if missing.
 * - Returns false if budget would be exceeded.
 * - Otherwise increments usage_count and returns true.
 */
export async function checkAndIncrementBudget(
  sourceId: string,
  maxCallsPerDay: number
): Promise<boolean> {
  const supabase = getSupabaseClient();

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

  // Ensure record exists
  const { data: existing, error: selectError } = await supabase
    .from("api_usage_budget")
    .select("*")
    .eq("source_id", sourceId)
    .gte("period_start", periodStart.toISOString())
    .lt("period_end", periodEnd.toISOString())
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("api_usage_budget").insert({
      source_id: sourceId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      budget_limit: maxCallsPerDay,
      usage_count: 0,
      last_reset_at: periodStart.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      throw insertError;
    }
  }

  // Try to increment if under budget
  const { data: updated, error: updateError } = await supabase
    .from("api_usage_budget")
    .update({ usage_count: existing ? existing.usage_count + 1 : 1, updated_at: new Date().toISOString() })
    .eq("source_id", sourceId)
    .gte("period_start", periodStart.toISOString())
    .lt("period_end", periodEnd.toISOString())
    .lt("usage_count", maxCallsPerDay)
    .select("usage_count")
    .single();

  if (updateError) {
    // If no rows matched due to budget exceeded, treat as exceeded
    if (updateError.code === "PGRST116") {
      return false;
    }
    throw updateError;
  }

  return Boolean(updated);
}
