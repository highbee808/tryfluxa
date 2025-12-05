# Automate Function Deployment

## Quick Deploy Script

I've created a PowerShell script to automate everything. Just run:

```powershell
.\deploy-functions.ps1
```

This will:
1. Check if Supabase CLI is installed (install if needed)
2. Login to Supabase
3. Link your project
4. Deploy all 3 functions

---

## Manual Steps (If Script Doesn't Work)

### Option 1: Install CLI First

**Install Scoop (run PowerShell as Administrator):**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Then deploy:**
```powershell
supabase login
supabase link --project-ref vzjyclgrqoyxbbzplkgw
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

### Option 2: Deploy via Dashboard

1. **Supabase Dashboard** → **Edge Functions**
2. For each function, copy code from `supabase/functions/[name]/index.ts` and deploy

---

## Fix: "No gist data returned"

I've also fixed the Admin panel to handle different response formats. The function might be returning data in a slightly different structure.

**After redeploying, test again!**

