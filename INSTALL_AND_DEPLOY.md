# Install Supabase CLI & Deploy Functions

## Quick Method: Use Scoop (Windows Package Manager)

### Step 1: Install Scoop (if not installed)

Run this in PowerShell (as Administrator):

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Step 2: Install Supabase CLI

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 3: Login & Deploy

```powershell
# Login (opens browser)
supabase login

# Link your project
supabase link --project-ref vzjyclgrqoyxbbzplkgw

# Deploy all functions
supabase functions deploy publish-gist
supabase functions deploy generate-gist
supabase functions deploy text-to-speech
```

---

## Alternative: Download Binary Directly

### Step 1: Download

1. Go to: https://github.com/supabase/cli/releases/latest
2. Download: `supabase_windows_amd64.zip`
3. Extract to a folder (e.g., `C:\supabase-cli`)

### Step 2: Add to PATH (Optional)

Or just run from the extracted folder.

### Step 3: Use It

```powershell
# Navigate to extracted folder
cd C:\supabase-cli

# Run commands
.\supabase.exe login
.\supabase.exe link --project-ref vzjyclgrqoyxbbzplkgw
.\supabase.exe functions deploy publish-gist
.\supabase.exe functions deploy generate-gist
.\supabase.exe functions deploy text-to-speech
```

---

## Easiest: Deploy via Dashboard (No Installation)

If you don't want to install anything:

1. **Supabase Dashboard** → **Edge Functions**
2. For each function (`publish-gist`, `generate-gist`, `text-to-speech`):
   - Click "Create function" or edit existing
   - Copy code from the file in `supabase/functions/[function-name]/index.ts`
   - Paste and deploy

---

## Which Should You Use?

- **Scoop Method:** Cleanest, easiest updates
- **Binary Download:** Works immediately, no package manager
- **Dashboard Method:** No installation, but more manual

**I recommend the Scoop method** - it's the cleanest!

