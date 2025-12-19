---
name: Content Pipeline Observability and Control
overview: Add read-only observability endpoints and lightweight control mechanisms for the content ingestion pipeline. Admins can inspect run status, skipped reasons, source health, and trigger manual actions. All endpoints are protected by x-admin-secret and are backward-compatible.
todos:
  - id: migration
    content: Create migration to add skipped_reason column and content_source_health table
    status: completed
  - id: db-helpers
    content: Add updateSourceHealth helper to api/_internal/ingestion/db.ts
    status: completed
  - id: runner-instrumentation
    content: Update src/lib/ingestion/runner.ts to track skip reasons and upsert source health
    status: completed
  - id: observability-runs
    content: Create GET /api/admin-observability-runs endpoint
    status: completed
  - id: observability-run
    content: Create GET /api/admin-observability-run endpoint (query param id)
    status: completed
  - id: observability-sources
    content: Create GET /api/admin-observability-sources endpoint
    status: completed
  - id: observability-overview
    content: Create GET /api/admin-observability-overview endpoint
    status: completed
  - id: action-trigger-cron
    content: Create POST /api/admin-action-trigger-cron endpoint
    status: completed
  - id: action-force-refresh
    content: Create POST /api/admin-action-force-refresh endpoint
    status: completed
  - id: action-clear-cache
    content: Create POST /api/admin-action-clear-cache endpoint
    status: completed
  - id: docs
    content: Add curl examples and endpoint documentation
    status: completed
---

# Phase 9: Content Pipeline Observability and Control

## Overview

Add operational visibility and safe control mechanisms for the content ingestion pipeline. This phase focuses on read-only observability + lightweight control via API endpoints, without building a full admin dashboard.

## Hard Constraints (from Phase 8 learnings)

- **ALL API routes must be top-level `/api/*.ts` files** - nested folders caused production 404s
- No dynamic route segments like `[id].ts` - use query parameters instead
- Existing ingestion behavior unchanged unless admin explicitly intervenes
- Migrations must be additive and idempotent (`IF NOT EXISTS`)
- All endpoints require `x-admin-secret` header

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin API Layer (Flat Routes)                 │
│  ┌──────────────────────────┐  ┌────────────────────────────┐  │
│  │ Observability (GET)      │  │ Manual Actions (POST)      │  │
│  │ - admin-observability-   │  │ - admin-action-trigger-    │  │
│  │   runs                   │  │   cron                     │  │
│  │ - admin-observability-   │  │ - admin-action-force-      │  │
│  │   run                    │  │   refresh                  │  │
│  │ - admin-observability-   │  │ - admin-action-clear-      │  │
│  │   sources                │  │   cache                    │  │
│  │ - admin-observability-   │  │                            │  │
│  │   overview               │  │                            │  │
│  └──────────────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                Database Schema Enhancements                      │
│  - content_runs: add skipped_reason column                      │
│  - content_source_health: new table for per-source metrics      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              Cron Instrumentation (runner.ts)                    │
│  - Track skipped_reason in content_runs                         │
│  - Upsert source health after each run                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Database Migration

**File**: `supabase/migrations/20250120000000_add_observability_fields.sql`

```sql
-- ============================================
-- PHASE 9: Content Pipeline Observability
-- Add skipped_reason and content_source_health
-- ============================================

-- STEP 1: Add skipped_reason to content_runs
ALTER TABLE public.content_runs
ADD COLUMN IF NOT EXISTS skipped_reason TEXT;

-- Index for querying skipped runs
CREATE INDEX IF NOT EXISTS idx_content_runs_skipped_reason 
  ON public.content_runs(skipped_reason) 
  WHERE skipped_reason IS NOT NULL;

COMMENT ON COLUMN public.content_runs.skipped_reason IS 
  'Reason for skipping: cadence, disabled, budget_exceeded, no_data, error';

-- STEP 2: Create content_source_health table
CREATE TABLE IF NOT EXISTS public.content_source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_reason TEXT,
  items_generated_last_run INTEGER DEFAULT 0,
  last_run_id UUID REFERENCES public.content_runs(id) ON DELETE SET NULL,
  consecutive_failures INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id)
);

-- Indexes for health queries
CREATE INDEX IF NOT EXISTS idx_content_source_health_source_id 
  ON public.content_source_health(source_id);
CREATE INDEX IF NOT EXISTS idx_content_source_health_last_success 
  ON public.content_source_health(last_success_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_source_health_last_error 
  ON public.content_source_health(last_error_at DESC);

-- RLS policies
ALTER TABLE public.content_source_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage content_source_health"
  ON public.content_source_health FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Migration Complete
-- ============================================
```

---

## 2. API Endpoints (Flattened Routes)

All endpoints are top-level files in `/api/` to avoid Vercel routing issues.

### File Structure

```
api/
  admin-observability-runs.ts      # GET  - List recent runs
  admin-observability-run.ts       # GET  - Single run by ?id=<uuid>
  admin-observability-sources.ts   # GET  - Source health overview
  admin-observability-overview.ts  # GET  - Pipeline summary
  admin-action-trigger-cron.ts     # POST - Manual cron trigger
  admin-action-force-refresh.ts    # POST - Force refresh source
  admin-action-clear-cache.ts      # POST - Clear cache (safe no-op)
  _internal/
    admin-auth.ts                  # (existing) Auth helpers
    ingestion/
      db.ts                        # Add updateSourceHealth helper
      runner.ts                    # Update for skip reasons + health
```

---

### 2.1 GET `/api/admin-observability-runs`

**File**: `api/admin-observability-runs.ts`

List recent ingestion runs with optional filtering and pagination.

**Query Parameters**:

- `source_key` (optional): Filter by source
- `status` (optional): Filter by status (completed, failed, running, skipped)
- `limit` (optional, default 50, max 100)
- `offset` (optional, default 0)

**Response**:

```typescript
{
  runs: Array<{
    id: string;
    source_id: string;
    source_key: string;
    source_name: string;
    status: string;
    items_fetched: number;
    items_created: number;
    items_skipped: number;
    items_updated: number;
    skipped_reason: string | null;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
  }>;
  total: number;
  limit: number;
  offset: number;
}
```

---

### 2.2 GET `/api/admin-observability-run`

**File**: `api/admin-observability-run.ts`

Get detailed information about a specific run.

**Query Parameters**:

- `id` (required): Run UUID

**Response**:

```typescript
{
  run: {
    id: string;
    source_id: string;
    source_key: string;
    source_name: string;
    status: string;
    items_fetched: number;
    items_created: number;
    items_skipped: number;
    items_updated: number;
    skipped_reason: string | null;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
    metadata: Record<string, any>;
  };
}
```

---

### 2.3 GET `/api/admin-observability-sources`

**File**: `api/admin-observability-sources.ts`

Get health status for all content sources.

**Response**:

```typescript
{
  sources: Array<{
    id: string;
    source_key: string;
    name: string;
    is_active: boolean;
    config: Record<string, any>;
    health: {
      last_success_at: string | null;
      last_error_at: string | null;
      last_error_reason: string | null;
      items_generated_last_run: number;
      consecutive_failures: number;
      last_run_id: string | null;
    } | null;
  }>;
  total: number;
}
```

---

### 2.4 GET `/api/admin-observability-overview`

**File**: `api/admin-observability-overview.ts`

Get high-level pipeline overview (dashboard summary).

**Response**:

```typescript
{
  overview: {
    last_cron_window: {
      started_at: string | null;
      sources_processed: number;
      sources_succeeded: number;
      sources_failed: number;
      sources_skipped: number;
      total_items_created: number;
    };
    source_counts: {
      total: number;
      active: number;
      inactive: number;
      healthy: number;      // last run succeeded
      unhealthy: number;    // last run failed
    };
    recent_runs: Array<{
      source_key: string;
      status: string;
      completed_at: string;
      items_created: number;
      skipped_reason: string | null;
    }>;
  };
}
```

---

### 2.5 POST `/api/admin-action-trigger-cron`

**File**: `api/admin-action-trigger-cron.ts`

Manually trigger the ingestion pipeline.

**Request Body** (optional):

```typescript
{
  source_key?: string;  // Run specific source only
  force?: boolean;      // Ignore freshness window (default false)
}
```

**Rate Limiting**: Log attempts; lightweight check (no over-engineering for serverless).

**Response**:

```typescript
{
  success: boolean;
  message: string;
  results?: Array<{
    source_key: string;
    run_id: string;
    items_created: number;
    status: string;
    error: string | null;
  }>;
  execution_time_ms: number;
}
```

---

### 2.6 POST `/api/admin-action-force-refresh`

**File**: `api/admin-action-force-refresh.ts`

Force refresh a specific source, ignoring freshness window.

**Request Body**:

```typescript
{
  source_key: string;  // Required
}
```

**Response**:

```typescript
{
  success: boolean;
  run_id: string;
  items_fetched: number;
  items_created: number;
  items_skipped: number;
  message: string;
}
```

---

### 2.7 POST `/api/admin-action-clear-cache`

**File**: `api/admin-action-clear-cache.ts`

Clear feed cache (safe operation). Currently a placeholder/no-op since no persistent cache exists.

**Request Body** (optional):

```typescript
{
  source_key?: string;  // Optional: scope to specific source
}
```

**Response**:

```typescript
{
  success: boolean;
  message: string;
  cleared: number;  // 0 if no cache exists
}
```

---

## 3. Runner Instrumentation

**File**: `src/lib/ingestion/runner.ts`

### 3.1 Track Skip Reasons

Update `runIngestion()` to set `skipped_reason` when runs are skipped:

| Scenario | skipped_reason value |

|----------|---------------------|

| Source is disabled | `'disabled'` |

| Cadence window not met | `'cadence'` |

| Budget exceeded | `'budget_exceeded'` |

| No data returned | `'no_data'` |

| Adapter error | `null` (use error_message) |

**Key changes**:

1. When source is disabled (line ~81-90): Create a run record with `status: 'skipped'`, `skipped_reason: 'disabled'`
2. When cadence check fails (line ~120-137): Create run record with `status: 'skipped'`, `skipped_reason: 'cadence'`
3. When budget exceeded (line ~164-181): Set `skipped_reason: 'budget_exceeded'`

### 3.2 Update Source Health

Add helper function and call after each run:

```typescript
// In api/_internal/ingestion/db.ts
export async function upsertSourceHealth(
  sourceId: string,
  runId: string,
  success: boolean,
  itemsCreated: number,
  errorReason?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();
  
  const healthData: Record<string, any> = {
    source_id: sourceId,
    last_run_id: runId,
    items_generated_last_run: itemsCreated,
    updated_at: now,
  };
  
  if (success) {
    healthData.last_success_at = now;
    healthData.consecutive_failures = 0;
  } else {
    healthData.last_error_at = now;
    healthData.last_error_reason = errorReason || 'Unknown error';
    // Increment consecutive_failures in SQL
  }
  
  await supabase
    .from('content_source_health')
    .upsert(healthData, { 
      onConflict: 'source_id',
      ignoreDuplicates: false 
    });
}
```

Call this at the end of `runIngestion()` before returning.

---

## 4. Implementation Details

### Authentication

All endpoints use existing helpers from `api/_internal/admin-auth.ts`:

- `requireAdminAuth(req, res)` - Returns false and sends 401 if unauthorized
- `getAdminSupabaseClient()` - Service role client for queries
- `sendSuccess()` / `sendError()` - Consistent response formatting
- `logAdminAction()` - Structured logging

### Rate Limiting (Lightweight)

For `admin-action-trigger-cron`:

- Log all trigger attempts with timestamp and IP
- Optional: Check last trigger timestamp in DB or memory
- If too frequent (< 2 min since last trigger), return 429
- Don't over-engineer; serverless cold starts make in-memory state unreliable

### Error Handling

- Use try/catch with structured error responses
- Never expose internal stack traces
- Log errors with `console.error('[Endpoint Name]', error)`

---

## 5. Manual Test Steps

### Test Migration

```bash
# Apply migration
npx supabase db push

# Verify columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'content_runs' AND column_name = 'skipped_reason';

SELECT * FROM content_source_health LIMIT 1;
```

### Test Observability Endpoints

```bash
# List runs
curl -X GET "https://your-app.vercel.app/api/admin-observability-runs?limit=10" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"

# Get single run
curl -X GET "https://your-app.vercel.app/api/admin-observability-run?id=<run-uuid>" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"

# Source health
curl -X GET "https://your-app.vercel.app/api/admin-observability-sources" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"

# Pipeline overview
curl -X GET "https://your-app.vercel.app/api/admin-observability-overview" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET"
```

### Test Action Endpoints

```bash
# Trigger cron (all sources)
curl -X POST "https://your-app.vercel.app/api/admin-action-trigger-cron" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'

# Trigger specific source with force
curl -X POST "https://your-app.vercel.app/api/admin-action-trigger-cron" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source_key": "newsapi-rapidapi", "force": true}'

# Force refresh
curl -X POST "https://your-app.vercel.app/api/admin-action-force-refresh" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"source_key": "newsapi-rapidapi"}'

# Clear cache
curl -X POST "https://your-app.vercel.app/api/admin-action-clear-cache" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Verify Runner Instrumentation

1. Trigger a run via `admin-action-trigger-cron`
2. Check `content_runs` for `skipped_reason` values
3. Check `content_source_health` for updated records
```sql
-- Check recent runs with skip reasons
SELECT source_id, status, skipped_reason, error_message, started_at
FROM content_runs
ORDER BY started_at DESC
LIMIT 10;

-- Check source health
SELECT cs.source_key, csh.*
FROM content_source_health csh
JOIN content_sources cs ON cs.id = csh.source_id
ORDER BY csh.updated_at DESC;
```


---

## 6. Backward Compatibility

- All schema changes use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`
- `skipped_reason` column is nullable - existing runs unaffected
- `content_source_health` table is new - sources work without health records
- Existing cron job (`/api/cron/run-ingestion`) unchanged
- No changes to feed rendering or content item display

---

## 7. Security Checklist

- [x] All endpoints require `x-admin-secret` header
- [x] Use service role client (not anon key) for DB queries
- [x] No secrets logged
- [x] Rate limiting on action endpoints (lightweight)
- [x] Read-only endpoints cannot modify data
- [x] Action endpoints logged via `logAdminAction()`

---

## 8. Files to Create/Modify Summary

### New Files

- `supabase/migrations/20250120000000_add_observability_fields.sql`
- `api/admin-observability-runs.ts`
- `api/admin-observability-run.ts`
- `api/admin-observability-sources.ts`
- `api/admin-observability-overview.ts`
- `api/admin-action-trigger-cron.ts`
- `api/admin-action-force-refresh.ts`
- `api/admin-action-clear-cache.ts`

### Modified Files

- `api/_internal/ingestion/db.ts` - Add `upsertSourceHealth()` helper
- `src/lib/ingestion/runner.ts` - Track skip reasons, call health upsert