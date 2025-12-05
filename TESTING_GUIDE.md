# Testing Content Generation Pipeline

This guide will help you test the content generation pipeline and see real content on the feeds page.

## Quick Start - Test Content Generation

### Method 1: Use Admin Panel (Easiest)

1. **Navigate to Admin Panel:**
   - Go to `/admin` in your app
   - Or click "Go to Admin Panel" button if feed is empty

2. **Generate a Single Gist:**
   - In the "Create Gist" section, enter a topic (e.g., "Taylor Swift new album")
   - Optionally select a category
   - Click "Generate Gist"
   - Wait for the success message

3. **Check the Feed:**
   - Navigate to `/feed` page
   - You should see the newly generated gist
   - It should have audio, image, headline, and context

### Method 2: Trigger Auto-Generation Pipeline

1. **Via Admin Panel:**
   - In Admin panel, find "Refresh Trends" button
   - Click it to trigger `admin-refresh-trends` function
   - This will:
     - Scrape trending topics
     - Auto-generate gists from trends
     - Publish them to the feed

2. **Via Direct Function Call:**
   ```bash
   # Using Supabase CLI
   supabase functions invoke admin-refresh-trends
   
   # Or via curl
   curl -X POST \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     https://YOUR_PROJECT.supabase.co/functions/v1/admin-refresh-trends
   ```

### Method 3: Test Individual Functions

#### Test `scrape-trends`:
```bash
supabase functions invoke scrape-trends
```

#### Test `generate-gist`:
```bash
supabase functions invoke generate-gist \
  --body '{"topic": "Latest tech news"}'
```

#### Test `publish-gist`:
```bash
supabase functions invoke publish-gist \
  --body '{"topic": "AI developments", "topicCategory": "Tech"}'
```

---

## Pipeline Flow

The content generation pipeline works like this:

```
1. scrape-trends
   ↓
   Fetches trending topics from NewsAPI, Guardian, Mediastack, Reddit
   ↓
   Stores in raw_trends table

2. auto-generate-gists (or admin-refresh-trends)
   ↓
   Reads from raw_trends
   ↓
   Calls publish-gist for each trend

3. publish-gist
   ↓
   Calls generate-gist → Gets headline, context, narration, image
   ↓
   Calls text-to-speech → Converts narration to audio
   ↓
   Saves to gists table with status='published'
   ↓
   Feed page displays it!
```

---

## Verification Steps

### 1. Check Database

**In Supabase Dashboard → Table Editor:**

1. **Check `raw_trends` table:**
   ```sql
   SELECT * FROM raw_trends 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - Should show recent trending topics

2. **Check `gists` table:**
   ```sql
   SELECT id, headline, topic, status, published_at, audio_url 
   FROM gists 
   WHERE status = 'published' 
   ORDER BY published_at DESC 
   LIMIT 10;
   ```
   - Should show published gists with audio URLs

3. **Check `post_analytics` table:**
   ```sql
   SELECT * FROM post_analytics 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - Should show analytics for published gists

### 2. Check Edge Function Logs

**In Supabase Dashboard → Edge Functions → Logs:**

1. Check `generate-gist` logs:
   - Should show successful AI responses
   - Should show image generation status

2. Check `text-to-speech` logs:
   - Should show audio upload success
   - Should show public URL generation

3. Check `publish-gist` logs:
   - Should show pipeline completion
   - Should show database insert success

### 3. Check Storage Buckets

**In Supabase Dashboard → Storage:**

1. **Check `gist-audio` bucket:**
   - Should contain audio files (`.mp3`)
   - Files should be publicly accessible

2. **Check `fluxa-reactions` bucket:**
   - Should contain reaction audio files
   - Used by text-to-speech function

### 4. Test Feed Page

1. **Navigate to `/feed`:**
   - Should load without errors
   - Should display published gists

2. **Check Gist Display:**
   - Each gist should have:
     - ✅ Headline
     - ✅ Context/Summary
     - ✅ Image
     - ✅ Audio play button
     - ✅ Topic category

3. **Test Audio Playback:**
   - Click play button on a gist
   - Audio should play
   - Should be from `gist-audio` bucket

4. **Test Realtime Updates:**
   - Generate a new gist
   - Feed should show notification: "New content available!"
   - Refresh to see new gist

---

## Troubleshooting

### Issue: Feed is Empty

**Possible Causes:**
1. No gists with `status='published'`
2. RLS policies blocking access
3. Database migration not applied

**Solutions:**
```sql
-- Check if gists exist
SELECT COUNT(*) FROM gists WHERE status = 'published';

-- If 0, generate one via Admin panel or:
INSERT INTO gists (
  headline, context, script, narration, audio_url, topic, 
  topic_category, status, published_at
) VALUES (
  'Test Gist',
  'This is a test gist',
  'Test script content',
  'Test narration',
  'https://example.com/audio.mp3',
  'Test Topic',
  'Test',
  'published',
  NOW()
);
```

### Issue: Functions Fail with 401/403

**Possible Causes:**
1. Missing or incorrect API keys
2. JWT verification failing
3. Service role key not set

**Solutions:**
- Check edge function secrets in Supabase dashboard
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Verify `OPENAI_API_KEY` is set
- Check function logs for specific errors

### Issue: Audio Not Playing

**Possible Causes:**
1. Audio file not uploaded to storage
2. Storage bucket policy blocking access
3. Invalid audio URL

**Solutions:**
```sql
-- Check gist audio URLs
SELECT id, headline, audio_url FROM gists 
WHERE status = 'published' 
LIMIT 5;

-- Verify storage bucket exists
-- In Supabase Dashboard → Storage → gist-audio
-- Should be public bucket
```

### Issue: Images Not Loading

**Possible Causes:**
1. Image URL not generated
2. OpenAI image generation failed
3. Storage upload failed

**Solutions:**
- Check `generate-gist` logs for image generation
- Verify `OPENAI_API_KEY` has DALL-E access
- Check `gists.image_url` in database

---

## Testing Checklist

- [ ] Database migration applied
- [ ] Edge functions deployed
- [ ] Edge function secrets configured
- [ ] Storage buckets created
- [ ] Can generate gist via Admin panel
- [ ] Gist appears in feed
- [ ] Audio plays correctly
- [ ] Image displays correctly
- [ ] Realtime updates work
- [ ] Analytics tracking works

---

## Quick Test Script

Run this in your browser console on the feed page:

```javascript
// Check if gists are loading
const checkGists = async () => {
  const { data, error } = await supabase
    .from('gists')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5);
  
  console.log('Gists:', data);
  console.log('Error:', error);
};

checkGists();

// Generate a test gist
const generateTestGist = async () => {
  const { data, error } = await supabase.functions.invoke('publish-gist', {
    body: { topic: 'Test Topic - ' + Date.now() }
  });
  
  console.log('Result:', data);
  console.log('Error:', error);
};

// generateTestGist(); // Uncomment to test
```

---

## Expected Results

After successful testing, you should see:

1. **Feed Page:**
   - Multiple gists displayed
   - Each with headline, context, image, audio
   - Audio plays when clicked
   - Real-time updates when new gists are published

2. **Database:**
   - `gists` table has entries with `status='published'`
   - `post_analytics` has corresponding entries
   - `raw_trends` has recent trending topics

3. **Storage:**
   - `gist-audio` bucket has audio files
   - Files are publicly accessible

4. **Function Logs:**
   - All functions complete successfully
   - No authentication errors
   - No API key errors

---

## Next Steps

Once testing is successful:

1. Set up cron jobs for automatic content generation
2. Monitor API usage and costs
3. Fine-tune content generation prompts
4. Add more news sources if needed
5. Optimize image generation settings

---

## Support

If you encounter issues:
1. Check edge function logs in Supabase dashboard
2. Verify all secrets are set correctly
3. Check database RLS policies
4. Verify storage bucket permissions
5. Test individual functions one by one

