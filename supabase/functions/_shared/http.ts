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

