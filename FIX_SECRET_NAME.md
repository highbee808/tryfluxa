# Fix: Secret Name Mismatch

## The Problem

Your secret is named `SB_SERVICE_ROLE_KEY` but the function expects `SUPABASE_SERVICE_ROLE_KEY`.

## Solution: Add the Correct Secret Name

You have two options:

### Option 1: Add New Secret (Recommended)

1. **Go to Edge Functions → Secrets**
2. **Click "Add secret"**
3. **Name:** `SUPABASE_SERVICE_ROLE_KEY`
4. **Value:** Same value as your `SB_SERVICE_ROLE_KEY`
5. **Save**

Now you'll have both names, and the function will work.

### Option 2: Update Function Code (Already Done)

I've updated the function to also check for `SB_SERVICE_ROLE_KEY`, so it should work now. But you still need to **redeploy the function**:

```bash
supabase functions deploy publish-gist
```

---

## After Fixing

1. **Redeploy the function** (if you used Option 2)
2. **Wait 10-30 seconds**
3. **Test again** in Admin panel

---

## Quick Check

Your secrets should be:
- ✅ `OPENAI_API_KEY` - You have this
- ✅ `SUPABASE_URL` - You have this  
- ✅ `SUPABASE_ANON_KEY` - You have this
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - You have `SB_SERVICE_ROLE_KEY` instead

Either add `SUPABASE_SERVICE_ROLE_KEY` or redeploy the updated function!

