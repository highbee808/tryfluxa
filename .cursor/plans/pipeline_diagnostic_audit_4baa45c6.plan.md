---
name: Pipeline Diagnostic Audit
overview: Create read-only diagnostic instrumentation to trace content pipeline execution, source resolution, and feed eligibility - revealing why Admin shows one reality while feeds display another.
todos:
  - id: create-diagnostic-script
    content: Create scripts/diagnose-pipeline.ts with all diagnostic sections
    status: pending
  - id: run-diagnostic
    content: Execute script and capture Content Flow State Report
    status: pending
---

# Content Pipeline Diagnostic Audit

## Critical Findings (Pre-Audit)

Before implementing diagnostics, initial investigation reveals the root cause:**Key Discovery:**

- The Vercel cron runs `/api/cron/generate` (hard-coded legacy pipeline)
- NOT `/api/cron/run-ingestion` (admin-controlled Phase 3 pipeline)
- 699 items exist in `content_items` from `ai-generated` source
- The `ai-generated` source is **DISABLED** in Admin (`is_active=false`)
- Feed API filters by `source_id IN (active sources)` - excluding all 699 items

## Scope of Diagnostic Instrumentation

Create a single diagnostic script that prints a structured "Content Flow State Report" without modifying any existing behavior.---

## 1. Diagnostic Script Location

Create: [scripts/diagnose-pipeline.ts](scripts/diagnose-pipeline.ts)A standalone TypeScript script that queries the database and code to produce a comprehensive report. Run via `npx tsx scripts/diagnose-pipeline.ts`.---

## 2. Sections to Implement

### Section A: Active Pipelines Detection

Analyze which pipeline endpoints exist and which is scheduled:

- Read `vercel.json` to identify active cron paths
- List all cron entry points in `/api/cron/`
- Identify which pipeline version each uses (hard-coded vs DB-driven)

Expected output:

```javascript
=== ACTIVE PIPELINES DETECTED ===
Scheduled cron: /api/cron/generate
    - Pipeline type: LEGACY (hard-coded topics)
    - Sources: BYPASSES content_sources table
    - Target table: content_items
    - Source ID: c28d4e44-862b-4aa8-80b6-a228be1faa39 (ai-generated)

Available but NOT scheduled:
    - /api/cron/run-ingestion (Phase 3 - DB-driven)
```



### Section B: Source Registry vs Runtime Sources

Query and compare:

- All sources in `content_sources` table (Admin registry)
- All adapters registered in code ([api/_internal/ingestion/adapters/index.ts](api/_internal/ingestion/adapters/index.ts))
- Hard-coded source ID in legacy pipeline

Expected output:

```javascript
=== SOURCE REGISTRY vs RUNTIME ===
Admin Registry (content_sources):
    - google-news: ACTIVE, has adapter
    - ai-generated: DISABLED, no adapter
    - tmdb: DISABLED, has adapter
  ... (17 total)

Code Adapters (adapters/index.ts):
    - google-news, mediastack-rapidapi, newsapi-rapidapi, rapidapi-sports, tmdb, ticketmaster, api-sports

Mismatches:
    - ai-generated: In registry, NO adapter
    - biz-news-api: In registry, NO adapter
    - webit-news-search: In registry, NO adapter
  ... 

Legacy Pipeline Source:
    - Hard-coded source_id: c28d4e44-862b-4aa8-80b6-a228be1faa39
    - Maps to: ai-generated (DISABLED)
    - WARNING: Legacy pipeline inserts to DISABLED source
```



### Section C: Content Items Distribution

Query content_items and group by source:

```javascript
=== CONTENT ITEMS DISTRIBUTION ===
source_key        | is_active | items  | newest_item
------------------|-----------|--------|-------------------
ai-generated      | false     | 699    | 2025-12-19 21:03
google-news       | true      | 10     | 2025-12-19 05:12
tmdb              | false     | 40     | 2025-12-16 17:50

Total items: 749
Eligible for feed (active sources): 10 (1.3%)
Excluded (inactive sources): 739 (98.7%)
```



### Section D: Feed Eligibility Audit

Trace the feed query logic from [api/feed/content-items.ts](api/feed/content-items.ts):

```javascript
=== FEED ELIGIBILITY CHECK ===
Query conditions:
    - source_id IN (active sources)
    - created_at >= cutoff (7 days)
    - published_at ORDER DESC

Active sources for feed:
    - google-news (id: xxx)

Items created in last 24h: 25
    - From ai-generated: 23 (EXCLUDED - source disabled)
    - From google-news: 2 (ELIGIBLE)

Feed query would return: 2 items
Reason for low count: 92% of recent content from disabled source
```



### Section E: Insert Path Trace

Document where each pipeline inserts content:

```javascript
=== INSERT PATH AUDIT ===
/api/cron/generate (ACTIVE):
    - Target table: content_items
    - source_id: c28d4e44-862b-4aa8-80b6-a228be1faa39 (ai-generated)
    - Deduplication: content_hash check
    - Also inserts to gists table: NO (removed in recent version)

/api/cron/run-ingestion (NOT SCHEDULED):
    - Target table: content_items
    - source_id: From content_sources table (dynamic)
    - Deduplication: content_hash check
    - Creates content_runs for observability

/src/jobs/generateContent.ts (Next.js route):
    - Target table: gists (NOT content_items)
    - WARNING: Separate pipeline, inserts to different table
```



### Section F: Gists Table Status

Also check the gists table for legacy content:

```javascript
=== GISTS TABLE STATUS ===
Total gists: X
Recent (24h): Y
Status: published

Note: Gists are fetched as fallback in Feed.tsx
via fetchRecentGists() when content_items is empty
```

---

## 3. Implementation Details

### File to Create

**[scripts/diagnose-pipeline.ts](scripts/diagnose-pipeline.ts)**

```typescript
// Diagnostic script - READ ONLY
// Run: npx tsx scripts/diagnose-pipeline.ts
// Outputs structured report to console
```

Key functions:

- `detectActivePipelines()` - Parse vercel.json and list endpoints
- `compareSourceRegistryVsCode()` - Query DB, compare to adapter registry
- `getContentDistribution()` - Count items by source and active status
- `simulateFeedQuery()` - Run same query as feed API, log exclusions
- `printReport()` - Output formatted Content Flow State Report

### Database Queries (Read-Only)

```sql
-- Source registry with item counts
SELECT cs.source_key, cs.is_active, COUNT(ci.id), MAX(ci.created_at)
FROM content_sources cs
LEFT JOIN content_items ci ON ci.source_id = cs.id
GROUP BY cs.source_key, cs.is_active;

-- Items in last 24h by source
SELECT cs.source_key, cs.is_active, COUNT(*)
FROM content_items ci
JOIN content_sources cs ON cs.id = ci.source_id
WHERE ci.created_at > NOW() - INTERVAL '24 hours'
GROUP BY cs.source_key, cs.is_active;

-- Gists count
SELECT status, COUNT(*) FROM gists GROUP BY status;
```

---

## 4. Constraints Enforcement

The diagnostic script will:

- Use service role key for read-only queries
- NOT modify any database rows
- NOT enable/disable any sources
- NOT trigger any pipelines
- NOT delete or migrate data
- Output to console ONLY

---

## 5. Expected Report Structure

```javascript
╔════════════════════════════════════════════════════════════╗
║           CONTENT FLOW STATE REPORT                        ║
║           Generated: 2025-12-19T21:30:00Z                  ║
╚════════════════════════════════════════════════════════════╝

=== SECTION A: ACTIVE PIPELINES ===
[output as described above]

=== SECTION B: SOURCE REGISTRY vs RUNTIME ===
[output as described above]

=== SECTION C: CONTENT DISTRIBUTION ===
[output as described above]

=== SECTION D: FEED ELIGIBILITY ===
[output as described above]

=== SECTION E: INSERT PATHS ===
[output as described above]

=== SECTION F: GISTS STATUS ===
[output as described above]

╔════════════════════════════════════════════════════════════╗
║                    DIAGNOSIS SUMMARY                        ║
╚════════════════════════════════════════════════════════════╝

ROOT CAUSE IDENTIFIED:
1. Scheduled cron (/api/cron/generate) uses LEGACY pipeline
2. Legacy pipeline inserts to ai-generated source (DISABLED)
3. Feed API excludes disabled sources
4. Result: 98.7% of content invisible in feeds

RECOMMENDED ACTIONS (for future phase):
- Enable ai-generated source in Admin, OR
- Schedule /api/cron/run-ingestion instead, OR
- Update legacy pipeline to use active source
```

---

## Success Criteria

After running the diagnostic, we can answer:

- How many pipelines are running: 1 (legacy)
- Which one cron uses: /api/cron/generate
- Why Admin vs feeds diverge: Legacy pipeline bypasses source registry