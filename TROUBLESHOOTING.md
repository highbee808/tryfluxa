# Troubleshooting: Still Seeing Old Supabase URL

If you're still seeing errors after updating `.env.local`, try these steps:

## Step 1: Clear Vite Cache

I've cleared the Vite cache. Now:

1. **Stop your dev server completely** (Ctrl+C)
2. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"
   - OR: Press `Ctrl+Shift+Delete` → Clear cached images and files

3. **Clear localStorage:**
   - In browser console, run:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

## Step 2: Verify Environment Variables Are Loaded

In browser console, run:
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

**Expected:**
- URL should be: `https://vzjyclgrqoyxbbzplkgw.supabase.co` (or your actual project URL)
- Should NOT contain: `zikzuwomznlpgvrftcpf`

## Step 3: Check Network Requests

1. Open DevTools → Network tab
2. Refresh the page
3. Look for requests to Supabase
4. Check the request URL - should be your NEW project URL

## Step 4: Verify Database Connection

Run in browser console:
```javascript
const { data, error } = await supabase
  .from('gists')
  .select('count')
  .limit(1);

console.log('Connection test:', error ? 'FAILED: ' + error.message : 'SUCCESS');
```

## Step 5: Check if Database Migration Was Applied

The feed might be empty because:
1. No gists exist yet (normal - need to generate content)
2. Migration wasn't applied (tables don't exist)
3. RLS policies blocking access

**Check in Supabase Dashboard:**
- Go to Table Editor
- Check if `gists` table exists
- Check if it has any rows
- Check RLS policies

## Step 6: Test Direct Database Query

If connection works but feed is empty, test:
```javascript
// Test query
const { data, error } = await supabase
  .from('gists')
  .select('*')
  .eq('status', 'published')
  .limit(5);

console.log('Gists:', data);
console.log('Error:', error);
```

If this returns empty array `[]` with no error, that's normal - you just need to generate content!

## Common Issues

### Issue: Environment variables not loading
- Make sure `.env.local` is in project root (same folder as `package.json`)
- Make sure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)
- Restart dev server after changes

### Issue: Still seeing old URL in network requests
- Clear Vite cache: `rm -rf node_modules/.vite` (or delete the folder)
- Clear browser cache completely
- Restart dev server

### Issue: "Invalid API key" persists
- Double-check the anon key matches your new project
- Verify in Supabase dashboard → Settings → API
- Make sure you're using the **anon/public** key, not service role key

### Issue: Feed is empty but no errors
- This is normal! Generate content via Admin panel
- Go to `/admin` → Enter topic → Generate Gist
- Then check `/feed`

