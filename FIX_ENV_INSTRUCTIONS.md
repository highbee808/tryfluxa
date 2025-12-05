# Fix Environment Variables

Your `.env.local` file is still pointing to the OLD Lovable project. Here's how to fix it:

## Current Problem

Your `.env.local` has:
```
VITE_SUPABASE_URL="https://zikzuwomznlpgvrftcpf.supabase.co"  ❌ OLD PROJECT
```

This is why you're getting "Invalid API key" errors - the app is trying to connect to the old project with new keys.

## Solution

### Step 1: Get Your NEW Supabase Project Credentials

1. Go to https://app.supabase.com
2. Select YOUR NEW project (not the old Lovable one)
3. Go to **Settings → API**
4. Copy these values:
   - **Project URL** (should NOT contain `zikzuwomznlpgvrftcpf`)
   - **anon/public key** (the long JWT token)

### Step 2: Update `.env.local`

Open `.env.local` in your project root and update it to:

```env
# Your NEW Supabase project URL (replace with your actual project URL)
VITE_SUPABASE_URL=https://your-new-project-ref.supabase.co

# Your NEW Supabase anon key (replace with your actual anon key)
VITE_SUPABASE_ANON_KEY=your-new-anon-key-here

# Optional: Keep this for backward compatibility
VITE_SUPABASE_PUBLISHABLE_KEY=your-new-anon-key-here

# Edge function secrets (these are set in Supabase dashboard, not here)
# But you can keep them for reference:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
```

### Step 3: Verify the URL is Different

Make sure your new URL does NOT contain:
- ❌ `zikzuwomznlpgvrftcpf` (old Lovable project)

Your new URL should look like:
- ✅ `https://abcdefghijklmnop.supabase.co` (your new project)

### Step 4: Restart Dev Server

**IMPORTANT:** After updating `.env.local`:

1. **Stop your dev server** (Ctrl+C in terminal)
2. **Clear browser cache** (or hard refresh: Ctrl+Shift+R)
3. **Restart dev server:**
   ```bash
   npm run dev
   ```

### Step 5: Verify It's Working

1. Open browser console (F12)
2. Check Network tab - requests should go to YOUR new project URL
3. Check Console tab - should NOT see `zikzuwomznlpgvrftcpf` anymore
4. Feed should load (even if empty - that's normal if no gists exist yet)

## Quick Test

After updating, run this in browser console:

```javascript
// Check which Supabase URL is being used
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Should NOT contain: zikzuwomznlpgvrftcpf');
```

If it still shows the old URL, the dev server needs to be restarted.

## Common Issues

### Issue: Still seeing old URL after restart
- Make sure `.env.local` is in the project root (same folder as `package.json`)
- Make sure there are no spaces around the `=` sign
- Make sure values are NOT in quotes (or if they are, they're correct)
- Try deleting `.env.local` and recreating it

### Issue: "Invalid API key" persists
- Double-check you're using the anon key from YOUR NEW project
- Make sure the URL matches your new project
- Verify in Supabase dashboard that the keys are correct

### Issue: Feed is empty but no errors
- This is normal! You need to generate content first
- Go to `/admin` and click "Generate Gist" to create test content
- Or use the "Refresh Trends" button to auto-generate

## Next Steps After Fixing

Once the connection works:

1. **Generate test content:**
   - Go to `/admin`
   - Enter a topic and click "Generate Gist"
   - Wait for it to complete

2. **Check the feed:**
   - Go to `/feed`
   - You should see the generated gist

3. **Verify in database:**
   - Supabase Dashboard → Table Editor → `gists`
   - Should see published gists

