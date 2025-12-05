/**
 * RAPID API Rate Limiting and Usage Tracking
 * 
 * Manages 1000 API calls per day efficiently across all functions
 * Tracks usage in database for persistence across function invocations
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const DAILY_LIMIT = 1000;
const RESET_HOUR = 0; // Reset at midnight UTC

interface UsageRecord {
  date: string; // YYYY-MM-DD format
  calls_used: number;
  last_reset: string;
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDate(): string {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return utcDate.toISOString().split('T')[0];
}

/**
 * Check if we can make a RAPID API call
 * Returns { allowed: boolean, remaining: number, resetAt: Date }
 */
export async function checkRapidApiLimit(
  supabase: ReturnType<typeof createClient>
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const today = getTodayDate();
  
  // Get or create today's usage record
  const { data: usage, error } = await supabase
    .from('rapid_api_usage')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found, which is OK
    console.error('Error checking RAPID API usage:', error);
    // On error, allow the call but log it
    return { allowed: true, remaining: DAILY_LIMIT, resetAt: getNextResetTime() };
  }

  const callsUsed = usage?.calls_used || 0;
  const remaining = Math.max(0, DAILY_LIMIT - callsUsed);
  const allowed = remaining > 0;

  return {
    allowed,
    remaining,
    resetAt: getNextResetTime(),
  };
}

/**
 * Record a RAPID API call
 */
export async function recordRapidApiCall(
  supabase: ReturnType<typeof createClient>,
  count: number = 1
): Promise<void> {
  const today = getTodayDate();
  
  // Use the increment function for atomic updates
  const { error: functionError } = await supabase.rpc('increment_rapid_api_calls', {
    call_date: today,
    call_count: count
  });

  if (functionError) {
    console.warn('RPC increment failed, trying manual upsert:', functionError);
    
    // Fallback: Get existing record and increment manually
    const { data: existing } = await supabase
      .from('rapid_api_usage')
      .select('calls_used')
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('rapid_api_usage')
        .update({ 
          calls_used: existing.calls_used + count,
          updated_at: new Date().toISOString()
        })
        .eq('date', today);

      if (updateError) {
        console.error('Error updating RAPID API usage:', updateError);
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('rapid_api_usage')
        .insert({
          date: today,
          calls_used: count,
          last_reset: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error inserting RAPID API usage:', insertError);
      }
    }
  }
}

/**
 * Get next reset time (midnight UTC)
 */
function getNextResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    RESET_HOUR,
    0,
    0,
    0
  ));
  return tomorrow;
}

/**
 * Get current usage stats
 */
export async function getRapidApiStats(
  supabase: ReturnType<typeof createClient>
): Promise<{ used: number; remaining: number; resetAt: Date }> {
  const today = getTodayDate();
  
  const { data: usage } = await supabase
    .from('rapid_api_usage')
    .select('calls_used')
    .eq('date', today)
    .maybeSingle();

  const used = usage?.calls_used || 0;
  const remaining = Math.max(0, DAILY_LIMIT - used);

  return {
    used,
    remaining,
    resetAt: getNextResetTime(),
  };
}

