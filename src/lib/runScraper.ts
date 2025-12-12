/**
 * Utility function to manually trigger the scrape-trends function
 * This can be called from the frontend or admin panel
 */
import { supabase } from "@/integrations/supabase/client";

export async function runScraper(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL is not configured");
    }

    // Use service role key if available, otherwise use anon key
    // Note: Service role key should only be used server-side, but this is for admin/testing
    const authKey = serviceRoleKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!authKey) {
      throw new Error("No Supabase key available");
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/scrape-trends`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authKey}`,
        "apikey": authKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Scraper failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Error running scraper:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

