export async function invokeAdminFunction(
  functionName: string,
  payload: Record<string, any> = {}
) {
  try {
    // Use Vercel serverless function endpoint
    const endpoint = `/api/admin/${functionName}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add admin secret if available (optional - server will validate)
        ...(import.meta.env.VITE_ADMIN_SECRET ? {
          "x-admin-secret": import.meta.env.VITE_ADMIN_SECRET
        } : {}),
      },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    const text = await res.text();

    // Handle non-JSON responses (404 HTML, etc.)
    if (!isJson) {
      const errorPreview = text.substring(0, 200);
      console.error(`[invokeAdminFunction] Non-JSON response from ${endpoint}`, {
        status: res.status,
        contentType,
        preview: errorPreview,
      });
      
      return {
        data: null,
        error: {
          message: `Server returned ${contentType} instead of JSON`,
          details: res.status === 404 
            ? `Endpoint ${endpoint} not found. Check if the serverless function is deployed.`
            : errorPreview,
          status: res.status,
          contentType,
        },
      };
    }

    // Parse JSON response
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch (parseError: any) {
      console.error(`[invokeAdminFunction] Failed to parse JSON from ${endpoint}`, {
        error: parseError.message,
        textPreview: text.substring(0, 200),
      });
      
      return {
        data: null,
        error: {
          message: "Invalid JSON response from server",
          details: parseError.message,
          responsePreview: text.substring(0, 200),
          status: res.status,
        },
      };
    }

    if (!res.ok) {
      return {
        data: null,
        error: {
          message: json.error || json.message || `HTTP ${res.status}: ${res.statusText}`,
          stage: json.stage,
          details: json.details,
          status: res.status,
        },
      };
    }

    return { data: json, error: null };
  } catch (err: any) {
    console.error(`[invokeAdminFunction] Network error calling ${functionName}`, {
      message: err.message,
      stack: err.stack,
    });
    
    return {
      data: null,
      error: {
        message: err.message || "Network error",
        details: err.stack,
      },
    };
  }
}
