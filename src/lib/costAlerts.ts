import { supabase } from "@/integrations/supabase/client";
import { sendFluxaPushNotification } from "./notifications";

export const checkCostThreshold = async () => {
  const { data: settings } = await supabase
    .from("cost_alert_settings")
    .select("*")
    .single();

  if (!settings) return;

  const thresholdAmount = settings.monthly_limit * settings.alert_threshold;

  if (settings.current_month_cost >= thresholdAmount) {
    // Send alert
    await sendFluxaPushNotification(
      "⚠️ Cost Alert",
      `API costs have reached $${settings.current_month_cost.toFixed(2)} (${(settings.current_month_cost / settings.monthly_limit * 100).toFixed(0)}% of monthly limit)`
    );

    // Log to admin
    console.warn(`Cost threshold exceeded: $${settings.current_month_cost} / $${settings.monthly_limit}`);
  }
};

export const logApiUsage = async (
  provider: string,
  endpoint: string,
  tokensUsed: number,
  estimatedCost: number,
  userId?: string
) => {
  // Log to api_usage_logs
  await supabase.from("api_usage_logs").insert({
    provider,
    endpoint,
    tokens_used: tokensUsed,
    estimated_cost: estimatedCost,
    user_id: userId
  });

  // Update current month cost
  const { data: settings } = await supabase
    .from("cost_alert_settings")
    .select("*")
    .single();

  if (settings) {
    const now = new Date();
    const lastReset = new Date(settings.last_reset);
    
    // Reset if new month
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      await supabase
        .from("cost_alert_settings")
        .update({
          current_month_cost: estimatedCost,
          last_reset: now.toISOString()
        })
        .eq("id", settings.id);
    } else {
      await supabase
        .from("cost_alert_settings")
        .update({
          current_month_cost: settings.current_month_cost + estimatedCost
        })
        .eq("id", settings.id);
    }

    await checkCostThreshold();
  }
};