# Fix: Supabase Secret Naming Restriction

## The Problem

Supabase **doesn't allow** secret names starting with `SUPABASE_` prefix. That's why you got the error.

## The Solution

I've updated the function to use `SB_SERVICE_ROLE_KEY` (which you already have!) instead of `SUPABASE_SERVICE_ROLE_KEY`.

## What You Need to Do

### Step 1: Redeploy the Function

Since I updated the function code, you need to redeploy it:

```bash
supabase functions deploy publish-gist
```

**Or via Dashboard:**
- Edge Functions → `publish-gist` → Deploy (if you deployed via Dashboard)

### Step 2: Verify Your Secrets

Make sure you have these secrets set (which you already do!):
- ✅ `SB_SERVICE_ROLE_KEY` - You have this
- ✅ `OPENAI_API_KEY` - You have this
- ✅ `SUPABASE_URL` - You have this
- ✅ `SUPABASE_ANON_KEY` - You have this

### Step 3: Test Again

1. Wait 10-30 seconds after redeploying
2. Go to Admin panel
3. Click "Run Full Pipeline Test"

---

## Why This Happened

Supabase restricts secret names that start with `SUPABASE_` to prevent conflicts with their internal variables. The function now uses `SB_SERVICE_ROLE_KEY` which is allowed.

---

## All Set!

After redeploying, the function will use your existing `SB_SERVICE_ROLE_KEY` secret and should work perfectly!

