# Quick Test After Migration

## ✅ Migration Complete - Now Test!

### Step 1: Test Connection (30 seconds)

**Open browser console (F12) and paste:**

```javascript
// Test database connection
const { data, error } = await supabase.from('gists').select('count').limit(1);
console.log(error ? '❌ Error: ' + error.message : '✅ Connection works!');
```

**Expected:** `✅ Connection works!`

---

### Step 2: Generate Your First Gist (1-2 minutes)

1. **Go to `/admin` in your app**
2. **Find "Create Gist" section**
3. **Enter a topic:** `"Taylor Swift"` or `"AI news"`
4. **Click "Generate Gist"**
5. **Wait for success message**

---

### Step 3: Check the Feed (10 seconds)

1. **Go to `/feed`**
2. **You should see your gist!**
3. **Click play button** - audio should work

---

## If Feed is Empty

That's normal! You need to generate content first:
- Go to `/admin`
- Click "Generate Gist"
- Then check `/feed`

---

## If You See Errors

**Run this diagnostic in console:**

```javascript
// Full diagnostic
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
const { data, error } = await supabase.from('gists').select('*').eq('status', 'published').limit(1);
console.log('Gists:', data);
console.log('Error:', error);
```

Share the output if you need help!

