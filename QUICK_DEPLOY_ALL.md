# Quick Deploy All Functions - Step by Step

## The 500 Error Means

The function is crashing because it's trying to call `generate-gist` or `text-to-speech` which probably aren't deployed.

## Solution: Deploy All 3 Functions

### Step 1: Deploy `generate-gist`

1. **Supabase Dashboard** → **Edge Functions**
2. **Create function**
3. **Name:** `generate-gist`
4. **Open:** `supabase/functions/generate-gist/index.ts`
5. **Copy ALL code** (Ctrl+A, Ctrl+C)
6. **Paste into Dashboard**
7. **Deploy**

### Step 2: Deploy `text-to-speech`

1. **Create function**
2. **Name:** `text-to-speech`
3. **Open:** `supabase/functions/text-to-speech/index.ts`
4. **Copy ALL code**
5. **Paste and Deploy**

### Step 3: Redeploy `publish-gist` (with my fixes)

1. **Find `publish-gist`** function
2. **Open:** `supabase/functions/publish-gist/index.ts`
3. **Copy ALL code** (I've added better error handling)
4. **Paste and Deploy**

### Step 4: Test

1. **Wait 30 seconds**
2. **Admin panel** → **Run Full Pipeline Test**
3. **Check logs** if it fails

---

## Checklist

- [ ] `generate-gist` deployed
- [ ] `text-to-speech` deployed  
- [ ] `publish-gist` redeployed (with fixes)
- [ ] All show as "Active" in Dashboard
- [ ] Tested in Admin panel

---

## If Still 500 Error

**Check function logs:**
- Dashboard → Edge Functions → `publish-gist` → Logs
- Look for the specific error message
- Share it and I'll fix it!

The logs will show exactly which step is failing.

