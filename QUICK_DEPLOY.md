# Quick Deploy Guide

## The Problem

`FunctionsFetchError` means Edge Functions aren't deployed. You need to deploy them to your Supabase project.

## Quick Solution

### Step 1: Install Supabase CLI

**Windows:**
```powershell
# Option 1: Using npm (if you have Node.js)
npm install -g supabase

# Option 2: Download from GitHub
# https://github.com/supabase/cli/releases
# Download supabase_windows_amd64.zip
# Extract and add to PATH
```

### Step 2: Login

```bash
supabase login
```

Opens browser to authenticate.

### Step 3: Link Your Project

```bash
supabase link --project-ref vzjyclgrqoyxbbzplkgw
```

### Step 4: Deploy Functions

```bash
# Deploy all functions
supabase functions deploy

# OR deploy just the one you need for testing
supabase functions deploy publish-gist
```

### Step 5: Set Secrets

```bash
# Set required secrets
supabase secrets set OPENAI_API_KEY=your-openai-key-here
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these from:
- **OPENAI_API_KEY**: https://platform.openai.com/api-keys
- **SUPABASE_URL**: Supabase Dashboard → Settings → API
- **SUPABASE_SERVICE_ROLE_KEY**: Supabase Dashboard → Settings → API (service_role key)

### Step 6: Test!

Go back to Admin panel and click "Run Full Pipeline Test" again.

---

## Alternative: Manual Deploy via Dashboard

If CLI doesn't work:

1. **Supabase Dashboard** → **Edge Functions**
2. **Create function** → Name: `publish-gist`
3. **Copy code from:** `supabase/functions/publish-gist/index.ts`
4. **Paste and deploy**
5. **Set secrets** in function settings

---

## Functions You Need

**Minimum for testing:**
- `publish-gist` (calls the others internally)

**Full pipeline:**
- `publish-gist`
- `generate-gist` 
- `text-to-speech`
- `scrape-trends`

Start with just `publish-gist` to test!

