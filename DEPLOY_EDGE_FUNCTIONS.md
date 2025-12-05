# Deploy Edge Functions

The `FunctionsFetchError` means your Edge Functions aren't deployed yet. Here's how to deploy them:

## Option 1: Deploy via Supabase CLI (Recommended)

### Step 1: Install Supabase CLI

**Windows (PowerShell):**
```powershell
# Using Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# OR using npm
npm install -g supabase
```

**Or download from:**
https://github.com/supabase/cli/releases

### Step 2: Login to Supabase

```bash
supabase login
```

This will open your browser to authenticate.

### Step 3: Link Your Project

```bash
# Get your project reference from Supabase Dashboard
# It's in: Settings → General → Reference ID
supabase link --project-ref vzjyclgrqoyxbbzplkgw
```

### Step 4: Deploy All Functions

```bash
# Deploy all functions at once
supabase functions deploy

# OR deploy specific function
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

---

## Option 2: Deploy via Supabase Dashboard

1. **Go to Supabase Dashboard** → Your Project
2. **Go to Edge Functions** (left sidebar)
3. **Click "Deploy a new function"**
4. **For each function:**
   - Click "Create function"
   - Name it (e.g., `publish-gist`)
   - Copy the code from `supabase/functions/publish-gist/index.ts`
   - Paste and deploy

**Note:** This is more manual but works if you don't have CLI installed.

---

## Option 3: Quick Test - Deploy Just publish-gist

If you want to test quickly, deploy just the `publish-gist` function first:

```bash
supabase functions deploy publish-gist
```

---

## Required Functions to Deploy

Based on your codebase, you need to deploy:

1. **publish-gist** - Main function for creating gists
2. **generate-gist** - Generates content using AI
3. **text-to-speech** - Converts text to audio
4. **scrape-trends** - Scrapes trending topics
5. **fetch-feed** - Fetches feed data (optional for testing)

**Minimum for testing:** Just deploy `publish-gist` first.

---

## Set Function Secrets

After deploying, set the required secrets:

1. **Go to Supabase Dashboard** → Edge Functions → Your Function
2. **Go to Settings** → Secrets
3. **Add these secrets:**
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key

**Or via CLI:**
```bash
supabase secrets set OPENAI_API_KEY=your-key-here
supabase secrets set SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Verify Deployment

After deploying, test in browser console:

```javascript
// Test if function is deployed
const { data, error } = await supabase.functions.invoke('publish-gist', {
  body: { topic: 'Test topic' }
});

console.log('Deployed?', error ? 'No: ' + error.message : 'Yes!');
```

---

## Troubleshooting

### Error: "Function not found"
- Function not deployed yet
- Wrong function name
- Check function name matches exactly

### Error: "Invalid API key"
- Secrets not set
- Wrong secret values
- Check secrets in Dashboard

### Error: "Network error"
- Check Supabase URL is correct
- Check internet connection
- Verify project is active

---

## Quick Start (Minimal)

If you just want to test quickly:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login:**
   ```bash
   supabase login
   ```

3. **Link project:**
   ```bash
   supabase link --project-ref vzjyclgrqoyxbbzplkgw
   ```

4. **Deploy one function:**
   ```bash
   supabase functions deploy publish-gist
   ```

5. **Set secrets:**
   ```bash
   supabase secrets set OPENAI_API_KEY=your-key
   ```

6. **Test in admin panel!**

