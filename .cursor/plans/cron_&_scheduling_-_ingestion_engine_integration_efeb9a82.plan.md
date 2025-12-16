---
name: Cron & Scheduling - Ingestion Engine Integration
overview: Create a new Vercel cron route `/api/cron/run-ingestion` that orchestrates the Phase 3 ingestion engine. The route will load all enabled content sources, respect refresh windows, call runIngestion() for each source, and return structured results. Keeps existing `/api/cron/generate` unchanged.
todos: []
---

# Phase 4: Cron & Scheduling - Fluxa Content System

## Overview

Create a new Vercel cron route that orchestrates the Phase 3 ingestion engine. The route will:

- Load all enabled content sources from database
- Check refresh windows per source (respects cadence)
- Call `runIngestion()` for each due source
- Handle errors gracefully (one failure doesn't stop others)
- Return structured JSON response with run statistics

**Architecture:** New route `/api/cron/run-ingestion` alongside existing `/api/cron/generate` (unchanged).

---

## Files to Create/Modify

### 1. New Cron Route

**File:** `src/app/api/cron/run-ingestion/route.ts`

**Purpose:** Orchestrator that runs ingestion for all enabled sources.

**Functions:**

- `GET` handler: Main cron entrypoint
- `POST` handler: Manual trigger support
- `validateCronSecret()`: Verify CRON_SECRET from query param
- `getAllEnabledSources()`: Query content_sources WHERE is_active = true
- `orchestrateIngestion()`: Main orchestration logic

---

## Implementation Details

### Cron Route Handler (`src/app/api/cron/run-ingestion/route.ts`)

**Structure:**

```typescript
export async function GET(req: Request): Promise<Response>
export async function POST(req: Request): Promise<Response>
```

**Flow:**

1. **Validate cron secret:**

   - Read `CRON_SECRET` from `process.env`
   - Extract `secret` from URL query params (`?secret=xxx`)
   - If `CRON_SECRET` is set and doesn't match: return 401
   - If `CRON_SECRET` is not set: allow (for local dev, but log warning)

2. **Parse optional query flags:**

   - `?force=true` → bypass refresh windows for all sources
   - `?source=mediastack` → run only specified source (still respects refresh unless force=true)

3. **Load enabled sources:**

   - Query `content_sources` WHERE `is_active = true`
   - If `?source=X` provided: filter to that source only
   - If no sources found: return early with message

4. **Orchestrate ingestion:**

   - For each enabled source:
     - Call `runIngestion(sourceKey, { force: queryForce })`
     - Catch errors per source (don't let one failure stop others)
     - Track results: `sourcesRun`, `sourcesSkipped`, `errors`

5. **Return structured response:**
   ```json
   {
     "success": true,
     "timestamp": "2025-01-15T10:00:00.000Z",
     "sources_processed": 3,
     "sources_run": ["mediastack", "tmdb"],
     "sources_skipped": ["rapidapi-sports"],
     "results": [
       {
         "sourceKey": "mediastack",
         "runId": "uuid",
         "itemsFetched": 50,
         "itemsCreated": 45,
         "itemsSkipped": 5,
         "itemsUpdated": 0,
         "success": true
       }
     ],
     "errors": []
   }
   ```


**Error Handling:**

- Wrap each `runIngestion()` call in try-catch
- Log errors to console (for debugging)
- Continue processing other sources even if one fails
- Return partial success if some sources succeed

**Safety Guards:**

- Max execution time awareness (log warning if > 5 minutes)
- Idempotent: safe to call multiple times (cadence check prevents duplicates)
- Graceful degradation: missing API keys result in skipped sources, not crashes

---

### Helper Functions

**`getAllEnabledSources()`:**

- Query: `SELECT * FROM content_sources WHERE is_active = true ORDER BY source_key`
- Returns array of `ContentSourceRecord`
- Uses `getSupabaseClient()` from `src/lib/ingestion/db.ts`

**`validateCronSecret(req: Request): boolean`:**

- Extract `secret` from URL query params
- Compare with `process.env.CRON_SECRET`
- Return `true` if matches or if `CRON_SECRET` not set (dev mode)
- Log warning if `CRON_SECRET` not set in production

---

## Security Considerations

1. **Cron Secret Validation:**

   - Required in production (Vercel adds `?secret=xxx` to cron requests)
   - Optional in development (allows local testing)
   - Query param: `?secret=CRON_SECRET_VALUE`

2. **Query Flag Protection:**

   - `?force=true` and `?source=X` require valid secret
   - Prevents unauthorized bypass of cadence checks

3. **Environment Detection:**

   - Check `process.env.VERCEL_ENV` or `process.env.NODE_ENV`
   - Stricter validation in production

4. **Rate Limiting:**

   - Cadence checks prevent too-frequent runs (built into `runIngestion()`)
   - No additional rate limiting needed

---

## Response Format

**Success Response (200):**

```json
{
  "success": true,
  "timestamp": "2025-01-15T10:00:00.000Z",
  "sources_processed": 3,
  "sources_run": ["mediastack", "tmdb"],
  "sources_skipped": ["rapidapi-sports"],
  "results": [
    {
      "sourceKey": "mediastack",
      "runId": "uuid-here",
      "itemsFetched": 50,
      "itemsCreated": 45,
      "itemsSkipped": 5,
      "itemsUpdated": 0,
      "success": true,
      "error": null
    }
  ],
  "errors": []
}
```

**Partial Success (200):**

```json
{
  "success": true,
  "timestamp": "2025-01-15T10:00:00.000Z",
  "sources_processed": 3,
  "sources_run": ["mediastack"],
  "sources_skipped": ["rapidapi-sports"],
  "results": [...],
  "errors": [
    {
      "sourceKey": "tmdb",
      "error": "TMDB_API_KEY is not configured"
    }
  ]
}
```

**Unauthorized (401):**

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing cron secret"
}
```

---

## Vercel Configuration

**No changes to `vercel.json` required** - existing cron at `/api/cron/generate` remains unchanged.

**Optional:** Add new cron entry for ingestion (if desired):

```json
{
  "crons": [
    {
      "path": "/api/cron/generate",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/run-ingestion",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Note:** Both can run on the same schedule; ingestion engine's cadence check prevents duplicate work.

---

## Testing Strategy

### Local Testing (No Real API Calls)

**Option 1: Mock adapters**

- Create test adapters that return mock data
- Test orchestration logic without hitting real APIs

**Option 2: Dry-run mode**

- Add `?dryRun=true` query param
- Skip actual `runIngestion()` calls, return mock results
- Useful for testing route structure

**Option 3: Single source test**

- Use `?source=mediastack` to test one adapter
- Requires API key but limits scope

### Manual Trigger (with Secret)

```bash
# Test with secret
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET"

# Test single source
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&source=mediastack"

# Force run (bypass cadence)
curl -X GET "http://localhost:3000/api/cron/run-ingestion?secret=YOUR_CRON_SECRET&force=true"
```

### Validation After Run

**Check content_runs:**

```sql
SELECT source_id, status, items_created, items_skipped, started_at, completed_at
FROM content_runs
ORDER BY started_at DESC
LIMIT 10;
```

**Check content_items:**

```sql
SELECT source_id, COUNT(*) as item_count
FROM content_items
GROUP BY source_id;
```

---

## Error Handling Strategy

1. **Source-level errors:**

   - Catch errors from `runIngestion()`
   - Log to console with source context
   - Add to `errors` array in response
   - Continue processing other sources

2. **Database errors:**

   - If `getAllEnabledSources()` fails: return 500 with error
   - If individual source query fails: skip that source, log error

3. **Adapter errors:**

   - Handled by `runIngestion()` (marks run as failed)
   - Propagated in response `errors` array

4. **Missing API keys:**

   - Adapters throw clear errors
   - Caught and logged, source marked as failed
   - Doesn't crash entire orchestration

---

## Implementation Checklist

- [ ] Create `src/app/api/cron/run-ingestion/route.ts` with GET and POST handlers
- [ ] Implement `validateCronSecret()` function
- [ ] Implement `getAllEnabledSources()` helper (uses `getSupabaseClient()` from ingestion/db.ts)
- [ ] Implement orchestration logic (loop through sources, call `runIngestion()`)
- [ ] Add error handling per source (try-catch around each `runIngestion()`)
- [ ] Add query param parsing (`?force=true`, `?source=X`)
- [ ] Add execution time tracking (log warning if > 5 minutes)
- [ ] Return structured JSON response with results
- [ ] Test locally with mock data (dry-run mode)
- [ ] Test with single source (requires API key)
- [ ] Verify cadence check works (run twice, second should skip)
- [ ] Verify force flag bypasses cadence
- [ ] Verify secret validation works
- [ ] Document manual trigger commands

---

## Dependencies

**Existing (no install needed):**

- `src/lib/ingestion/runner.ts` (Phase 3)
- `src/lib/ingestion/db.ts` (Phase 3)
- `@supabase/supabase-js` (already in dependencies)

**Environment Variables:**

- `CRON_SECRET` (optional for local dev, required for production)
- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY`
- API keys for adapters (MEDIASTACK_KEY, TMDB_API_KEY, etc.)

---

## Phase Boundaries (Deferred)

**Phase 5 (AI Summarization):**

- Summarization of content_items into gists
- Not implemented in Phase 4

**Phase 6 (Feed/User Delivery):**

- User-facing endpoints to fetch unseen content
- Not implemented in Phase 4

**Existing Pipeline:**

- `/api/cron/generate` remains unchanged
- Old `runContentPipeline()` continues to work
- Both systems can coexist

---

## Notes

- New route is idempotent (safe to call multiple times)
- Cadence checks prevent duplicate work
- One source failure doesn't stop others
- Missing API keys result in skipped sources (graceful degradation)
- Execution time logged for monitoring
- Structured response enables observability
- Manual triggers supported for debugging
- Secret validation prevents unauthorized access