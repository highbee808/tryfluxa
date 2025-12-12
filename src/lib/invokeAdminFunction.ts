export async function invokeAdminFunction(
  functionName: string,
  payload: Record<string, any> = {}
) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL is missing in frontend build.");
    }
    
    const endpoint = `${supabaseUrl}/functions/v1/${functionName}`;

    const adminSecret = import.meta.env.VITE_ADMIN_SECRET;

    // 🚨 FAIL LOUDLY — no fallback
    if (!adminSecret) {
      throw new Error(
        "VITE_ADMIN_SECRET is missing in frontend build. Admin functions cannot be called."
      );
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
      "x-client-info": "fluxa-frontend",
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: json.error || json.message || "Edge Function error",
          stage: json.stage,
          details: json.details,
          status: res.status,
        },
      };
    }

    return { data: json, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: {
        message: err.message,
      },
    };
  }
}
