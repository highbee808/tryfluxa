# Simple Test Guide

## ✅ Migration Complete - Now Test!

### Easiest Way: Test Through the UI

**Skip the console - test directly in the app:**

1. **Navigate to `/feed`** in your browser
   - Type in address bar: `http://localhost:4173/feed`
   - Or click through the app navigation

2. **Check for errors:**
   - Open DevTools (F12) → Console tab
   - Should NOT see "Invalid API key" errors
   - Feed may be empty (normal - no content yet)

3. **Generate content:**
   - Go to `/admin` (type in address bar: `http://localhost:4173/admin`)
   - Enter a topic: `"Taylor Swift"` or `"AI news"`
   - Click "Generate Gist"
   - Wait 30-60 seconds

4. **Check feed again:**
   - Go back to `/feed`
   - Your gist should appear!

---

### Console Test (Now Works!)

I've updated the code so `supabase` is available in console. **Refresh the page**, then run:

```javascript
// Test connection
const { data, error } = await supabase
  .from('gists')
  .select('count')
  .limit(1);

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log('✅ Database connection successful!');
}
```

---

### Check Environment Variables

```javascript
// Check what URL is being used
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Should be: https://vzjyclgrqoyxbbzplkgw.supabase.co');
console.log('Is old URL?', import.meta.env.VITE_SUPABASE_URL?.includes('zikzuwomznlpgvrftcpf') ? '❌ YES' : '✅ NO');
```

---

## Quick Checklist

- [ ] Navigate to `/feed` - no errors in console
- [ ] Navigate to `/admin` - admin panel loads
- [ ] Generate a gist - success message appears
- [ ] Check `/feed` - gist appears on feed
- [ ] Click play button - audio plays

---

## If Feed Shows "No content available"

**This is normal!** You need to generate content first:
1. Go to `/admin`
2. Click "Generate Gist"
3. Wait for completion
4. Check `/feed` again

---

## If You See "Invalid API key" Errors

1. **Check environment variables:**
   ```javascript
   console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
   ```
   Should show: `https://vzjyclgrqoyxbbzplkgw.supabase.co`

2. **If still showing old URL:**
   - Stop dev server (Ctrl+C)
   - Restart: `npm run dev`
   - Hard refresh browser (Ctrl+Shift+R)

