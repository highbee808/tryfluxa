# Phase 5: Controlled Source Activation Guide

This guide walks through activating content sources one at a time with verification at each step.

## Prerequisites

1. **Database migration applied**: Run `20250116000000_add_missing_content_sources.sql`
2. **Environment variables configured**:
   - `TMDB_API_KEY` (or `VITE_TMDB_API_KEY`)
   - `RAPIDAPI_KEY`
   - `TICKETMASTER_API_KEY`
3. **Cron endpoint accessible**: `/api/cron/run-ingestion`

## Activation Sequence

### Step 1: Verify All Sources Are Inactive

```sql
SELECT source_key, name, is_active
FROM content_sources
ORDER BY source_key;
```

All sources should have `is_active = false`.

---

### Step 2: Activate TMDB (First Source)

#### 2.1 Verify Environment Variable

Check that `TMDB_API_KEY` exists in your environment (Vercel dashboard or local `.env`).

#### 2.2 Activate in Database

```sql
UPDATE public.content_sources
SET is_active = true, updated_at = now()
WHERE source_key = 'tmdb';
```

#### 2.3 Manual Test Ingestion

**Option A: Using curl (production/local server)**
```bash
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=tmdb"
```

**Option B: Using the script (local)**
```bash
tsx scripts/ingestion/run-ingestion.ts tmdb
```

#### 2.4 Verify Results

Run queries from `scripts/ingestion/verify-ingestion.sql`:

```sql
-- Check latest run
SELECT 
  cs.source_key,
  cr.status,
  cr.items_fetched,
  cr.items_created,
  cr.items_skipped,
  cr.started_at,
  cr.error_message
FROM content_runs cr
JOIN content_sources cs ON cr.source_id = cs.id
WHERE cs.source_key = 'tmdb'
ORDER BY cr.started_at DESC
LIMIT 1;

-- Check items created
SELECT COUNT(*) as item_count
FROM content_items ci
JOIN content_sources cs ON ci.source_id = cs.id
WHERE cs.source_key = 'tmdb';
```

**Expected results:**
- `status = 'success'`
- `items_created > 0`
- Items exist in `content_items` table

#### 2.5 Test Deduplication

Force a second run to verify deduplication works:

```bash
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=tmdb&force=true"
```

Then check:
```sql
SELECT items_skipped, items_created
FROM content_runs cr
JOIN content_sources cs ON cr.source_id = cs.id
WHERE cs.source_key = 'tmdb'
ORDER BY cr.started_at DESC
LIMIT 1;
```

**Expected:** `items_skipped > 0` (duplicates detected)

#### 2.6 Wait One Cron Cycle

Wait at least 1 hour, then verify automatic ingestion ran:

```sql
SELECT 
  cs.source_key,
  cr.status,
  cr.started_at,
  cr.items_created
FROM content_runs cr
JOIN content_sources cs ON cr.source_id = cs.id
WHERE cs.source_key = 'tmdb'
  AND cr.started_at >= NOW() - INTERVAL '2 hours'
ORDER BY cr.started_at DESC;
```

**Expected:** At least one successful run in the last 2 hours.

#### 2.7 Monitor for 24 Hours

Before activating the next source, monitor TMDB for 24 hours to ensure stability.

---

### Step 3: Activate RapidAPI Sports (Second Source)

#### 3.1 Verify Environment Variable

Check that `RAPIDAPI_KEY` exists.

#### 3.2 Activate in Database

```sql
UPDATE public.content_sources
SET is_active = true, updated_at = now()
WHERE source_key = 'rapidapi-sports';
```

#### 3.3 Manual Test Ingestion

```bash
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=rapidapi-sports"
```

#### 3.4 Verify Results

Use the same verification queries as Step 2.4, replacing `'tmdb'` with `'rapidapi-sports'`.

#### 3.5 Wait One Cron Cycle

Wait 1 hour and verify automatic ingestion.

#### 3.6 Monitor for 24 Hours

Monitor before activating next source.

---

### Step 4: Activate Ticketmaster (Third Source)

#### 4.1 Verify Environment Variable

Check that `TICKETMASTER_API_KEY` exists.

#### 4.2 Activate in Database

```sql
UPDATE public.content_sources
SET is_active = true, updated_at = now()
WHERE source_key = 'ticketmaster';
```

#### 4.3 Manual Test Ingestion

```bash
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=ticketmaster"
```

#### 4.4 Verify Results

Use the same verification queries, replacing with `'ticketmaster'`.

#### 4.5 Wait One Cron Cycle

Wait 1 hour and verify automatic ingestion.

---

## Rollback (If Needed)

### Deactivate a Single Source

```sql
UPDATE public.content_sources
SET is_active = false, updated_at = now()
WHERE source_key = 'SOURCE_KEY';
```

### Deactivate All Sources (Emergency)

```sql
UPDATE public.content_sources
SET is_active = false, updated_at = now();
```

**Note:** Rollback is instant - no deploy required. The cron will automatically skip inactive sources.

---

## Observability

### Daily Health Check Query

```sql
SELECT 
  cs.source_key,
  cs.is_active,
  COUNT(DISTINCT cr.id) as runs_last_24h,
  SUM(cr.items_created) as items_created_last_24h,
  SUM(cr.items_skipped) as items_skipped_last_24h,
  MAX(cr.started_at) as last_run
FROM content_sources cs
LEFT JOIN content_runs cr ON cs.id = cr.source_id
  AND cr.started_at >= NOW() - INTERVAL '24 hours'
GROUP BY cs.id, cs.source_key, cs.is_active
ORDER BY cs.source_key;
```

### Deduplication Health

```sql
SELECT 
  cs.source_key,
  SUM(cr.items_fetched) as total_fetched,
  SUM(cr.items_created) as total_created,
  SUM(cr.items_skipped) as total_skipped,
  ROUND(100.0 * SUM(cr.items_skipped) / NULLIF(SUM(cr.items_fetched), 0), 2) as dedup_rate_percent
FROM content_sources cs
JOIN content_runs cr ON cs.id = cr.source_id
WHERE cr.started_at >= NOW() - INTERVAL '7 days'
  AND cr.items_fetched > 0
GROUP BY cs.source_key
ORDER BY cs.source_key;
```

**Healthy deduplication rate:** >50% for stable sources (indicates system is working correctly and avoiding duplicates).

---

## Troubleshooting

### Source Not Running

1. Check `is_active = true` in database
2. Check environment variable exists
3. Check latest `content_runs` entry for error messages
4. Verify cron endpoint is accessible

### High Error Rate

1. Check API key validity
2. Check API quota/rate limits
3. Review `error_message` in `content_runs`
4. Check adapter implementation for source-specific issues

### No Items Created

1. Verify API returned data (check `items_fetched` in `content_runs`)
2. Check if all items were skipped (deduplication working too well)
3. Verify adapter parsing logic

---

## Safety Checklist

Before activating any source:
- [ ] Environment variable exists and is valid
- [ ] Source exists in `content_sources` table
- [ ] Source is set to `is_active = false`
- [ ] Manual test ingestion succeeds
- [ ] Items are created in `content_items`
- [ ] Deduplication works (second run skips duplicates)
- [ ] Cadence check works (second run within 3h window is skipped)
- [ ] Error handling works (missing key = skipped, not crash)
- [ ] Rollback tested (set `is_active = false`, verify cron skips)

After activating:
- [ ] Wait one cron cycle (1 hour)
- [ ] Verify automatic ingestion runs
- [ ] Check `content_runs` for successful status
- [ ] Monitor for 24 hours before activating next source
