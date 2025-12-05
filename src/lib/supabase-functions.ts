/**
 * Utility functions for invoking Supabase Edge Functions with proper headers
 * This fixes FunctionsHttpError by ensuring correct authentication headers
 * 
 * IMPORTANT: Frontend NEVER uses service role key - only publishable (anon) key
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Invoke a Supabase Edge Function with proper authentication
 * Uses publishable key (anon key) - NEVER service role key in frontend
 */
export async function invokeSupabaseFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ data: T | null; error: Error | null }> {
  try {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    }

    const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'x-client-info': 'fluxa-frontend',
      ...options?.headers,
    };

    console.log(`[Supabase Function] Calling ${functionName}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Supabase Function] ${functionName} failed:`, response.status, errorText);
      
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[Supabase Function] ${functionName} succeeded`);
    
    return { data, error: null };
  } catch (error) {
    console.error(`[Supabase Function] ${functionName} error:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Invoke a Supabase Edge Function for admin operations
 * Uses publishable key + JWT auth (NOT service role key)
 * Use this for admin operations like publish-gist, generate-sports-gist, etc.
 * 
 * @deprecated Use invokeAdminFunction from '@/lib/invokeAdminFunction' instead
 */
export async function invokeAdminFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  headers?: Record<string, string>
): Promise<{ data: T | null; error: Error | null }> {
  // Re-export from the main implementation
  const { invokeAdminFunction: mainInvoke } = await import('./invokeAdminFunction');
  return mainInvoke(functionName, body || {}) as Promise<{ data: T | null; error: Error | null }>;
}

/**
 * Invoke a Supabase Edge Function with user privileges
 * Use this for user-facing operations
 * Note: Uses same publishable key as admin functions (frontend never uses service role)
 */
export async function invokeUserFunction<T = any>(
  functionName: string,
  body?: Record<string, any>,
  headers?: Record<string, string>
): Promise<{ data: T | null; error: Error | null }> {
  return invokeSupabaseFunction<T>(functionName, body, { headers });
}

