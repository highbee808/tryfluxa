# Complete CORS Fix Guide for All Edge Functions

## ✅ Shared CORS Helper (UPDATED)

**File:** `supabase/functions/_shared/http.ts`

The shared helper now includes all HTTP methods:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

## ✅ Functions Already Updated

These functions already use the shared helper:
- ✅ `fetch-content` - Uses shared helper
- ✅ `spotify-oauth-login` - Uses shared helper, handles OPTIONS
- ✅ `spotify-oauth-callback` - Uses shared helper, handles OPTIONS
- ✅ `spotify-oauth-refresh` - Uses shared helper, handles OPTIONS
- ✅ `vibe-room` - Uses shared helper, handles OPTIONS
- ✅ `publish-gist-v2` - Uses shared helper, handles OPTIONS

## ⚠️ Functions Needing Updates

Many functions (47+) define their own `corsHeaders` instead of using the shared helper. They should be updated to:

1. Import from shared: `import { corsHeaders } from "../_shared/http.ts";`
2. Remove local `corsHeaders` definition
3. Ensure OPTIONS handling
4. Ensure all responses include CORS

## 📋 Standard Pattern for All Functions

Every Edge Function should follow this pattern:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createResponse, createErrorResponse, parseBody } from "../_shared/http.ts";

serve(async (req) => {
  // 1. Handle CORS preflight FIRST
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 2. Your function logic here
    const data = await doSomething();

    // 3. Success response with CORS
    return createResponse(data, 200);
    // OR manually:
    // return new Response(JSON.stringify(data), {
    //   status: 200,
    //   headers: {
    //     ...corsHeaders,
    //     "Content-Type": "application/json",
    //   },
    // });
  } catch (error) {
    // 4. Error response with CORS
    return createErrorResponse(error.message, 500);
    // OR manually:
    // return new Response(JSON.stringify({ error: error.message }), {
    //   status: 500,
    //   headers: {
    //     ...corsHeaders,
    //     "Content-Type": "application/json",
    //   },
    // });
  }
});
```

## 🚀 Deployment

After updating functions, deploy:

```bash
supabase functions deploy --project-ref vzjyclgrqoyxbbzplkgw
```
