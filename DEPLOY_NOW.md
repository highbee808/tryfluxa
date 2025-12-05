# Deploy Functions Now - Two Options

## Option 1: Restart Terminal & Use CLI

The CLI is logged in but not in PATH. **Restart your terminal** (close VS Code terminal and reopen), then:

```powershell
# Link project
supabase link --project-ref vzjyclgrqoyxbbzplkgw

# Deploy all 3 functions
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

---

## Option 2: Use Dashboard (Faster - No CLI Needed)

Since CLI setup is tricky, use Dashboard - it's actually faster:

### Deploy `generate-gist`:
1. **Supabase Dashboard** → **Edge Functions** → **Create function**
2. **Name:** `generate-gist`
3. **Open file:** `supabase/functions/generate-gist/index.ts`
4. **Copy ALL code** (Ctrl+A, Ctrl+C)
5. **Paste into Dashboard**
6. **Deploy**

### Deploy `text-to-speech`:
1. **Create function**
2. **Name:** `text-to-speech`
3. **Open:** `supabase/functions/text-to-speech/index.ts`
4. **Copy ALL code**
5. **Paste and Deploy**

### Redeploy `publish-gist`:
1. **Find `publish-gist`** → **Edit**
2. **Open:** `supabase/functions/publish-gist/index.ts`
3. **Copy ALL code** (I've added fixes)
4. **Paste and Deploy**

---

## After Deploying All 3

1. **Wait 30 seconds**
2. **Test in Admin panel**
3. **Should work!**

---

## Which to Use?

- **Dashboard:** Faster, no setup needed, works immediately
- **CLI:** Better for future deployments, but needs PATH setup

**I recommend Dashboard for now** - get it working first, then we can set up CLI properly later!

