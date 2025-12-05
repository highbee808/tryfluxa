# Automated Deployment Solution

## The Problem

500 error = Function is crashing. Most likely `generate-gist` or `text-to-speech` aren't deployed.

## Quick Fix: Deploy All 3 Functions

### Method 1: Use PowerShell Script (Automated)

I've created `deploy-functions.ps1`. Run it:

```powershell
.\deploy-functions.ps1
```

This will:
- Install CLI if needed
- Login
- Link project
- Deploy all functions

### Method 2: Manual Dashboard Deployment

**For each function (`publish-gist`, `generate-gist`, `text-to-speech`):**

1. **Supabase Dashboard** → **Edge Functions**
2. **Create function** (or edit if exists)
3. **Name:** `[function-name]`
4. **Copy code from:** `supabase/functions/[function-name]/index.ts`
5. **Paste and Deploy**

---

## Step-by-Step: Deploy All 3

### Function 1: `publish-gist`
- File: `supabase/functions/publish-gist/index.ts`
- Copy all code → Deploy

### Function 2: `generate-gist`  
- File: `supabase/functions/generate-gist/index.ts`
- Copy all code → Deploy

### Function 3: `text-to-speech`
- File: `supabase/functions/text-to-speech/index.ts`
- Copy all code → Deploy

---

## After Deploying All 3

1. **Wait 30 seconds**
2. **Test in Admin panel**
3. **Check logs** if it still fails:
   - Edge Functions → `publish-gist` → Logs
   - Look for specific error

---

## Verify Functions Are Deployed

**In Dashboard:**
- Edge Functions → Should see all 3 functions
- Each should show as "Active"

**Or test in console:**
```javascript
const funcs = ['publish-gist', 'generate-gist', 'text-to-speech'];
for (const func of funcs) {
  const { error } = await supabase.functions.invoke(func, { body: {} });
  console.log(`${func}:`, error ? '❌ ' + error.message : '✅ Deployed');
}
```

If any show "not found", deploy that function!

