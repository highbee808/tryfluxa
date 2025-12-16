---
name: Content Ingestion Engine - Runner and Adapters
overview: Implement server-side ingestion engine with reusable runner, source adapters, and database integration. Supports idempotent runs, config-driven cadence, and manual triggering for development/testing. Core logic in src/lib/ingestion/ with manual trigger scripts in scripts/ingestion/.
todos: []
---

# Phase 3: Ingestion Engine (Runner + Adapters) - Fluxa Content System

## Overview

Implement a server-side ingestion engine that:

- Fetches content from multiple API sources via adapters
- Writes to Phase 1 database tables (content_items, content_runs, etc.)
- Enforces global deduplication via content_hash
- Supports config-driven cadence (3 hours default)
- Provides manual triggers for development/testing
- Tracks API usage budgets for quota-gated sources

**Architecture:** Core logic in `src/lib/ingestion/` (reusable modules), manual triggers in `scripts/ingestion/` (standalone Node.js scripts).

---

## File Structure

```
src/lib/ingestion/
  types.ts                    # TypeScript interfaces (Adapter, NormalizedItem, etc.)
  runner.ts                   # Main ingestion runner (runIngestion function)
  db.ts                       # Database operations (Supabase client, queries)
  budget.ts                   # API usage budget helper (for quota-gated sources)
  adapters/
    base.ts                   # Base adapter interface/abstract class
    mediastack.ts             # Mediastack adapter
    tmdb.ts                   # TMDB adapter
    rapidapi-sports.ts        # RapidAPI sports news adapter
    ticketmaster.ts           # Ticketmaster adapter
    api-sports.ts             # API-SPORTS adapter (stub, budget-gated)

scripts/ingestion/
  run-ingestion.ts            # Manual trigger script (CLI)
  test-adapter.ts             # Test individual adapters
```

---

## Core Components

### 1. Type Definitions (`src/lib/ingestion/types.ts`)

**Adapter Interface:**

```typescript
export interface ContentAdapter {
  sourceKey: string;
  fetch(): Promise<unknown>;  // Returns raw API response
  parse(raw: unknown): Promise<NormalizedItem[]>;
}
```

**NormalizedItem Interface:**

```typescript
export interface NormalizedItem {
  title: string;              // Raw title (for display)
  sourceUrl: string;          // Canonical URL
  imageUrl?: string;          // Optional featured image
  excerpt?: string;           // Optional summary/excerpt
  publishedAt?: string | null; // ISO timestamp or null
  externalId?: string;        // Optional API-specific ID
  contentType?: string;       // Optional: 'article', 'event', 'movie', etc.
  categories?: string[];      // Optional: array of category names/slugs
  rawData?: Record<string, any>; // Optional: full API response for debugging
}
```

**IngestionResult Interface:**

```typescript
export interface IngestionResult {
  success: boolean;
  runId: string;
  itemsFetched: number;
  itemsCreated: number;
  itemsSkipped: number;
  itemsUpdated: number;
  error?: string;
}
```

---

### 2. Database Client (`src/lib/ingestion/db.ts`)

**Purpose:** Centralized Supabase client creation and database operations.

**Functions:**

- `getSupabaseClient()`: Creates Supabase client with service role key
- `getContentSource(sourceKey: string)`: Fetches content_sources row
- `getContentConfig(key: string)`: Fetches content_config value
- `getLastSuccessfulRun(sourceId: string)`: Gets most recent completed run
- `createContentRun(sourceId: string)`: Creates content_runs row, returns run ID
- `updateContentRun(runId: string, data)`: Updates content_runs with results
- `checkContentHashExists(hash: string)`: Checks if content_hash exists
- `insertContentItem(data)`: Inserts new content_items row
- `updateContentItemByExternalId(sourceId, externalId, data)`: Updates existing item
- `getCategoryIds(names: string[])`: Maps category names to IDs

**Service Role Access:**

- Use `process.env.SUPABASE_SERVICE_ROLE_KEY` or `process.env.VITE_SUPABASE_SERVICE_ROLE_KEY`
- Fallback to `process.env.SUPABASE_URL` + service key from environment
- Create client: `createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })`

---

### 3. Ingestion Runner (`src/lib/ingestion/runner.ts`)

**Main Function: `runIngestion(sourceKey: string, options?: { force?: boolean, fetchedAt?: Date })`**

**Flow:**

1. **Load source configuration:**

   - Query `content_sources` WHERE `source_key = sourceKey`
   - Check `is_active = true` (abort if disabled)
   - Extract `source_id`, `config`, `rate_limit_per_hour`

2. **Check cadence (unless `options.force = true`):**

   - Read `content_config` for `ingestion.refresh_hours` if present (safe default: 3h in code)
   - Optionally check `content_sources.config.default_refresh_hours` if present (per-source override)
   - Query `content_runs` for last successful run (`status = 'completed'`) for this `source_id`
   - If last run exists and `(now() - lastRun.completed_at) < refresh_hours`: skip with message
   - If no last run or expired: proceed

3. **Create run record:**

   - Insert into `content_runs` with `status = 'running'`, `started_at = now()`
   - Store `run_id` for later updates

4. **Fetch and parse:**

   - Instantiate adapter: `const adapter = getAdapter(sourceKey)`
   - Call `adapter.fetch()` (may throw on network/API errors)
   - After successful fetch, for budget-gated sources (e.g., API-SPORTS), call `checkAndIncrementBudget(sourceId)`; if budget exceeded: update run `status = 'skipped'`, `error_message = 'Budget exceeded'`, return
   - Call `adapter.parse(rawData)` to get `NormalizedItem[]`
   - Track `itemsFetched = parsedItems.length`

6. **Process each item:**

   - For each `NormalizedItem`:
     - Generate `content_hash` using `generateContentHash({ title, sourceKey, publishedAt, fetchedAt })`
     - Check if hash exists: `checkContentHashExists(content_hash)`
     - **If hash exists:** increment `itemsSkipped`, continue (do NOT re-summarize)
     - **If hash does NOT exist:**
       - Insert into `content_items` with all fields
       - If `categories` provided: insert into `content_item_categories` (many-to-many)
       - Increment `itemsCreated`
     - **If `externalId` exists:**
       - Check if row exists with `(source_id, external_id)`
       - If exists: update mutable fields only (`excerpt`, `image_url`, `raw_data`, `updated_at`)
       - Do NOT update `content_hash` or `published_at` (immutable)
       - Increment `itemsUpdated`

7. **Update run record:**

   - Update `content_runs` with:
     - `status = 'completed'` or `'failed'`
     - `items_fetched`, `items_created`, `items_skipped`, `items_updated`
     - `completed_at = now()`
     - `error_message` (if failed)

8. **Return result:**

   - Return `IngestionResult` with all counts and status

**Error Handling:**

- Wrap adapter.fetch/parse in try-catch
- On error: update run with `status = 'failed'`, `error_message = error.message`
- Log errors to console with context
- Never throw unhandled errors (always return result object)

---

### 4. API Budget Helper (`src/lib/ingestion/budget.ts`)

**Purpose:** Enforce daily API call budgets for quota-gated sources (e.g., API-SPORTS).

**Functions:**

- `checkAndIncrementBudget(sourceId: string, maxCallsPerDay: number): Promise<boolean>`
  - Returns `true` if budget available, `false` if exceeded
  - Atomically increments usage count
  - Creates budget record if doesn't exist for current period

**Logic:**

1. Get current date (UTC, start of day)
2. Query `api_usage_budget` for `(source_id, period_start = today, period_end = today + 1 day)`
3. If no record exists: create with `usage_count = 0`, `budget_limit = maxCallsPerDay`
4. Check `usage_count < budget_limit`
5. If available: atomically increment `usage_count` (use PostgreSQL `UPDATE ... SET usage_count = usage_count + 1`)
6. Return `true` if increment succeeded, `false` if budget exceeded

**Usage:**

- Called by runner after a successful `adapter.fetch()` and before parse
- If returns `false`: abort run, mark as skipped

---

### 5. Base Adapter (`src/lib/ingestion/adapters/base.ts`)

**Abstract class or interface implementation:**

```typescript
export abstract class BaseAdapter implements ContentAdapter {
  abstract sourceKey: string;
  abstract fetch(): Promise<unknown>;
  abstract parse(raw: unknown): Promise<NormalizedItem[]>;
  
  // Helper methods (optional):
  protected normalizeUrl(url: string): string { ... }
  protected parseDate(dateStr: string): string | null { ... }
}
```

---

### 6. Adapter Implementations

Each adapter in `src/lib/ingestion/adapters/` (tunables pulled from shared constants/config; no hardcoded query params). NewsX is deferred (not implemented in Phase 3).

**mediastack.ts:**

- Source: `http://api.mediastack.com/v1/news`
- API Key: `process.env.MEDIASTACK_KEY`
- Fetch: GET with `access_key`, `keywords`, `languages=en`, `limit=100`, `sort=published_desc`
- Parse: Map `data[]` to `NormalizedItem[]`
  - `title` → `title`
  - `url` → `sourceUrl`
  - `image` → `imageUrl`
  - `description` → `excerpt`
  - `published_at` → `publishedAt`
  - `url` → `externalId` (or null)
  - `category` → `categories` (array)

**tmdb.ts:**

- Source: `https://api.themoviedb.org/3/trending/{media_type}/day`
- API Key: `process.env.TMDB_API_KEY`
- Fetch: Get trending movies + TV shows (two calls), use tunables/constants for limits
- Parse: Map to `NormalizedItem[]`
  - `title` or `name` → `title`
  - `https://www.themoviedb.org/...` → `sourceUrl`
  - `poster_path` → `imageUrl` (prepend `https://image.tmdb.org/t/p/w500`)
  - `overview` → `excerpt`
  - `release_date` or `first_air_date` → `publishedAt`
  - `id` → `externalId`
  - `contentType`: 'movie' or 'tv'
  - Cap emitted items to `ingestion.max_items_per_run` (safe default 100)

**rapidapi-sports.ts:**

- Source: RapidAPI sports news endpoint
- API Key: `process.env.RAPIDAPI_KEY`
- Headers: `X-RapidAPI-Key`, `X-RapidAPI-Host`
- Fetch/Parse: Map sports news articles

**ticketmaster.ts:**

- Source: `https://app.ticketmaster.com/discovery/v2/events.json`
- API Key: `process.env.TICKETMASTER_API_KEY`
- Fetch: Get upcoming events (limit, date range) using tunables/constants (no hardcoded params)
- Parse: Map events to `NormalizedItem[]`
  - `name` → `title`
  - `url` → `sourceUrl`
  - `images[0].url `→ `imageUrl`
  - `info` or `description` → `excerpt`
  - `dates.start.dateTime` → `publishedAt`
  - `id` → `externalId`
  - `contentType`: 'event'
  - `classifications[0].segment.name `→ `categories`
  - Cap emitted items to `ingestion.max_items_per_run` (safe default 100)

**api-sports.ts (stub):**

- Placeholder adapter for API-SPORTS
- Implements interface but returns empty array or throws "Not implemented"
- Budget-gated (uses `checkAndIncrementBudget`)

---

### 7. Adapter Registry (`src/lib/ingestion/adapters/index.ts`)

**Function: `getAdapter(sourceKey: string): ContentAdapter`**

- Maps `sourceKey` to adapter instance
- Returns adapter or throws if not found

---

### 8. Manual Trigger Script (`scripts/ingestion/run-ingestion.ts`)

**Purpose:** CLI script to manually trigger ingestion for testing.

**Usage:**

```bash
tsx scripts/ingestion/run-ingestion.ts mediastack
tsx scripts/ingestion/run-ingestion.ts tmdb
```

**Implementation:**

- Parse command-line args: `sourceKey`, `--force` flag
- Load environment variables (`.env` file)
- Call `runIngestion(sourceKey, { force })`
- Print results to console
- Exit with code 0 (success) or 1 (failure)

---

## Database Operations Details

### Content Hash Deduplication

- Use `generateContentHash()` from `src/lib/contentHash.ts`
- Query: `SELECT id FROM content_items WHERE content_hash = $1 LIMIT 1`
- If exists: skip insert (deduplication works)

### External ID Updates

- Query: `SELECT id FROM content_items WHERE source_id = $1 AND external_id = $2 LIMIT 1`
- If exists: `UPDATE content_items SET excerpt = $1, image_url = $2, raw_data = $3, updated_at = now() WHERE id = $4`
- Do NOT update: `content_hash`, `published_at`, `title`, `url` (immutable fields)

### Category Mapping

- Query: `SELECT id, name FROM content_categories WHERE name = ANY($1)`
- Map category names to IDs
- Insert into `content_item_categories`: `(content_item_id, category_id)`

---

## Configuration Defaults (content_config)

Do NOT require new keys to exist; use safe defaults in code and override if present:

- `ingestion.refresh_hours`: default 3 hours (if key exists, use its value)
- `ingestion.max_items_per_run`: default 100 (if key exists, use its value)
- `api_sports_daily_budget`: default 1000 (if key exists, use its value)

---

## Error Handling Strategy

1. **Adapter fetch errors:** Catch, log, mark run as failed, return result
2. **Parse errors:** Catch, log, skip malformed items, continue processing
3. **DB errors:** Catch, log, mark run as failed, return result
4. **Budget exceeded:** Mark run as skipped (not failed), return early
5. **Cadence check:** Return early with message (not an error)

**Never:**

- Throw unhandled errors
- Crash the process
- Leave runs in 'running' state indefinitely

---

## Manual Testing

### Run Ingestion Locally

1. **Set environment variables:**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export MEDIASTACK_KEY="your-mediastack-key"
   export TMDB_API_KEY="your-tmdb-key"
   # ... other API keys
   ```

2. **Run script:**
   ```bash
   tsx scripts/ingestion/run-ingestion.ts mediastack
   ```

3. **Check results:**

   - Console output shows counts
   - Query database to verify inserts

### Validation Queries

**Check content_items:**

```sql
SELECT COUNT(*), source_id 
FROM content_items 
GROUP BY source_id;
```

**Check deduplication:**

```sql
SELECT content_hash, COUNT(*) 
FROM content_items 
GROUP BY content_hash 
HAVING COUNT(*) > 1;
-- Should return 0 rows (unique constraint enforced)
```

**Check content_runs:**

```sql
SELECT source_id, status, items_created, items_skipped, started_at, completed_at
FROM content_runs
ORDER BY started_at DESC
LIMIT 10;
```

**Check categories:**

```sql
SELECT ci.title, cc.name as category
FROM content_items ci
JOIN content_item_categories cic ON ci.id = cic.content_item_id
JOIN content_categories cc ON cic.category_id = cc.id
LIMIT 10;
```

---

## Phase Boundaries (Deferred)

**Phase 4 (Cron Scheduling):**

- Automatic scheduling of `runIngestion()` calls
- Not implemented in Phase 3

**Phase 5 (AI Summarization):**

- Summarization of content_items into gists
- Not implemented in Phase 3 (items stored raw)

**Phase 6 (Feed/User Delivery):**

- User-facing endpoints to fetch unseen content
- Not implemented in Phase 3

---

## Implementation Checklist

- [ ] Create `src/lib/ingestion/types.ts` with interfaces
- [ ] Create `src/lib/ingestion/db.ts` with Supabase client and DB operations
- [ ] Create `src/lib/ingestion/budget.ts` with API budget helper
- [ ] Create `src/lib/ingestion/runner.ts` with main `runIngestion()` function
- [ ] Create `src/lib/ingestion/adapters/base.ts` with base adapter
- [ ] Create `src/lib/ingestion/adapters/mediastack.ts`
- [ ] Create `src/lib/ingestion/adapters/tmdb.ts`
- [ ] Create `src/lib/ingestion/adapters/rapidapi-sports.ts`
- [ ] Create `src/lib/ingestion/adapters/ticketmaster.ts`
- [ ] Create `src/lib/ingestion/adapters/api-sports.ts` (stub)
- [ ] Create `src/lib/ingestion/adapters/index.ts` with adapter registry
- [ ] Create `scripts/ingestion/run-ingestion.ts` manual trigger script
- [ ] Test manual ingestion for each adapter
- [ ] Verify deduplication works (run same source twice)
- [ ] Verify external ID updates work
- [ ] Verify budget enforcement works (for API-SPORTS)
- [ ] Verify cadence check works (skip if too soon)

---

## Dependencies

**Existing (no install needed):**

- `@supabase/supabase-js` (already in dependencies)
- `src/lib/contentHash.ts` (Phase 2 utilities)

**Environment Variables Required:**

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `VITE_SUPABASE_SERVICE_ROLE_KEY`
- `MEDIASTACK_KEY`
- `TMDB_API_KEY`
- `RAPIDAPI_KEY` (for RapidAPI sports)
- `TICKETMASTER_API_KEY`
- `API_SPORTS_KEY` (for API-SPORTS, if implemented)

---

## Notes

- All adapters are stateless (no DB code in adapters)
- Runner handles all database operations
- Content hash is generated using Phase 2 utilities
- Deduplication is enforced at database level (UNIQUE constraint)
- External ID updates only modify mutable fields
- Budget enforcement is atomic (PostgreSQL transactions)
- Cadence check prevents too-frequent runs
- Manual triggers allow testing without cron
- Adapter query params and limits are configurable via constants/config (no hardcoded tunables)