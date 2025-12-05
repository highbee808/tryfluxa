# Complete CORS Fixes for All Edge Functions

## ✅ Shared CORS Helper (UPDATED)

**File:** `supabase/functions/_shared/http.ts`

Already includes all required HTTP methods:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

## ✅ Functions Already Fixed

These functions use the shared helper and handle OPTIONS correctly:
- ✅ `spotify-oauth-login` - Updated
- ✅ `spotify-oauth-callback` - Already correct
- ✅ `spotify-oauth-refresh` - Already correct
- ✅ `fetch-content` - Updated
- ✅ `vibe-room` - Already correct
- ✅ `publish-gist-v2` - Already correct

## 📋 Functions That Need Updates

Many functions (45+) define their own `corsHeaders`. Due to the large number, here's the systematic approach:

### Pattern to Apply:

1. **Remove local corsHeaders definition**
2. **Import from shared:** `import { corsHeaders } from "../_shared/http.ts";`
3. **Ensure OPTIONS handling at start of handler**
4. **Ensure all responses include CORS headers**

## 🚀 Deployment Command

After all updates, deploy all functions:

```bash
supabase functions deploy --project-ref vzjyclgrqoyxbbzplkgw
```
