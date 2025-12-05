/**
 * Helper for calling Supabase Edge Functions with automatic Authorization header
 * Fixes "401 Missing authorization header" errors
 */

function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "❌ Missing VITE_SUPABASE_URL — check your .env.local file. " +
      "Run 'npm run verify-env' to validate your environment variables."
    );
  }
  return url;
}

function getAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 
              import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!key || key.trim() === "") {
    throw new Error(
      "❌ Missing VITE_SUPABASE_ANON_KEY — check your .env.local file. " +
      "Run 'npm run verify-env' to validate your environment variables."
    );
  }
  return key;
}

export async function callSupabaseFunction(path: string, body: any = {}) {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getAnonKey();

  // Ensure URL doesn't have trailing slash
  const baseUrl = supabaseUrl.replace(/\/$/, "");
  const functionUrl = `${baseUrl}/functions/v1/${path}`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return response;
}
