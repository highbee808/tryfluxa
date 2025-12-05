# Deploy All Functions - Simple Checklist

## The Issue

500 error = `publish-gist` is trying to call `generate-gist` or `text-to-speech` which don't exist.

## Solution: Deploy All 3 Functions

### ✅ Function 1: `generate-gist`

1. **Supabase Dashboard** → **Edge Functions** → **Create function**
2. **Name:** `generate-gist`
3. **Copy code from:** `supabase/functions/generate-gist/index.ts`
4. **Paste and Deploy**

### ✅ Function 2: `text-to-speech`

1. **Create function**
2. **Name:** `text-to-speech`
3. **Copy code from:** `supabase/functions/text-to-speech/index.ts`
4. **Paste and Deploy**

### ✅ Function 3: `publish-gist` (Redeploy with fixes)

1. **Find `publish-gist`** → **Edit**
2. **Copy code from:** `supabase/functions/publish-gist/index.ts` (I've added better error handling)
3. **Paste and Deploy**

---

## After Deploying

1. **Wait 30 seconds**
2. **Test in Admin panel**
3. **If still 500, check logs:**
   - Edge Functions → `publish-gist` → Logs
   - Look for the error message

---

## Quick Test

After deploying, test each function:

```javascript
// In browser console
const funcs = ['publish-gist', 'generate-gist', 'text-to-speech'];
for (const func of funcs) {
  const { error } = await supabase.functions.invoke(func, { body: { topic: 'test' } });
  console.log(`${func}:`, error ? '❌ ' + error.message : '✅ Works');
}
```

All 3 should show "✅ Works" after deploying!

