# Image Mismatch Fix - Deployment Checklist ✅

## Pre-Deployment

- [x] Migration created: `20250111000000_add_raw_trend_id_to_gists.sql`
- [x] `publish-gist-v2` updated to accept `rawTrendId` and use correct image
- [x] `auto-generate-gists-v2` updated to enforce 1:1 mapping
- [x] Feed queries updated to join with `raw_trends` and verify consistency
- [x] Debug logging added: `[GIST GEN]` and `[FEED MAP]`
- [x] Cleanup script created: `CLEANUP_BAD_GISTS.sql`

## Deployment Steps

### 1. Apply Database Migration

**In Supabase SQL Editor:**
```sql
-- Run: supabase/migrations/20250111000000_add_raw_trend_id_to_gists.sql
```

**Verify:**
```sql
-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gists' AND column_name = 'raw_trend_id';

-- Check foreign key exists
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'gists' AND tc.constraint_type = 'FOREIGN KEY';
```

### 2. Run Cleanup Script

**In Supabase SQL Editor:**
```sql
-- Run: CLEANUP_BAD_GISTS.sql
-- This deletes all existing gists and resets processed flags
```

**Verify:**
```sql
-- Should return 0
SELECT COUNT(*) FROM gists;

-- Should show unprocessed trends
SELECT COUNT(*) FROM raw_trends WHERE processed = false;
```

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy publish-gist-v2
npx supabase functions deploy auto-generate-gists-v2
```

**Verify Deployment:**
- Check Supabase Dashboard → Edge Functions
- Both functions should show latest deployment timestamp

### 4. Test the Pipeline

**Option A: Wait for Cron Job**
- `auto-generate-gists-v2` will run automatically (if cron configured)
- Check logs in Supabase Dashboard → Edge Functions → Logs

**Option B: Manual Trigger**
- Use Admin panel: `/admin` → "Run Scraper Now"
- Or trigger `auto-generate-gists-v2` manually via API

**Expected Logs:**
```
[GIST GEN] {
  raw_trend_id: "uuid",
  raw_title: "Article Title",
  raw_url: "https://...",
  raw_image: "https://..."
}

[FEED MAP] {
  gist_id: "uuid",
  raw_trend_id: "uuid",
  headline: "...",
  image_url: "https://...",
  source_url: "https://..."
}
```

### 5. Verify Data Integrity

**Check 1:1 Mapping:**
```sql
-- Each gist should have exactly one raw_trend
SELECT 
  g.id,
  g.headline,
  g.raw_trend_id,
  rt.title as raw_title,
  CASE 
    WHEN g.image_url = rt.image_url THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as image_match,
  CASE 
    WHEN g.source_url = rt.url THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as url_match
FROM gists g
JOIN raw_trends rt ON g.raw_trend_id = rt.id
ORDER BY g.created_at DESC
LIMIT 10;
```

**Check for Mismatches:**
```sql
-- Should return 0 rows
SELECT 
  g.id,
  g.headline,
  g.image_url as gist_image,
  rt.image_url as raw_image,
  g.source_url as gist_url,
  rt.url as raw_url
FROM gists g
JOIN raw_trends rt ON g.raw_trend_id = rt.id
WHERE g.image_url != rt.image_url 
   OR g.source_url != rt.url;
```

**Check Unique Mapping:**
```sql
-- Should return 0 rows (strict 1:1)
SELECT raw_trend_id, COUNT(*) as gist_count
FROM gists
WHERE raw_trend_id IS NOT NULL
GROUP BY raw_trend_id
HAVING COUNT(*) > 1;
```

### 6. Verify Frontend

1. **Open Feed Page**
2. **Open Browser Console**
3. **Check for `[FEED MAP]` logs**
4. **Verify no mismatch warnings**
5. **Check that images match headlines**

**Expected Console Output:**
```
[FEED MAP] {
  gist_id: "...",
  raw_trend_id: "...",
  headline: "Article about X",
  image_url: "https://...",
  raw_trend_title: "Article about X",
  raw_trend_image: "https://..." // Should match image_url
}
```

**No warnings should appear.**

## Troubleshooting

### Issue: Migration fails

**Error:** `column "raw_trend_id" already exists`

**Solution:** Column may already exist. Check with:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'gists' AND column_name = 'raw_trend_id';
```

If exists, skip migration step.

### Issue: Functions fail to deploy

**Error:** `Function not found` or authentication error

**Solution:**
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

### Issue: Gists not generating

**Check:**
1. Function logs in Supabase Dashboard
2. Verify `raw_trends` has unprocessed rows:
   ```sql
   SELECT COUNT(*) FROM raw_trends WHERE processed = false;
   ```
3. Verify no errors in `auto-generate-gists-v2` logs

### Issue: Images still mismatched

**Check:**
1. Verify `raw_trend_id` is being passed to `publish-gist-v2`
2. Check logs for `[GIST GEN]` - verify `raw_image` is correct
3. Check logs for `[FEED MAP]` - verify `image_url` matches `raw_trend_image`
4. Run verification SQL queries above

### Issue: Feed shows no images

**Check:**
1. Verify `raw_trends.image_url` is populated:
   ```sql
   SELECT COUNT(*) FROM raw_trends WHERE image_url IS NOT NULL;
   ```
2. Check frontend fallback: Should use `/fallback/news.jpg` when `image_url` is null
3. Verify FeedCard component uses `image_url` correctly

## Success Criteria

- ✅ All gists have `raw_trend_id` populated
- ✅ No image mismatches (gist.image_url = raw_trend.image_url)
- ✅ No URL mismatches (gist.source_url = raw_trend.url)
- ✅ Strict 1:1 mapping (one gist per raw_trend)
- ✅ Console logs show consistent `raw_trend_id` across pipeline
- ✅ Feed displays correct images matching headlines

## Post-Deployment Monitoring

**Daily Checks:**
1. Monitor function logs for errors
2. Check for mismatch warnings in console
3. Verify new gists have `raw_trend_id` populated
4. Spot-check feed to ensure images match headlines

**Weekly Checks:**
1. Run verification SQL queries
2. Check for any orphaned gists (raw_trend_id IS NULL)
3. Review error logs for patterns

---

**Status:** ✅ Ready for deployment

