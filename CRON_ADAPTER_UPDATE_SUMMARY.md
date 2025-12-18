# Cron Adapter Update Summary

## Overview
Updated the content ingestion cron to use only active, valid APIs by removing expired adapters (Guardian, old Mediastack, old NewsAPI) and promoting RapidAPI-based adapters to first position.

**Date**: January 19, 2025

---

## Changes Made

### 1. Created New RapidAPI Adapters

#### File: `api/_internal/ingestion/adapters/mediastack-rapidapi.ts`
- **Purpose**: RapidAPI version of Mediastack adapter
- **Key Features**:
  - Uses `X-RapidAPI-Key` and `X-RapidAPI-Host` headers
  - Reads from `RAPIDAPI_KEY` environment variable
  - Logs: `"Using adapter: mediastack (rapidapi)"`
  - Endpoint: `https://mediastack.p.rapidapi.com/news`
  - Host: `mediastack.p.rapidapi.com`

#### File: `api/_internal/ingestion/adapters/newsapi-rapidapi.ts`
- **Purpose**: RapidAPI version of NewsAPI adapter
- **Key Features**:
  - Uses `X-RapidAPI-Key` and `X-RapidAPI-Host` headers
  - Reads from `RAPIDAPI_KEY` environment variable
  - Logs: `"Using adapter: newsapi (rapidapi)"`
  - Endpoint: `https://newsapi-rapidapi.p.rapidapi.com/everything`
  - Host: `newsapi-rapidapi.p.rapidapi.com`

### 2. Updated Adapter Index

#### File: `api/_internal/ingestion/adapters/index.ts`

**Changes**:
- **Prioritized RapidAPI adapters** - They appear first in the switch statement
- **Removed expired adapters** from execution:
  - `guardian` → Throws error: "Adapter 'guardian' is expired and no longer supported"
  - `mediastack` → Throws error: "Adapter 'mediastack' is expired. Use 'mediastack-rapidapi' instead"
  - `newsapi` → Throws error: "Adapter 'newsapi' is expired. Use 'newsapi-rapidapi' instead"

**New Order**:
1. `mediastack-rapidapi` (RapidAPI - first priority)
2. `newsapi-rapidapi` (RapidAPI - first priority)
3. `rapidapi-sports` (RapidAPI - first priority)
4. `tmdb` (other active)
5. `ticketmaster` (other active)
6. `api-sports` (other active)

### 3. Updated Cron Orchestration

#### File: `api/cron/run-ingestion.ts`

**Changes**:
- **Filtered out expired adapters** in `getAllEnabledSources()`:
  ```typescript
  const expiredAdapters = ["guardian", "mediastack", "newsapi"];
  const validSources = (data || []).filter(
    (source) => !expiredAdapters.includes(source.source_key)
  );
  ```

- **Prioritized RapidAPI sources**:
  ```typescript
  // Sort: RapidAPI adapters first, then others
  const rapidApiSources = validSources.filter((s) => 
    s.source_key.includes("rapidapi") || 
    s.source_key === "mediastack-rapidapi" || 
    s.source_key === "newsapi-rapidapi"
  );
  const otherSources = validSources.filter((s) => 
    !s.source_key.includes("rapidapi") && 
    s.source_key !== "mediastack-rapidapi" && 
    s.source_key !== "newsapi-rapidapi"
  );
  return [...rapidApiSources, ...otherSources];
  ```

- **Added logging** for each source being processed:
  ```typescript
  console.log(`[Cron] Processing source: ${source.source_key} (${source.name})`);
  ```

### 4. Updated Runner Logging

#### File: `api/_internal/ingestion/runner.ts`

**Changes**:
- Added logging when getting adapter:
  ```typescript
  console.log(`[Ingestion] Getting adapter for source: ${sourceKey}`);
  ```

### 5. Updated RapidAPI Sports Adapter Logging

#### File: `api/_internal/ingestion/adapters/rapidapi-sports.ts`

**Changes**:
- Added logging in constructor:
  ```typescript
  console.log("Using adapter: rapidapi-sports");
  ```

### 6. Removed Guardian from gather-sources-v2

#### File: `supabase/functions/_shared/sourceFetcher.ts`

**Changes**:
- **Removed Guardian** from `gatherAllSources()` function
- **Prioritized Mediastack** (now called first)
- **Removed Guardian processing** logic

**Before**:
```typescript
const [newsapiResult, guardianResult, mediastackResult] = await Promise.all([
  fetchNewsApiArticles(topic),
  fetchGuardianArticles(topic),  // ❌ Removed
  fetchMediastackArticles(topic),
]);
```

**After**:
```typescript
const [mediastackResult, newsapiResult] = await Promise.all([
  fetchMediastackArticles(topic),  // ✅ First priority
  fetchNewsApiArticles(topic),
]);
```

### 7. Updated gather-sources-v2 Debug Info

#### File: `supabase/functions/gather-sources-v2/index.ts`

**Changes**:
- Removed `hasGuardianKey` from debug env vars
- Added `hasRapidApiKey` to debug env vars

### 8. Database Migration

#### File: `supabase/migrations/20250119000002_update_content_sources_for_rapidapi.sql`

**Changes**:
- **Deactivates expired adapters**:
  ```sql
  UPDATE content_sources
  SET is_active = false
  WHERE source_key IN ('guardian', 'mediastack', 'newsapi');
  ```

- **Adds new RapidAPI adapters** (active):
  ```sql
  INSERT INTO content_sources (source_key, name, api_base_url, is_active, config) VALUES
    ('mediastack-rapidapi', 'Mediastack (RapidAPI)', 'https://mediastack.p.rapidapi.com', true, ...),
    ('newsapi-rapidapi', 'NewsAPI (RapidAPI)', 'https://newsapi-rapidapi.p.rapidapi.com', true, ...);
  ```

---

## Adapter Headers Implementation

### RapidAPI Adapters Use:
```typescript
headers: {
  "X-RapidAPI-Key": apiKey,      // From RAPIDAPI_KEY env var
  "X-RapidAPI-Host": host,        // e.g., "mediastack.p.rapidapi.com"
}
```

### All RapidAPI Adapters:
1. ✅ `mediastack-rapidapi` - Uses X-RapidAPI-Key and X-RapidAPI-Host
2. ✅ `newsapi-rapidapi` - Uses X-RapidAPI-Key and X-RapidAPI-Host
3. ✅ `rapidapi-sports` - Already uses X-RapidAPI-Key and X-RapidAPI-Host

---

## Logging Output

### Adapter Initialization:
- `"Using adapter: mediastack (rapidapi)"` - When MediastackRapidApiAdapter is created
- `"Using adapter: newsapi (rapidapi)"` - When NewsApiRapidApiAdapter is created
- `"Using adapter: rapidapi-sports"` - When RapidApiSportsAdapter is created

### Cron Processing:
- `"[Cron] Processing source: {source_key} ({name})"` - For each source being processed
- `"[Ingestion] Getting adapter for source: {sourceKey}"` - When adapter is retrieved

---

## Execution Order

### Before:
1. All sources processed in database order (alphabetical)
2. Guardian, old mediastack, old newsapi included

### After:
1. **RapidAPI adapters processed first** (in order):
   - `mediastack-rapidapi`
   - `newsapi-rapidapi`
   - `rapidapi-sports`
2. **Other active adapters** processed next:
   - `tmdb`
   - `ticketmaster`
   - `api-sports`
3. **Expired adapters excluded**:
   - `guardian` ❌
   - `mediastack` ❌
   - `newsapi` ❌

---

## Environment Variables Required

### For RapidAPI Adapters:
```env
RAPIDAPI_KEY=your-rapidapi-key-here
```

**Note**: All RapidAPI adapters (`mediastack-rapidapi`, `newsapi-rapidapi`, `rapidapi-sports`) use the same `RAPIDAPI_KEY` environment variable.

---

## Migration Required

**IMPORTANT**: Apply the database migration to activate the new adapters:
```sql
-- File: supabase/migrations/20250119000002_update_content_sources_for_rapidapi.sql
```

This migration will:
1. Deactivate `guardian`, `mediastack`, and `newsapi` sources
2. Add and activate `mediastack-rapidapi` and `newsapi-rapidapi` sources

---

## Files Changed Summary

### New Files Created:
1. `api/_internal/ingestion/adapters/mediastack-rapidapi.ts` - RapidAPI Mediastack adapter
2. `api/_internal/ingestion/adapters/newsapi-rapidapi.ts` - RapidAPI NewsAPI adapter
3. `supabase/migrations/20250119000002_update_content_sources_for_rapidapi.sql` - Database migration

### Files Modified:
1. `api/_internal/ingestion/adapters/index.ts` - Prioritized RapidAPI, removed expired adapters
2. `api/cron/run-ingestion.ts` - Filtered expired adapters, prioritized RapidAPI sources
3. `api/_internal/ingestion/runner.ts` - Added adapter logging
4. `api/_internal/ingestion/adapters/rapidapi-sports.ts` - Added logging
5. `supabase/functions/_shared/sourceFetcher.ts` - Removed Guardian, prioritized Mediastack
6. `supabase/functions/gather-sources-v2/index.ts` - Updated debug env vars

---

## Testing Checklist

- [ ] Apply database migration `20250119000002_update_content_sources_for_rapidapi.sql`
- [ ] Verify `RAPIDAPI_KEY` environment variable is set
- [ ] Run cron job and verify:
  - [ ] Guardian is not called
  - [ ] RapidAPI adapters are called first
  - [ ] Logs show "Using adapter: mediastack (rapidapi)"
  - [ ] Logs show "Using adapter: newsapi (rapidapi)"
  - [ ] No errors for expired adapters
- [ ] Verify content is being ingested from RapidAPI sources

---

## Rollback Instructions

If you need to rollback:

1. **Revert code changes**: Use git to revert commits
2. **Database**: Re-run migration to reactivate old adapters:
   ```sql
   UPDATE content_sources SET is_active = true WHERE source_key IN ('mediastack', 'newsapi');
   UPDATE content_sources SET is_active = false WHERE source_key IN ('mediastack-rapidapi', 'newsapi-rapidapi');
   ```

---

## Summary

✅ **Removed**: Guardian and expired adapters (old mediastack, old newsapi)  
✅ **Added**: RapidAPI-based adapters (mediastack-rapidapi, newsapi-rapidapi)  
✅ **Prioritized**: RapidAPI adapters execute first  
✅ **Headers**: All RapidAPI adapters use X-RapidAPI-Key and X-RapidAPI-Host  
✅ **Logging**: Clear logging shows which adapter is being used  

The cron now only calls active, valid APIs with RapidAPI adapters taking priority.
