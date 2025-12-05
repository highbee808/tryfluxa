# Final Fix for 500 Error - Complete Solution

I've updated the function to use direct HTTP calls instead of `supabase.functions.invoke`, which is more reliable. Here's what to do:

## Step 1: Redeploy `publish-gist` with Fix

The function now uses direct HTTP calls which work better. Redeploy it:

**Via Dashboard:**
1. **Supabase Dashboard** → **Edge Functions** → `publish-gist` → **Edit**
2. **Copy code from:** `supabase/functions/publish-gist/index.ts` (I just updated it)
3. **Paste and Deploy**

## Step 2: Ensure All Functions Are Deployed

**Check in Dashboard:**
- Edge Functions → Should see all 3:
  - ✅ `publish-gist`
  - ✅ `generate-gist`
  - ✅ `text-to-speech`

**If any are missing, deploy them:**
- Copy code from `supabase/functions/[name]/index.ts`
- Create function in Dashboard
- Deploy

## Step 3: Verify Secrets

Make sure these secrets are set:
- ✅ `SB_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`

## Step 4: Test

1. **Wait 30 seconds** after redeploying
2. **Admin panel** → **Run Full Pipeline Test**
3. **Check logs** if it still fails:
   - Dashboard → Edge Functions → `publish-gist` → Logs
   - Look for specific error

---

## What I Fixed

1. **Changed function calls** from `supabase.functions.invoke` to direct `fetch()` calls
2. **Better error handling** - shows exactly what's failing
3. **More reliable** - direct HTTP calls work better in Edge Functions

---

## Quick Check: Which Functions Are Deployed?

Run this in browser console:

```javascript
const funcs = ['publish-gist', 'generate-gist', 'text-to-speech'];
for (const func of funcs) {
  const { error } = await supabase.functions.invoke(func, { body: {} });
  console.log(`${func}:`, error?.message?.includes('not found') ? '❌ NOT DEPLOYED' : '✅ Deployed');
}
```

If any show "NOT DEPLOYED", deploy that function via Dashboard!

---

**Redeploy `publish-gist` with the updated code and test again!**

