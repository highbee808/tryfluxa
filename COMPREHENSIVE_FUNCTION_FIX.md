# Comprehensive Function Fix - All Issues

I've identified several potential issues. Let me fix them all:

## Issues Found

1. **Function calls other functions** (`generate-gist`, `text-to-speech`) - these must also be deployed
2. **Error messages might be hidden** - need better error handling
3. **Function invocation might fail** - need to check authentication

## Complete Fix Steps

### Step 1: Deploy ALL Required Functions

The `publish-gist` function calls these, so they MUST be deployed:

```bash
# Deploy all three functions
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

### Step 2: Verify All Functions Are Deployed

**In Supabase Dashboard:**
- Edge Functions → Should see all 3 functions listed
- Each should show as "Active" or "Deployed"

### Step 3: Check Function Logs

**When you run the test, check logs for each function:**
- `publish-gist` → Logs
- `generate-gist` → Logs  
- `text-to-speech` → Logs

Look for specific error messages.

### Step 4: Test Function Directly

Run this in browser console to see the actual error:

```javascript
const { data, error } = await supabase.functions.invoke('publish-gist', {
  body: { topic: 'Test topic' }
});

console.log('Full error:', JSON.stringify(error, null, 2));
console.log('Error name:', error?.name);
console.log('Error message:', error?.message);
```

---

## Most Likely Issues

### Issue 1: Dependent Functions Not Deployed
**Symptom:** `FunctionsFetchError` when calling `generate-gist` or `text-to-speech`
**Fix:** Deploy `generate-gist` and `text-to-speech` functions

### Issue 2: Missing Secrets in Dependent Functions
**Symptom:** `generate-gist` or `text-to-speech` fail
**Fix:** Make sure `OPENAI_API_KEY` is set (shared across all functions)

### Issue 3: Function Not Found
**Symptom:** 404 or "Function not found"
**Fix:** Verify function is deployed and name matches exactly

---

## Quick Test Script

Run this to test each function individually:

```javascript
// Test 1: Check if functions exist
const functions = ['publish-gist', 'generate-gist', 'text-to-speech'];
for (const func of functions) {
  const { error } = await supabase.functions.invoke(func, { body: {} });
  console.log(`${func}:`, error ? '❌ ' + error.message : '✅ Exists');
}

// Test 2: Test generate-gist directly
const { data, error } = await supabase.functions.invoke('generate-gist', {
  body: { topic: 'Test' }
});
console.log('generate-gist:', error || '✅ Works');
```

---

## Next Steps

1. **Deploy all 3 functions**
2. **Check logs when testing**
3. **Run the test script above**
4. **Share the error output** so I can fix the specific issue

