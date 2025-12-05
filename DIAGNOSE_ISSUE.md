# Diagnose Connection Issue

## Current Status

Your `.env.local` file has:
- ✅ URL: `https://vzjyclgrqoyxbbzplkgw.supabase.co` (correct)
- ⚠️ Key format: `sb_publishable_...` (unusual format)

## Issue: Key Format

Supabase anon keys are typically JWT tokens that look like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6anljbGdycW95eGJienBsa2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDc2MDUsImV4cCI6MjA3OTMyMzYwNX0.xxxxx
```

Your key starts with `sb_publishable_` which might be:
1. A different key format (newer Supabase projects?)
2. The wrong key type
3. An incomplete key

## Solution: Verify Your Keys

### Step 1: Get Correct Keys from Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project: `vzjyclgrqoyxbbzplkgw`
3. Go to **Settings → API**
4. Look for:
   - **Project URL** - should match: `https://vzjyclgrqoyxbbzplkgw.supabase.co`
   - **anon public** key - should be a long JWT token starting with `eyJ...`

### Step 2: Update `.env.local`

Replace the keys with the correct ones from your dashboard:

```env
VITE_SUPABASE_URL="https://vzjyclgrqoyxbbzplkgw.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6anljbGdycW95eGJienBsa2d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDc2MDUsImV4cCI6MjA3OTMyMzYwNX0.YOUR_ACTUAL_KEY_HERE"
```

### Step 3: Clear Everything and Restart

1. **Stop dev server** (Ctrl+C)
2. **Clear Vite cache** (already done)
3. **Clear browser:**
   - Open DevTools (F12)
   - Application tab → Clear storage → Clear site data
   - OR: Run in console: `localStorage.clear(); sessionStorage.clear();`
4. **Restart dev server:**
   ```bash
   npm run dev
   ```

### Step 4: Test Connection

After restarting, open browser console and run:

```javascript
// Check what URL is being used
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Should be: https://vzjyclgrqoyxbbzplkgw.supabase.co');

// Test connection
const { data, error } = await supabase
  .from('gists')
  .select('count')
  .limit(1);

if (error) {
  console.error('❌ Error:', error.message);
  console.error('   Code:', error.code);
} else {
  console.log('✅ Connection successful!');
}
```

## Alternative: Check if Database Migration Was Applied

The "Failed to load feed" might also mean:
1. The `gists` table doesn't exist (migration not applied)
2. RLS policies are blocking access
3. No gists exist yet (normal - need to generate content)

**Check in Supabase Dashboard:**
- Table Editor → Look for `gists` table
- If it doesn't exist, apply the migration: `supabase/migrations/20251121224543-init.sql`

