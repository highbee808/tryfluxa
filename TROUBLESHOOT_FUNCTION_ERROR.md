# Troubleshoot FunctionsFetchError

Even after deploying, you might still get `FunctionsFetchError`. Here's how to fix it:

## Step 1: Verify Function is Deployed

**In Supabase Dashboard:**
1. Go to **Edge Functions** (left sidebar)
2. Check if `publish-gist` appears in the list
3. Click on it to see details

**Or via CLI:**
```bash
supabase functions list
```

## Step 2: Check Function Logs

**In Supabase Dashboard:**
1. Go to **Edge Functions** → `publish-gist`
2. Click **Logs** tab
3. Try running the test again
4. Check for errors in logs

**Common errors:**
- Missing environment variables
- Authentication errors
- Database connection errors

## Step 3: Verify Secrets are Set

**Check in Dashboard:**
1. Edge Functions → `publish-gist` → Settings → Secrets
2. Verify these are set:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Or via CLI:**
```bash
supabase secrets list
```

## Step 4: Test Function Directly

**In browser console, test:**

```javascript
// Test if function is accessible
const { data, error } = await supabase.functions.invoke('publish-gist', {
  body: { topic: 'Test' }
});

console.log('Error:', error);
console.log('Data:', data);
```

**Check the error message:**
- If it says "Function not found" → Function not deployed
- If it says "Invalid API key" → Secrets not set
- If it says "Network error" → Check Supabase URL

## Step 5: Check Function URL

**Verify your Supabase URL is correct:**

```javascript
// In browser console
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Should be: https://vzjyclgrqoyxbbzplkgw.supabase.co');
```

The function should be at:
`https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/publish-gist`

## Step 6: Check Function Code

**Make sure the function handles errors properly:**

The function should return proper error responses. Check `supabase/functions/publish-gist/index.ts` for error handling.

## Step 7: Redeploy Function

**Sometimes redeploying helps:**

```bash
# Redeploy
supabase functions deploy publish-gist --no-verify-jwt

# Or with debug
supabase functions deploy publish-gist --debug
```

## Step 8: Check Browser Network Tab

**Open DevTools → Network tab:**
1. Try running the test
2. Look for the request to `publish-gist`
3. Check:
   - Status code (should be 200)
   - Response body
   - Request headers

## Common Issues & Fixes

### Issue: "Function not found"
**Fix:** Function not deployed. Deploy it:
```bash
supabase functions deploy publish-gist
```

### Issue: "Invalid API key" or "Authentication required"
**Fix:** Secrets not set. Set them:
```bash
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Issue: "Network error" or "Failed to fetch"
**Fix:** 
- Check Supabase URL is correct
- Check internet connection
- Check if function is actually deployed

### Issue: Function deployed but returns error
**Fix:** Check function logs in Dashboard for specific error

## Quick Diagnostic Script

**Run this in browser console:**

```javascript
(async () => {
  console.log('🔍 Function Diagnostic\n');
  
  // Check Supabase URL
  const url = import.meta.env.VITE_SUPABASE_URL;
  console.log('1. Supabase URL:', url);
  console.log('   Function URL:', url + '/functions/v1/publish-gist');
  console.log('');
  
  // Test function call
  console.log('2. Testing function call...');
  try {
    const { data, error } = await supabase.functions.invoke('publish-gist', {
      body: { topic: 'Test' }
    });
    
    if (error) {
      console.error('   ❌ Error:', error);
      console.error('   Name:', error.name);
      console.error('   Message:', error.message);
    } else {
      console.log('   ✅ Function call successful!');
      console.log('   Data:', data);
    }
  } catch (err) {
    console.error('   ❌ Exception:', err);
  }
})();
```

Run this and share the output!

