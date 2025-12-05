# Deploy Functions - Step by Step Guide

## Option 1: Install CLI and Deploy (Recommended)

### Step 1: Install Supabase CLI

**If you have Node.js installed:**
```powershell
npm install -g supabase
```

**Or download from:**
https://github.com/supabase/cli/releases
- Download `supabase_windows_amd64.zip`
- Extract it
- Add to your PATH or run from that folder

### Step 2: Login to Supabase

```powershell
supabase login
```

This will open your browser to authenticate.

### Step 3: Link Your Project

```powershell
supabase link --project-ref vzjyclgrqoyxbbzplkgw
```

### Step 4: Deploy Functions

```powershell
# Deploy all three functions
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

---

## Option 2: Deploy via Dashboard (No CLI Needed)

If you don't want to install CLI, deploy via Dashboard:

### Step 1: Deploy `publish-gist`

1. **Supabase Dashboard** → **Edge Functions**
2. **Click "Create function"** (or find `publish-gist` if it exists)
3. **Name:** `publish-gist`
4. **Copy code from:** `supabase/functions/publish-gist/index.ts`
5. **Paste and click "Deploy"**

### Step 2: Deploy `generate-gist`

1. **Click "Create function"**
2. **Name:** `generate-gist`
3. **Copy code from:** `supabase/functions/generate-gist/index.ts`
4. **Paste and click "Deploy"**

### Step 3: Deploy `text-to-speech`

1. **Click "Create function"**
2. **Name:** `text-to-speech`
3. **Copy code from:** `supabase/functions/text-to-speech/index.ts`
4. **Paste and click "Deploy"**

### Step 4: Set Secrets (Already Done!)

Your secrets are already set, so you're good!

---

## Quick Install Script

If you have npm, run this in PowerShell:

```powershell
# Install CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref vzjyclgrqoyxbbzplkgw

# Deploy functions
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

---

## Verify Deployment

After deploying, check:
1. **Dashboard** → **Edge Functions** → Should see all 3 functions
2. Each should show as "Active" or "Deployed"
3. Test in Admin panel!

---

## Which Method to Use?

- **CLI Method:** Faster, can deploy all at once, better for development
- **Dashboard Method:** No installation needed, but more manual

Choose whichever is easier for you!

