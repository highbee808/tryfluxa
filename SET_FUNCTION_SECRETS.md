# Set Function Secrets - Quick Fix

The `FunctionsFetchError` is likely because secrets aren't set. Here's how to fix it:

## Quick Fix: Set All Required Secrets

### Option 1: Via Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard** → Your Project
2. **Go to Edge Functions** → `publish-gist`
3. **Click Settings** → **Secrets**
4. **Add these 4 secrets:**

```
OPENAI_API_KEY = your-openai-api-key-here
SUPABASE_URL = https://vzjyclgrqoyxbbzplkgw.supabase.co
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key-here
SUPABASE_ANON_KEY = your-anon-key-here
```

**Where to get these:**
- **OPENAI_API_KEY**: https://platform.openai.com/api-keys
- **SUPABASE_URL**: Supabase Dashboard → Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API → service_role key
- **SUPABASE_ANON_KEY**: Supabase Dashboard → Settings → API → anon public key

### Option 2: Via CLI

```bash
# Set all secrets at once
supabase secrets set OPENAI_API_KEY=your-openai-key
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

### Option 3: Set Secrets for All Functions

If you want to set secrets for all functions at once:

```bash
# Secrets are shared across all functions in a project
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-key
supabase secrets set SUPABASE_ANON_KEY=your-key
```

---

## Verify Secrets Are Set

**Via Dashboard:**
- Edge Functions → `publish-gist` → Settings → Secrets
- Should see all 4 secrets listed

**Via CLI:**
```bash
supabase secrets list
```

---

## After Setting Secrets

1. **Wait 10-30 seconds** for secrets to propagate
2. **Try the test again** in Admin panel
3. **Check function logs** if it still fails:
   - Edge Functions → `publish-gist` → Logs
   - Look for error messages

---

## If Still Not Working

Check function logs for specific errors:
- "Missing required environment variables" → Secrets not set
- "Authentication failed" → SUPABASE_ANON_KEY wrong
- "Service configuration error" → SUPABASE_URL or OPENAI_API_KEY missing

