# Browser Console Test Script

## How to Test in Browser Console

The `supabase` client isn't automatically available in the console. Here's how to access it:

### Method 1: Import from the App (Recommended)

**Run this in the browser console on ANY page of your app:**

```javascript
// Import supabase client (works on any page)
const { supabase } = await import('/src/integrations/supabase/client.ts');

// Now test connection
const { data, error } = await supabase
  .from('gists')
  .select('count')
  .limit(1);

if (error) {
  console.error('❌ Error:', error.message);
  console.error('   Code:', error.code);
} else {
  console.log('✅ Database connection successful!');
  console.log('✅ Tables exist and are accessible');
}
```

### Method 2: Access from Window (If Available)

Some apps expose supabase globally. Try:

```javascript
// Check if supabase is available
if (window.supabase) {
  const { data, error } = await window.supabase.from('gists').select('count').limit(1);
  console.log(error ? '❌ ' + error.message : '✅ Connection works!');
} else {
  console.log('supabase not on window, use Method 1 instead');
}
```

### Method 3: Test from Actual App Pages

Instead of console, test from the actual app:

1. **Go to `/feed`** - Should load without errors
2. **Go to `/admin`** - Should show admin panel
3. **Try generating a gist** - This will test the full pipeline

## Better Test: Use the Admin Panel

The easiest way to test is through the UI:

1. **Navigate to `/admin`** in your app
2. **Enter a topic** (e.g., "Taylor Swift")
3. **Click "Generate Gist"**
4. **Watch the logs** - Should show success
5. **Go to `/feed`** - Should see your gist

This tests the entire pipeline without needing console access!

