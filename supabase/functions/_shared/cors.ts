export function corsHeaders(origin: string = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

export function handleCors(req: Request, origin: string = "*"): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  return null;
}

/**
 * Wrap a response with CORS headers using the incoming request origin.
 */
export function cors(req: Request, res: Response): Response {
  const origin = req.headers.get("origin") || "*";
  const headers = new Headers(res.headers);
  const corsMap = corsHeaders(origin);
  Object.entries(corsMap).forEach(([key, value]) => headers.set(key, value));
  return new Response(res.body, { ...res, headers });
}
