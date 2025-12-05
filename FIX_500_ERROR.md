# Fix 500 Internal Server Error

The function is deployed but crashing. Here's how to find and fix it:

## Step 1: Check Function Logs (CRITICAL)

**This will tell us exactly what's wrong:**

1. **Supabase Dashboard** → **Edge Functions** → `publish-gist`
2. **Click "Logs" tab**
3. **Run the test** from Admin panel
4. **Check the logs immediately** - look for red error messages

**Common errors you might see:**
- "generate-gist function not found" → Need to deploy `generate-gist`
- "text-to-speech function not found" → Need to deploy `text-to-speech`
- "Missing OPENAI_API_KEY" → Secret not set
- "Database error" → Database/RLS issue

## Step 2: Deploy ALL Required Functions

The `publish-gist` function calls these, so they MUST be deployed:

1. **`generate-gist`** - Generates content
2. **`text-to-speech`** - Creates audio
3. **`publish-gist`** - Main orchestrator

**Deploy all 3 via Dashboard:**
- Edge Functions → Create function → Copy code from `supabase/functions/[name]/index.ts`

## Step 3: Verify Secrets

Make sure these are set:
- ✅ `SB_SERVICE_ROLE_KEY`
- ✅ `OPENAI_API_KEY`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`

## Step 4: Redeploy with Better Logging

I've updated the function with better error logging. Redeploy it:

1. Copy code from `supabase/functions/publish-gist/index.ts`
2. Deploy via Dashboard
3. Test again
4. Check logs - you'll see more detailed errors

---

## Most Likely Issue

Based on the 500 error, the function is probably:
1. **Calling `generate-gist` which doesn't exist** → Deploy it
2. **Calling `text-to-speech` which doesn't exist** → Deploy it
3. **Missing a secret** → Check secrets

**Check the logs first** - that will tell us exactly what's wrong!

---

## Quick Test: Check if Functions Exist

Run this in browser console:

```javascript
// Test if functions are accessible
const funcs = ['publish-gist', 'generate-gist', 'text-to-speech'];
for (const func of funcs) {
  const { error } = await supabase.functions.invoke(func, { body: {} });
  console.log(`${func}:`, error ? '❌ ' + error.message : '✅ Exists');
}
```

If `generate-gist` or `text-to-speech` show "not found", deploy them!

