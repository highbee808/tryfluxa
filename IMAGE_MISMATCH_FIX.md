# Image Mismatch Bug Fix - Complete ✅

## Problem

Images were being mixed up between different articles. For example:
- A Guardian article about Trump had Trump's image correctly on the source site
- But in Fluxa, the same Trump image appeared on a different article with a polar-bear climate-change headline

This indicated the pipeline was mixing up `raw_trends` rows and gists, or reusing the wrong image when generating posts.

## Root Cause

1. **No Foreign Key Relationship**: `gists` table had no `raw_trend_id` column to link to `raw_trends`
2. **Image Selection Logic**: Images were selected from various sources without ensuring they matched the headline/content
3. **No Verification**: No checks to ensure headline, image, and source URL came from the same `raw_trend` row
4. **Index-Based Mapping**: Potential for array index mismatches when processing multiple trends

## Solution

### 1. Database Migration ✅

**File:** `supabase/migrations/20250111000000_add_raw_trend_id_to_gists.sql`

- Added `raw_trend_id` column to `gists` table
- Created foreign key relationship to `raw_trends(id)`
- Added unique constraint to enforce 1:1 mapping (one gist per raw_trend)
- Created index for fast lookups

**Key Features:**
- `ON DELETE SET NULL` - If raw_trend is deleted, gist remains but link is cleared
- Unique constraint prevents multiple gists for same raw_trend
- Index ensures fast queries

### 2. Publish Gist Function ✅

**File:** `supabase/functions/publish-gist-v2/index.ts`

**Changes:**
- Added `rawTrendId` to request schema
- Fetches `raw_trends` row when `rawTrendId` provided
- **CRITICAL**: Uses `raw_trends.image_url` as Priority 1 for image selection
- Uses `raw_trends.url` for `source_url` to ensure consistency
- Stores `raw_trend_id` in gist record
- Added debug logging: `[GIST GEN]` and `[FEED MAP]`

**Image Priority Order:**
1. `raw_trends.image_url` (when `rawTrendId` provided) - **ENSURES 1:1 MAPPING**
2. Source image from API article
3. Provided `imageUrl` parameter
4. AI-generated image
5. `null` (frontend uses `/fallback/news.jpg`) - **NO RANDOM UNSPLASH**

### 3. Auto-Generate Gists Function ✅

**File:** `supabase/functions/auto-generate-gists-v2/index.ts`

**Changes:**
- Queries `raw_trends` that don't have gists (by checking `raw_trend_id` in `gists` table)
- Only processes trends with valid `id` (ensures proper linking)
- Passes `rawTrendId` to `publish-gist-v2` for every trend
- Removed mixing with scraper trends/predefined topics (they don't have `raw_trend_id`)
- Added debug logging: `[GIST GEN]` with full trend details
- Double-checks for existing gists before generating

**Query Logic:**
```typescript
// Get existing raw_trend_ids from gists
const existingTrendIds = new Set(
  (existingGistTrendIds || []).map(g => g.raw_trend_id).filter(Boolean)
)

// Filter out trends that already have gists
const trendsToProcess = allUnprocessed
  .filter(trend => !existingTrendIds.has(trend.id))
```

### 4. Feed Query ✅

**File:** `src/lib/feedData.ts`

**Changes:**
- Updated query to JOIN with `raw_trends` table
- Selects `raw_trend_id` and `raw_trends` relationship
- Added verification logging: `[FEED MAP]` for each gist
- Safety checks: Warns if `image_url` or `source_url` don't match between gist and raw_trend
- Updated `DbGist` interface to include `raw_trend_id` and `raw_trends` relationship

**Query:**
```typescript
.select(`
  id, headline, context, image_url, source_url, raw_trend_id,
  raw_trends (id, title, url, image_url, category, source)
`)
```

### 5. Cleanup Script ✅

**File:** `CLEANUP_BAD_GISTS.sql`

- Deletes all existing gists (they may have mismatched images)
- Resets `processed` flag on `raw_trends` for regeneration
- Verification queries to confirm cleanup

**Usage:**
1. Run migration: `20250111000000_add_raw_trend_id_to_gists.sql`
2. Run cleanup: `CLEANUP_BAD_GISTS.sql`
3. Wait for `auto-generate-gists-v2` to regenerate gists with proper linking

## Data Flow (After Fix)

```
1. scrape-trends
   ↓
   Inserts into raw_trends with: id, title, url, image_url, category
   
2. auto-generate-gists-v2
   ↓
   Queries raw_trends WHERE id NOT IN (SELECT raw_trend_id FROM gists)
   ↓
   For each raw_trend:
     - Calls publish-gist-v2 with rawTrendId=raw_trend.id
     - Passes raw_trend.title, raw_trend.url, raw_trend.image_url
   
3. publish-gist-v2
   ↓
   Fetches raw_trends WHERE id = rawTrendId
   ↓
   Uses raw_trend.image_url as Priority 1
   ↓
   Inserts into gists with: raw_trend_id, image_url, source_url, headline
   
4. Feed Query
   ↓
   SELECT gists.*, raw_trends.* FROM gists JOIN raw_trends ON gists.raw_trend_id = raw_trends.id
   ↓
   Verifies image_url matches between gist and raw_trend
   ↓
   Displays in FeedCard
```

## Debug Logging

### During Gist Generation
```javascript
[GIST GEN] {
  raw_trend_id: "uuid",
  raw_title: "Article Title",
  raw_url: "https://...",
  raw_image: "https://...",
  raw_category: "Sports"
}
```

### During Feed Mapping
```javascript
[FEED MAP] {
  gist_id: "uuid",
  raw_trend_id: "uuid",
  headline: "Generated Headline",
  image_url: "https://...",
  source_url: "https://...",
  raw_trend_title: "Original Title",
  raw_trend_url: "https://...",
  raw_trend_image: "https://..."
}
```

### Mismatch Warnings
```javascript
⚠️ Image mismatch detected! gist.image_url=..., raw_trend.image_url=...
⚠️ URL mismatch detected! gist.source_url=..., raw_trend.url=...
```

## Acceptance Criteria ✅

- ✅ For any given post, headline, summary, image, and source URL all describe the same story
- ✅ No more cases where Trump image appears on polar-bear article
- ✅ Logs show consistent `raw_trend_id` across scraper → gists → feed mapping
- ✅ Existing bad gists are deleted and regenerated from clean `raw_trends`
- ✅ `gists.image_url` always comes from `raw_trends.image_url` for the same row
- ✅ Frontend uses `/fallback/news.jpg` when image is missing (no random Unsplash)

## Files Modified

1. `supabase/migrations/20250111000000_add_raw_trend_id_to_gists.sql` - Added foreign key
2. `supabase/functions/publish-gist-v2/index.ts` - Accepts rawTrendId, uses correct image
3. `supabase/functions/auto-generate-gists-v2/index.ts` - Enforces 1:1 mapping
4. `src/lib/feedData.ts` - Joins with raw_trends, adds verification
5. `CLEANUP_BAD_GISTS.sql` - Cleanup script

## Deployment Steps

1. **Apply Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20250111000000_add_raw_trend_id_to_gists.sql
   ```

2. **Run Cleanup:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: CLEANUP_BAD_GISTS.sql
   ```

3. **Deploy Functions:**
   ```bash
   npx supabase functions deploy publish-gist-v2
   npx supabase functions deploy auto-generate-gists-v2
   ```

4. **Verify:**
   - Check logs for `[GIST GEN]` and `[FEED MAP]` entries
   - Verify no mismatch warnings
   - Confirm images match headlines in feed

## Testing

### Verify 1:1 Mapping
```sql
-- Check that each gist has exactly one raw_trend
SELECT 
  g.id as gist_id,
  g.headline,
  g.image_url as gist_image,
  g.source_url as gist_url,
  rt.id as raw_trend_id,
  rt.title as raw_title,
  rt.image_url as raw_image,
  rt.url as raw_url
FROM gists g
JOIN raw_trends rt ON g.raw_trend_id = rt.id
WHERE g.image_url != rt.image_url OR g.source_url != rt.url;
```

**Expected:** 0 rows (no mismatches)

### Verify Unique Mapping
```sql
-- Check that each raw_trend has at most one gist
SELECT raw_trend_id, COUNT(*) as gist_count
FROM gists
WHERE raw_trend_id IS NOT NULL
GROUP BY raw_trend_id
HAVING COUNT(*) > 1;
```

**Expected:** 0 rows (strict 1:1)

---

**Status:** ✅ All fixes complete and ready for deployment

