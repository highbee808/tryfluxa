import { supabase } from "@/integrations/supabase/client";

export async function invokeAdminFunction(functionName: string, payload: Record<string, any> = {}) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
  const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    return { data: null, error: { message: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY" } };
  }

  const endpoint = `${SUPABASE_URL}/functions/v1/${functionName}`;

  try {
    // Get the user's JWT token from their session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const jwtToken = session?.access_token;

    // Build headers with JWT if available, otherwise fall back to anon key
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": PUBLISHABLE_KEY,
    };

    if (jwtToken) {
      headers["Authorization"] = `Bearer ${jwtToken}`;
    } else {
      // Fallback to anon key if no session (shouldn't happen in admin UI, but handle gracefully)
      headers["Authorization"] = `Bearer ${PUBLISHABLE_KEY}`;
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { data: null, error: json.error || { message: `Edge Function failed (${res.status})` } };
    }
    return { data: json, error: null };
  } catch (e: any) {
    return { data: null, error: { message: "NetworkError — cannot reach Supabase Edge Functions" } };
  }
}

