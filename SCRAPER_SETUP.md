# Scraper Setup & Deployment Guide

## ✅ Completed Setup

1. **Function Configuration** - Added `scrape-trends` to `supabase/config.toml`
2. **Image Normalization** - Function now extracts and stores `image_url` from all API sources
3. **Database Migration** - `image_url` column added to `raw_trends` table
4. **Utility Function** - Created `src/lib/runScraper.ts` for manual triggering

## 🚀 Deployment Steps

### Step 1: Deploy the scrape-trends Function

Run in terminal:

```bash
npx supabase functions deploy scrape-trends
```

Or if you have Supabase CLI linked:

```bash
supabase functions deploy scrape-trends
```

**Expected Output:**
```
Deploying function scrape-trends...
Function scrape-trends deployed successfully
```

### Step 2: Set Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Environment Variables, ensure these are set:

- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `NEWSAPI_KEY` - (Optional) NewsAPI key
- `MEDIASTACK_KEY` - (Optional) Mediastack key
- `GUARDIAN_API_KEY` - (Optional) Guardian API key
- `REDDIT_CLIENT_ID` - (Optional) Reddit client ID
- `REDDIT_CLIENT_SECRET` - (Optional) Reddit client secret

### Step 3: Configure Cron Job

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to Supabase Dashboard → Database → Cron Jobs
2. Click "Create New Cron Job"
3. Configure:
   - **Name:** `scrape-trends-every-30-min`
   - **Function:** `scrape-trends`
   - **Schedule:** `*/30 * * * *` (every 30 minutes)
   - **Headers:** Leave empty (function doesn't require cron signature)

**Option B: Via SQL (Alternative)**

Run this SQL in Supabase SQL Editor:

```sql
-- Note: Supabase cron jobs are typically managed via Dashboard
-- This is for reference only
SELECT cron.schedule(
  'scrape-trends-every-30-min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-trends',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb
  ) AS request_id;
  $$
);
```

### Step 4: Test the Scraper

**Manual Test via Utility Function:**

```typescript
import { runScraper } from "@/lib/runScraper";

// In your component or admin panel
const result = await runScraper();
if (result.success) {
  console.log("Scraper ran successfully:", result.data);
} else {
  console.error("Scraper failed:", result.error);
}
```

**Direct API Test:**

```bash
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/scrape-trends \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "trends": [...],
  "total_fetched": 20,
  "sources_used": ["NewsAPI", "Mediastack", "Guardian", "Reddit"]
}
```

### Step 5: Verify Database

Check that trends are being inserted:

```sql
SELECT 
  id, 
  title, 
  source, 
  category, 
  image_url,
  created_at 
FROM raw_trends 
ORDER BY created_at DESC 
LIMIT 10;
```

You should see:
- ✅ Recent entries with `image_url` populated
- ✅ Various sources (NewsAPI, Mediastack, Guardian, Reddit)
- ✅ Different categories (Sports, Music, Tech, etc.)

## 🔍 Troubleshooting

### Function Not Deploying

**Error:** `Function not found`
- **Solution:** Ensure you're in the project root and `supabase/functions/scrape-trends/index.ts` exists

**Error:** `Authentication required`
- **Solution:** Run `npx supabase login` first

### Function Deployed But Not Running

**Check Logs:**
1. Go to Supabase Dashboard → Edge Functions → scrape-trends → Logs
2. Look for errors or warnings

**Common Issues:**
- Missing environment variables → Set in Dashboard
- API keys invalid → Verify API keys are correct
- Database permissions → Ensure service role key has access

### Cron Job Not Running

**Check Cron Status:**
```sql
SELECT * FROM cron.job WHERE jobname = 'scrape-trends-every-30-min';
```

**Verify Function is Public:**
- Function should have `verify_jwt = false` in config.toml (already set)

### No Data in raw_trends

**Check:**
1. Function logs for errors
2. API keys are valid
3. Database migration applied (image_url column exists)

**Manual Trigger:**
Use the `runScraper()` utility function to test manually

## 📊 Monitoring

### Check Scraper Activity

```sql
-- Count trends by source
SELECT 
  source, 
  COUNT(*) as count,
  MAX(created_at) as last_scraped
FROM raw_trends 
GROUP BY source 
ORDER BY count DESC;
```

### Check Image Coverage

```sql
-- Count trends with images
SELECT 
  COUNT(*) as total,
  COUNT(image_url) as with_images,
  ROUND(100.0 * COUNT(image_url) / COUNT(*), 2) as image_coverage_percent
FROM raw_trends
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## ✅ Acceptance Criteria Checklist

- [x] `/supabase/functions/scrape-trends/index.ts` exists
- [x] Function configured in `config.toml`
- [x] `image_url` normalization implemented
- [x] Database migration for `image_url` column
- [x] Utility function `runScraper()` created
- [ ] Function deployed to Supabase
- [ ] Cron job configured (every 30 minutes)
- [ ] `raw_trends` table filling with fresh content
- [ ] Images correctly stored in `image_url` column
- [ ] No fallback images in feed

## 🎯 Next Steps After Deployment

1. **Wait 30 minutes** for first cron run
2. **Check `raw_trends` table** - should have new entries
3. **Check Feed page** - should show unique images per post
4. **Monitor logs** - ensure no errors

## 📝 Notes

- The scraper runs every 30 minutes automatically
- It fetches from 4 sources: NewsAPI, Mediastack, Guardian, Reddit
- Top 20 trends are stored in `raw_trends`
- Images are normalized and stored in `image_url` column
- The `auto-generate-gists-v2` function reads from `raw_trends` to create gists

