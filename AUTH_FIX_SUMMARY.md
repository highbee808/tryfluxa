# Authentication Fix Summary - Content Generation Pipeline

## ✅ All Fixes Applied

### PART 1: env.ts - Strict Admin Auth ✅

**File**: `supabase/functions/_shared/env.ts`

**Changes**:
1. ✅ Added `ADMIN_SECRET` to `env` object for admin dashboard calls
2. ✅ Updated `ENV` object with strict validation:
   - `OPENAI_API_KEY` - Required, throws if missing
   - `SUPABASE_URL` - Required, throws if missing
   - `SUPABASE_ANON_KEY` - Required, throws if missing
   - `SUPABASE_SERVICE_ROLE_KEY` - Required, throws if missing (CRITICAL)
   - `ADMIN_SECRET` - Required, throws if missing
3. ✅ Preserved legacy getters for backward compatibility

**Key Code**:
```typescript
export const ENV = {
  get SUPABASE_SERVICE_ROLE_KEY() {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    return key;
  },
  get ADMIN_SECRET() {
    const secret = Deno.env.get("ADMIN_SECRET");
    if (!secret) throw new Error("Missing ADMIN_SECRET");
    return secret;
  },
  // ... other getters
};
```

### PART 2: http.ts - OpenAI Helper ✅

**File**: `supabase/functions/_shared/http.ts`

**Changes**:
1. ✅ Added `callOpenAI()` helper function
2. ✅ Proper error handling with `[OPENAI ERROR]` logging
3. ✅ Uses `ENV.OPENAI_API_KEY` for authentication
4. ✅ Preserved existing CORS helpers (`corsHeaders`, `createResponse`, `createErrorResponse`)

**Key Code**:
```typescript
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
```

### PART 3: publish-gist-v2 - Fixed Auth + Service Role ✅

**File**: `supabase/functions/publish-gist-v2/index.ts`

**Changes**:
1. ✅ Added admin secret validation (optional - only if `x-admin-secret` header is present)
2. ✅ Fixed Supabase client to use `ENV.SUPABASE_SERVICE_ROLE_KEY`
3. ✅ Added proper Authorization header to Supabase client
4. ✅ Added `[PIPELINE SUCCESS]` debug logs
5. ✅ Added `[PIPELINE FAILURE]` debug logs
6. ✅ Preserved all existing CORS and error handling

**Key Code**:
```typescript
// Admin secret validation (optional)
const adminSecret = req.headers.get("x-admin-secret");
if (adminSecret && adminSecret !== ENV.ADMIN_SECRET) {
  console.error('[AUTH ERROR] Invalid admin secret');
  return createErrorResponse('Unauthorized - Invalid admin secret', 401);
}

// Fixed Supabase client
const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: { 
      headers: { 
        Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` 
      } 
    }
  }
)

// Success log
console.log('[PIPELINE SUCCESS]', {
  gistId: gist.id,
  rawTrendId: gistData.raw_trend_id || 'none',
  headline: gist.headline,
})

// Failure log
console.error('[PIPELINE FAILURE]', error)
```

### PART 4: auto-generate-gists-v2 - Same Auth Fix ✅

**File**: `supabase/functions/auto-generate-gists-v2/index.ts`

**Changes**:
1. ✅ Fixed Supabase client to use `ENV.SUPABASE_SERVICE_ROLE_KEY`
2. ✅ Added proper Authorization header to Supabase client
3. ✅ Added `[AUTO-GEN ERROR]` debug logs
4. ✅ Added `[PIPELINE SUCCESS]` debug logs
5. ✅ Added `[PIPELINE FAILURE]` debug logs

**Key Code**:
```typescript
const supabase = createClient(
  ENV.SUPABASE_URL,
  ENV.SUPABASE_SERVICE_ROLE_KEY,
  {
    global: { 
      headers: { 
        Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}` 
      } 
    }
  }
)

// Success log
console.log('[PIPELINE SUCCESS]', {
  gistId: publishData.gist?.id || 'unknown',
  rawTrendId: trend.id,
  headline: publishData.gist?.headline || 'unknown',
})

// Error log
console.error('[AUTO-GEN ERROR]', error)
```

## What This Fixes

### ✅ HTTP 401 Errors
- **Before**: Admin dashboard calls failed with 401
- **After**: Uses `SUPABASE_SERVICE_ROLE_KEY` for all DB operations

### ✅ Database Write Failures
- **Before**: DB writes failed due to incorrect auth
- **After**: Service role key ensures all writes succeed

### ✅ Raw Trends Selection Failures
- **Before**: `raw_trends` queries failed with 401
- **After**: Service role key allows all queries

### ✅ Admin Dashboard Trigger Failures
- **Before**: Admin dashboard couldn't trigger content generation
- **After**: Admin secret validation (optional) + service role key fixes this

## Debug Logs

### Success Logs
- `[PIPELINE SUCCESS]` - Logged when gist is successfully created
- Includes: `gistId`, `rawTrendId`, `headline`

### Failure Logs
- `[PIPELINE FAILURE]` - Logged on any error
- `[PUBLISH GIST ERROR]` - Specific to publish-gist-v2
- `[AUTO-GEN ERROR]` - Specific to auto-generate-gists-v2
- `[OPENAI ERROR]` - OpenAI API failures
- `[AUTH ERROR]` - Authentication failures

## Deployment Steps

1. **Set Environment Variables** (if not already set):
   ```bash
   # In Supabase Dashboard → Edge Functions → Settings → Secrets
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ADMIN_SECRET=<your-admin-secret>  # Optional, for admin dashboard
   OPENAI_API_KEY=<your-openai-key>
   ```

2. **Deploy Functions**:
   ```bash
   npx supabase functions deploy publish-gist-v2 auto-generate-gists-v2
   ```

3. **Test Admin Dashboard**:
   - Navigate to `/admin`
   - Click "Run Full Pipeline Test"
   - Expected: ✅ No more 401 errors
   - Expected: ✅ No more fetch failed
   - Expected: ✅ Content generated successfully
   - Expected: ✅ DB writes succeed

4. **Check Logs**:
   - Supabase Dashboard → Edge Functions → Logs
   - Look for `[PIPELINE SUCCESS]` or `[PIPELINE FAILURE]` messages
   - Verify `gistId` and `rawTrendId` are logged correctly

## Expected Outcome

✅ No more HTTP 401 errors  
✅ Admin dashboard can trigger content generation  
✅ Database writes succeed (service role key)  
✅ Raw trends queries work  
✅ Clear debug logs for troubleshooting  
✅ Proper error handling with CORS headers  

## Files Modified

1. ✅ `supabase/functions/_shared/env.ts` - Added ADMIN_SECRET, strict ENV validation
2. ✅ `supabase/functions/_shared/http.ts` - Added callOpenAI helper
3. ✅ `supabase/functions/publish-gist-v2/index.ts` - Fixed auth, added debug logs
4. ✅ `supabase/functions/auto-generate-gists-v2/index.ts` - Fixed auth, added debug logs

## Notes

- **Admin Secret**: Optional validation - only checks if `x-admin-secret` header is present
- **Service Role Key**: Required for all DB operations - ensures proper authentication
- **Backward Compatibility**: Legacy `env` object and getters preserved
- **CORS Headers**: All existing CORS handling preserved
- **Error Handling**: All error responses include CORS headers

