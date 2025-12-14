# Content Pipeline Updates - Fresh Content Every Hour

## ✅ Changes Completed

### 1. Cron Schedule Updated
- **Changed from**: Every 30 minutes (`*/30 * * * *`)
- **Changed to**: Every hour (`0 * * * *`)
- **File**: `vercel.json`
- Content generation now runs at the top of every hour

### 2. Posts Per Cycle Increased
- **Changed from**: 3 posts per cycle
- **Changed to**: 30 posts per cycle
- **Files**: 
  - `src/jobs/generateContent.ts`
  - `api/cron/generate.ts`

### 3. Expanded Topic List
- **Added**: 30+ diverse trending topics
- Topics include: Entertainment, Sports, Tech, Science, Business, Lifestyle, and more
- Ensures variety in generated content

### 4. Emojis Added to Headlines
- **Updated AI prompt** to require emojis in headlines (1-2 emojis max)
- Headlines will now be more engaging and visually appealing
- Example: "🎵 Taylor Swift releases new album" instead of "Taylor Swift releases new album"

### 5. More Concise & Friendly Summaries
- **Summary max length**: Reduced from 200 to 150 chars
- **Context max length**: Reduced from 300 to 250 chars
- **Narration**: Reduced from 60-90 words to 50-70 words
- **Tone**: Maintains friendly, conversational style

### 6. Cache-Busting Added
- Added timestamp parameter to NewsAPI calls (`&_t=${timestamp}`)
- Added HTTP headers to prevent caching:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
- **Files**:
  - `src/jobs/generateContent.ts`
  - `api/cron/generate.ts`

### 7. Image Priority (Already Implemented)
- ✅ Priority 1: Source image from article
- ✅ Priority 2: OpenAI DALL-E generated image (if no source)
- ✅ No Unsplash images used

### 8. Database Clear Script
- **Created**: `scripts/clear-all-gists.sql`
- Allows clearing all existing content to start fresh
- Includes verification queries

## 📋 Next Steps

### Step 1: Clear Existing Content (Optional but Recommended)
Run the SQL script to clear all existing gists:

**Via Supabase Dashboard:**
1. Go to https://app.supabase.com
2. Select your project: `vzjyclgrqoyxbbzplkgw`
3. Go to **SQL Editor**
4. Copy and paste the contents of `scripts/clear-all-gists.sql`
5. Review the preview query first
6. Run the DELETE query
7. Verify with the count query (should return 0)

**Via CLI:**
```bash
supabase db execute -f scripts/clear-all-gists.sql
```

### Step 2: Deploy Changes
Deploy the updated code to Vercel:

```bash
git add .
git commit -m "Update content pipeline: 30 posts/hour, emojis, cache-busting"
git push
```

Vercel will automatically deploy the changes.

### Step 3: Verify Cron Job
- The cron job will run automatically at the top of every hour
- First run: Next hour (e.g., if it's 2:15 PM, next run is 3:00 PM)
- You can also manually trigger it via Vercel dashboard → Functions → `/api/cron/generate`

### Step 4: Monitor First Run
After the first cron run, check:
1. **Database**: Verify 30 new gists were created
2. **Feed**: Check that new content appears with:
   - Emojis in headlines
   - Source images (or DALL-E generated)
   - Concise, friendly summaries
3. **Logs**: Review Vercel function logs for any errors

## 📊 Expected Results

### Each Hour:
- ✅ 30 new gists generated
- ✅ Headlines with emojis
- ✅ Fresh content (no caching)
- ✅ Source images prioritized, DALL-E as fallback
- ✅ Concise, friendly summaries

### Content Quality:
- Headlines: Catchy with relevant emojis (1-2 max)
- Summaries: 150 chars max, friendly tone
- Context: 250 chars max, informative
- Narration: 50-70 words, conversational

## 🔍 Monitoring

### Check Logs:
```bash
# Vercel CLI
vercel logs [deployment-url] --follow

# Or via Vercel Dashboard
# Functions → /api/cron/generate → Logs
```

### Verify Database:
```sql
-- Check recent gists
SELECT 
  id,
  headline,
  image_url IS NOT NULL as has_image,
  created_at
FROM public.gists
ORDER BY created_at DESC
LIMIT 30;
```

### Test Manually:
```bash
# Trigger the cron endpoint manually
curl -X GET "https://your-app.vercel.app/api/cron/generate?secret=YOUR_CRON_SECRET"
```

## ⚠️ Important Notes

1. **API Rate Limits**: Generating 30 posts with images may take 5-10 minutes per cycle due to:
   - NewsAPI rate limits
   - OpenAI DALL-E generation time (~5-10 seconds per image)
   - Multiple API calls per post

2. **Cost Considerations**: 
   - 30 posts/hour = 720 posts/day
   - Each post may use:
     - NewsAPI calls (free tier: 100/day, paid varies)
     - OpenAI GPT-4o-mini (text generation)
     - OpenAI DALL-E (image generation if no source image)

3. **Database Growth**: 
   - 720 posts/day = ~21,600 posts/month
   - Consider archiving old posts periodically

4. **Error Handling**: 
   - Pipeline continues if individual posts fail
   - Errors are logged and returned in the response
   - Failed posts don't block successful ones

## 🎯 Success Criteria

After deployment, you should see:
- ✅ Fresh content every hour
- ✅ 30 new posts per cycle
- ✅ Emojis in headlines
- ✅ Source images or DALL-E generated images
- ✅ No caching issues
- ✅ Concise, friendly content

---

**Request ID**: 50e082a9-3a92-4251-aabc-217127e719f9
