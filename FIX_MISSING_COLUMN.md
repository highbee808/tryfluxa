# Fix: Missing `published_at` Column

## Problem

The error shows: `column gists.published_at does not exist`

This means the `gists` table was created before the migration that includes `published_at`, or the migration didn't fully apply.

## Solution

I've created a fix migration. Apply it in Supabase Dashboard:

### Step 1: Go to Supabase Dashboard

1. Open https://app.supabase.com
2. Select your project: `vzjyclgrqoyxbbzplkgw`
3. Go to **SQL Editor**

### Step 2: Run the Fix Migration

Copy and paste this SQL:

```sql
-- Fix: Add missing published_at column to gists table
ALTER TABLE public.gists 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows that have NULL published_at
UPDATE public.gists 
SET published_at = COALESCE(created_at, now()) 
WHERE published_at IS NULL;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_gists_published_at ON public.gists(published_at DESC);

-- Create composite index for status + published_at queries
CREATE INDEX IF NOT EXISTS idx_gists_status_published ON public.gists(status, published_at DESC);
```

### Step 3: Click "Run"

Click the "Run" button in the SQL Editor.

### Step 4: Verify

After running, refresh your feed page. The error should be gone!

---

## Alternative: Check What Columns Exist

If you want to see what columns the table currently has:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'gists'
ORDER BY ordinal_position;
```

This will show you all columns in the `gists` table.

---

## After Fixing

1. **Refresh `/feed` page** - error should be gone
2. **Generate a test gist** via `/admin`
3. **Check `/feed`** - should see your gist

