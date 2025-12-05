# Post-Migration Testing Guide

Your database migration was successful! Now let's test everything.

## Step 1: Verify Connection Works

**Open browser console (F12) and run:**

```javascript
// Quick connection test
const { data, error } = await supabase
  .from('gists')
  .select('count')
  .limit(1);

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log('✅ Database connection successful!');
  console.log('✅ gists table exists and is accessible');
}
```

**Expected:** Should see "✅ Database connection successful!"

## Step 2: Check Feed Page

1. **Go to `/feed` in your app**
2. **Check browser console** - should NOT see "Invalid API key" errors
3. **Feed may be empty** - that's normal! We'll generate content next

## Step 3: Generate Test Content

### Option A: Use Admin Panel (Easiest)

1. **Navigate to `/admin`**
2. **In "Create Gist" section:**
   - Enter a topic: `"Taylor Swift new album"` or `"Latest AI news"`
   - Optionally select a category
   - Click **"Generate Gist"**
   - Wait 30-60 seconds for the pipeline to complete

3. **You should see:**
   - Success message: "Fluxa created your gist! 💅✨"
   - Logs showing the pipeline steps

### Option B: Test Full Pipeline

1. **In Admin panel, click "Test Full Pipeline"**
   - This will test: generate-gist → text-to-speech → publish-gist
   - Check the logs to see each step

### Option C: Trigger Auto-Generation

1. **In Admin panel, click "Refresh Trends"**
   - This will:
     - Scrape trending topics
     - Auto-generate gists from trends
     - Publish them to feed

## Step 4: Verify Content on Feed

1. **Go to `/feed`**
2. **You should see:**
   - The gist you just generated
   - Headline, context, image
   - Audio play button
   - Topic category

3. **Test audio playback:**
   - Click the play button
   - Audio should play from Supabase storage

## Step 5: Verify in Database

**In Supabase Dashboard → Table Editor → `gists`:**

You should see:
- The gist you generated
- `status = 'published'`
- `audio_url` pointing to storage
- `published_at` timestamp

## Step 6: Test Edge Functions

**In browser console, test individual functions:**

```javascript
// Test generate-gist
const testGenerate = async () => {
  const { data, error } = await supabase.functions.invoke('generate-gist', {
    body: { topic: 'Test topic - ' + Date.now() }
  });
  console.log('Generate result:', data);
  console.log('Error:', error);
};
// testGenerate();

// Test publish-gist (full pipeline)
const testPublish = async () => {
  const { data, error } = await supabase.functions.invoke('publish-gist', {
    body: { 
      topic: 'Quick test - ' + Date.now(),
      topicCategory: 'Tech'
    }
  });
  console.log('Publish result:', data);
  console.log('Error:', error);
};
// testPublish();
```

## Troubleshooting

### Issue: Feed still shows "No content available"
- **Normal if no gists exist yet**
- Generate a gist via Admin panel first
- Then refresh the feed

### Issue: "Failed to load feed" error
- Check browser console for specific error
- Verify connection test (Step 1) passes
- Check RLS policies allow SELECT on gists table

### Issue: Gist generated but not on feed
- Check `status = 'published'` in database
- Check `published_at` is set
- Refresh the feed page

### Issue: Audio not playing
- Check `audio_url` in database - should be a valid URL
- Verify `gist-audio` storage bucket exists and is public
- Check browser console for CORS or network errors

## Success Checklist

After testing, you should have:
- [ ] Database connection works (no errors in console)
- [ ] Can generate gists via Admin panel
- [ ] Gists appear on feed page
- [ ] Audio plays correctly
- [ ] Images display correctly
- [ ] No "Invalid API key" errors

## Next Steps

Once everything works:
1. Generate more content via Admin panel
2. Test different topics and categories
3. Set up cron jobs for automatic content generation
4. Monitor edge function logs for any issues

