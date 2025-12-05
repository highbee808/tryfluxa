/**
 * Helper for calling Supabase Edge Functions with automatic Authorization header
 * Fixes "401 Missing authorization header" errors
 * Includes debug logging for production troubleshooting
 */

import { getApiBaseUrl, getSupabaseAnonKey } from "./apiConfig";

export async function callSupabaseFunction(path: string, body: any = {}) {
  const apiBase = getApiBaseUrl();
  const anonKey = getSupabaseAnonKey();
  const functionUrl = `${apiBase}/${path}`;

  // Debug logging
  if (import.meta.env.DEV) {
    console.log("🔗 Calling Supabase Function:", functionUrl);
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      apikey: anonKey,
      "x-client-info": "fluxa-frontend",
    },
    body: JSON.stringify(body),
  });

  // Debug logging
  if (import.meta.env.DEV) {
    console.log("📡 Response status:", response.status);
    if (!response.ok) {
      const errorText = await response.clone().text();
      console.error("❌ Response error:", errorText);
    }
  }

  return response;
}
