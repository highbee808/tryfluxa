# Quick Fix: Set Function Secrets

The error is because the function needs secrets. Here's the fastest way to fix it:

## Step 1: Get Your Keys

**From Supabase Dashboard → Settings → API:**
- **Project URL**: `https://vzjyclgrqoyxbbzplkgw.supabase.co`
- **anon public key**: Copy this
- **service_role key**: Copy this (keep it secret!)

**From OpenAI:**
- **API Key**: https://platform.openai.com/api-keys

## Step 2: Set Secrets in Dashboard

1. **Supabase Dashboard** → **Edge Functions** → **publish-gist**
2. **Settings** → **Secrets**
3. **Click "Add secret"** and add these 4:

```
Name: OPENAI_API_KEY
Value: sk-proj-... (your OpenAI key)

Name: SUPABASE_URL  
Value: https://vzjyclgrqoyxbbzplkgw.supabase.co

Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGc... (your service_role key)

Name: SUPABASE_ANON_KEY
Value: eyJhbGc... (your anon key)
```

4. **Click "Save"** for each one

## Step 3: Wait & Test

1. **Wait 10-30 seconds** for secrets to update
2. **Go back to Admin panel**
3. **Click "Run Full Pipeline Test"** again

## Step 4: Check Logs if Still Fails

**Supabase Dashboard** → **Edge Functions** → **publish-gist** → **Logs**

Look for:
- ✅ "publish-gist started" = Function is running
- ❌ "Missing required environment variables" = Secrets not set
- ❌ "Authentication failed" = Wrong keys

---

## Alternative: Set via CLI

If you have Supabase CLI installed:

```bash
supabase secrets set OPENAI_API_KEY=your-key
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-key
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
```

---

That's it! After setting secrets, the function should work.

