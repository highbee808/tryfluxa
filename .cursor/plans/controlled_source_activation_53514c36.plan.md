---
name: Controlled Source Activation
overview: Safely activate verified content sources (TMDB, RapidAPI Sports, Ticketmaster) in the database, ensuring proper environment variable validation, sequential activation, and full observability with instant rollback capability.
todos: []
---

# Phase 5: Controlled Source Activation - Fluxa Content System

## Overview

Activate verified content sources (TMDB, RapidAPI Sports, Ticketmaster) in a controlled, sequential manner. All sources will start with `is_active = false` in the database, then be activated one at a time with verification between each step.

**Activation Strategy:**

- Add missing sources to `content_sources` table (tmdb, rapidapi-sports, ticketmaster)
- Set all sources to `is_active = false` initially
- Activate one source at a time
- Verify each source before activating the next
- Maintain instant rollback via database flag

---

## Environment Variables Required

Based on adapter implementations:

| Source | Env Var | Status |

|--------|---------|--------|

| **tmdb** | `TMDB_API_KEY`  | ✅ Available |

| **rapidapi-sports** | `RAPIDAPI_KEY` | ✅ Available |

| **ticketmaster** | `TICKETMASTER_API_KEY` | ✅ Available |

| mediastack | `MEDIASTACK_KEY` | ❌ Not available (skip) |

| api-sports | N/A | ⚠️ Stub only (skip) |

---

## Database Changes

### Step 1: Add Missing Sources to `content_sources`

The migration only seeded `newsapi`, `guardian`, and `mediastack`. We need to add:

- `tmdb`
- `rapidapi-sports`
- `ticketmaster`

**SQL to execute:**

```sql
-- Add missing sources (all inactive initially)
INSERT INTO public.content_sources (source_key, name, api_base_url, is_active, config) VALUES
  ('tmdb', 'The Movie Database', 'https://api.themoviedb.org/3', false, '{"requires_auth": true}'::jsonb),
  ('rapidapi-sports', 'RapidAPI Sports News', 'https://sportspage-feeds.p.rapidapi.com', false, '{"requires_auth": true}'::jsonb),
  ('ticketmaster', 'Ticketmaster Discovery API', 'https://app.ticketmaster.com/discovery/v2', false, '{"requires_auth": true}'::jsonb)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_base_url = EXCLUDED.api_base_url,
  config = EXCLUDED.config,
  updated_at = now();
```

### Step 2: Ensure All Sources Start Inactive

```sql
-- Set all sources to inactive (safe default)
UPDATE public.content_sources
SET is_active = false, updated_at = now();
```

---

## Activation Sequence

### Phase 5.1: Activate TMDB (Movies/TV)

**Why first:** TMDB is free, has high-quality data, and provides trending content.

**Steps:**

1. **Verify environment variable:**
   ```bash
   # Check if TMDB_API_KEY exists
   echo $TMDB_API_KEY  # or check in Vercel dashboard
   ```

2. **Activate in database:**
   ```sql
   UPDATE public.content_sources
   SET is_active = true, updated_at = now()
   WHERE source_key = 'tmdb';
   ```

3. **Manual test ingestion:**
   ```bash
   # Trigger single source ingestion
   curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=tmdb"
   ```


Or use the script:

   ```bash
   tsx scripts/ingestion/run-ingestion.ts tmdb
   ```

4. **Verify results:**
   ```sql
   -- Check latest run
   SELECT source_id, status, items_fetched, items_created, items_skipped, started_at, completed_at, error_message
   FROM content_runs
   WHERE source_id = (SELECT id FROM content_sources WHERE source_key = 'tmdb')
   ORDER BY started_at DESC
   LIMIT 1;
   
   -- Check items created
   SELECT COUNT(*) as item_count, MIN(created_at) as first_item, MAX(created_at) as latest_item
   FROM content_items
   WHERE source_id = (SELECT id FROM content_sources WHERE source_key = 'tmdb');
   ```

5. **Wait one cron cycle** (1 hour) to verify cadence check works

6. **Verify deduplication:**
   ```sql
   -- Run ingestion again (should skip due to cadence)
   -- Then force run to test dedup
   curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=tmdb&force=true"
   
   -- Verify items_skipped > 0 (duplicates detected)
   SELECT items_skipped, items_created
   FROM content_runs
   WHERE source_id = (SELECT id FROM content_sources WHERE source_key = 'tmdb')
   ORDER BY started_at DESC
   LIMIT 1;
   ```


---

### Phase 5.2: Activate RapidAPI Sports

**Why second:** Sports content is valuable, but verify TMDB stability first.

**Steps:**

1. **Verify environment variable:**
   ```bash
   echo $RAPIDAPI_KEY
   ```

2. **Activate in database:**
   ```sql
   UPDATE public.content_sources
   SET is_active = true, updated_at = now()
   WHERE source_key = 'rapidapi-sports';
   ```

3. **Manual test ingestion:**
   ```bash
   curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=rapidapi-sports"
   ```

4. **Verify results** (same SQL queries as TMDB, replace `source_key = 'rapidapi-sports'`)

5. **Wait one cron cycle**

---

### Phase 5.3: Activate Ticketmaster

**Why third:** Events data is valuable but less critical than news/movies.

**Steps:**

1. **Verify environment variable:**
   ```bash
   echo $TICKETMASTER_API_KEY
   ```

2. **Activate in database:**
   ```sql
   UPDATE public.content_sources
   SET is_active = true, updated_at = now()
   WHERE source_key = 'ticketmaster';
   ```

3. **Manual test ingestion:**
   ```bash
   curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=ticketmaster"
   ```

4. **Verify results** (same SQL queries, replace `source_key = 'ticketmaster'`)

5. **Wait one cron cycle**

---

## Observability Queries

### Latest Runs Per Source

```sql
SELECT 
  cs.source_key,
  cs.name,
  cr.status,
  cr.items_fetched,
  cr.items_created,
  cr.items_skipped,
  cr.items_updated,
  cr.started_at,
  cr.completed_at,
  cr.error_message
FROM content_runs cr
JOIN content_sources cs ON cr.source_id = cs.id
WHERE cr.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY cr.started_at DESC;
```

### Total Items Per Source

```sql
SELECT 
  cs.source_key,
  cs.name,
  cs.is_active,
  COUNT(ci.id) as total_items,
  COUNT(CASE WHEN ci.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as items_last_24h,
  MIN(ci.created_at) as first_item,
  MAX(ci.created_at) as latest_item
FROM content_sources cs
LEFT JOIN content_items ci ON cs.id = ci.source_id
GROUP BY cs.id, cs.source_key, cs.name, cs.is_active
ORDER BY cs.source_key;
```

### Source Activity Summary

```sql
SELECT 
  cs.source_key,
  cs.is_active,
  COUNT(DISTINCT cr.id) as total_runs,
  COUNT(DISTINCT CASE WHEN cr.status = 'success' THEN cr.id END) as successful_runs,
  COUNT(DISTINCT CASE WHEN cr.status = 'failed' THEN cr.id END) as failed_runs,
  COUNT(DISTINCT CASE WHEN cr.status = 'skipped' THEN cr.id END) as skipped_runs,
  SUM(cr.items_created) as total_items_created,
  SUM(cr.items_skipped) as total_items_skipped
FROM content_sources cs
LEFT JOIN content_runs cr ON cs.id = cr.source_id
WHERE cr.started_at >= NOW() - INTERVAL '7 days' OR cr.started_at IS NULL
GROUP BY cs.id, cs.source_key, cs.is_active
ORDER BY cs.source_key;
```

### Deduplication Effectiveness

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

---

## Rollback Plan

### Instant Rollback (No Deploy Required)

**Disable a source:**

```sql
UPDATE public.content_sources
SET is_active = false, updated_at = now()
WHERE source_key = 'SOURCE_KEY';
```

**Disable all sources:**

```sql
UPDATE public.content_sources
SET is_active = false, updated_at = now();
```

**Verify rollback:**

```sql
SELECT source_key, name, is_active
FROM content_sources
ORDER BY source_key;
```

The cron will skip inactive sources automatically (checked in `getAllEnabledSources()`).

---

## Guardrails Verification

### 1. Max Items Per Run

Verify in `content_config`:

```sql
SELECT config_key, config_value
FROM content_config
WHERE config_key = 'ingestion.max_items_per_run';
```

Default: 100 items per run (enforced in runner)

### 2. Cadence Check

Verify refresh window:

```sql
SELECT config_key, config_value
FROM content_config
WHERE config_key = 'ingestion.refresh_hours';
```

Default: 3 hours (enforced in runner)

### 3. Budget Enforcement

For API-SPORTS (when implemented):

```sql
SELECT 
  cs.source_key,
  aub.usage_count,
  aub.period_start,
  aub.period_end
FROM api_usage_budget aub
JOIN content_sources cs ON aub.source_id = cs.id
WHERE aub.period_start <= NOW()
  AND aub.period_end > NOW()
ORDER BY cs.source_key;
```

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

---

## Files Modified

**No code changes required.** All activation is database-only:

- `content_sources` table: `is_active` flag
- SQL migration/script to add missing sources (optional, can use Supabase dashboard)

---

## Notes

- **Mediastack is skipped** (no API key available)
- **API-SPORTS is skipped** (stub adapter, not implemented)
- **NewsAPI and Guardian** remain inactive (not in adapter registry)
- All sources start with `is_active = false` for safety
- Activation is instant (no deploy needed)
- Rollback is instant (set `is_active = false`)
- Cron respects `is_active` flag automatically
- One source failure doesn't stop others (already implemented in Phase 4)

---

## Next Steps After Activation

1. Monitor `content_runs` for 24-48 hours
2. Verify deduplication rates are healthy (>50% for stable sources)
3. Check API quota usage (if applicable)
4. Review `content_items` growth rate
5. Only then activate next source