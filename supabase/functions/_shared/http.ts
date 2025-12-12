/**
 * Shared HTTP utilities for Pipeline v2
 * Global CORS policy for all Edge Functions
 */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export function createResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

export function createErrorResponse(message: string, status: number = 500, details?: any): Response {
  return createResponse(
    {
      success: false,
      error: message,
      ...(details && { details })
    },
    status
  )
}

export async function parseBody<T = any>(req: Request): Promise<T> {
  try {
    return await req.json()
  } catch {
    return {} as T
  }
}

/**
 * Call OpenAI API with proper error handling
 */
export async function callOpenAI(endpoint: string, payload: any) {
  const { ENV } = await import("./env.ts");
  
  const res = await fetch(`https://api.openai.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[OPENAI ERROR]", err);
    throw new Error(`OpenAI request failed: ${res.status}`);
  }

  return res.json();
}

