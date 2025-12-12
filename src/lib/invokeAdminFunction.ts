import { supabase } from "@/integrations/supabase/client";
import { getApiBaseUrl, getSupabaseAnonKey } from "./apiConfig";

export async function invokeAdminFunction(functionName: string, payload: Record<string, any> = {}) {
  try {
    const apiBase = getApiBaseUrl();
    const anonKey = getSupabaseAnonKey();
    const endpoint = `${apiBase}/${functionName}`;

    // Debug logging
    console.log("🔗 Calling admin function:", endpoint);

    // Use admin secret instead of user JWT to avoid auth issues
    // Admin functions use service role internally and don't need user auth
    const adminSecret = import.meta.env.VITE_ADMIN_SECRET;

    // Build headers - use admin secret if available, otherwise anon key
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "x-client-info": "fluxa-frontend",
    };

    if (adminSecret) {
      headers["x-admin-secret"] = adminSecret;
      // Don't send Authorization header - functions use service role internally
    } else {
      // Fallback to anon key if admin secret not configured
      console.warn("⚠️ VITE_ADMIN_SECRET not configured, using anon key (may cause auth issues)");
      headers["Authorization"] = `Bearer ${anonKey}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // Debug logging
    console.log("📡 Response status:", res.status);
    const responseText = await res.text();
    console.log("📄 Response body:", responseText);

    // Safely parse JSON - handle both successful and error responses gracefully
    let json: any = {};
    try {
      json = responseText ? JSON.parse(responseText) : {};
    } catch (parseError) {
      console.warn("⚠️ Failed to parse JSON response:", parseError);
      // If successful response has invalid JSON, treat as error
      if (res.ok) {
        return {
          data: null,
          error: {
            message: `Invalid JSON response from Edge Function: ${responseText.substring(0, 100)}`,
          },
        };
      }
      // For error responses, keep empty json object and use responseText in error message
    }

    if (!res.ok) {
      return { data: null, error: json.error || { message: `Edge Function failed (${res.status}): ${responseText}` } };
    }
    return { data: json, error: null };
  } catch (e: any) {
    console.error("❌ Network error:", e);
    return { data: null, error: { message: `NetworkError — cannot reach Supabase Edge Functions: ${e.message}` } };
  }
}

