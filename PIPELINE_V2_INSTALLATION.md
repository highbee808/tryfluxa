# Pipeline v2 Installation Complete ✅

## Overview
Pipeline v2 is a modular, cache-enabled gist generation system that improves performance and reliability over v1.

## Files Created

### 1. SQL Migration
- **supabase/migrations/20250101000000_fluxa_cache_v2.sql**
  - Creates `fluxa_cache` table for API response caching
  - Includes RLS policies for service role access

### 2. Shared Utilities
- **supabase/functions/_shared/http.ts**
  - CORS headers
  - Response helpers (`createResponse`, `createErrorResponse`)
  - Body parsing utilities

- **supabase/functions/_shared/cache.ts**
  - Cache get/set/delete operations
  - TTL-based expiration
  - Cache key generation

### 3. Edge Functions

#### gather-sources-v2
- **Location**: `supabase/functions/gather-sources-v2/index.ts`
- **Purpose**: Fetches articles from external APIs sequentially
- **Flow**: NewsAPI → Guardian → Mediastack (stops early if articles found)
- **Caching**: 1 hour TTL for API responses

#### generate-gist-v2
- **Location**: `supabase/functions/generate-gist-v2/index.ts`
- **Purpose**: Generates gist content using external sources + OpenAI
- **Flow**: 
  1. Calls `gather-sources-v2` to get articles
  2. Uses OpenAI GPT-4o-mini to create headline, context, narration
  3. Generates DALL-E 3 image if needed
- **Caching**: 30 minutes TTL for generated content

#### publish-gist-v2
- **Location**: `supabase/functions/publish-gist-v2/index.ts`
- **Purpose**: Orchestrates full pipeline and saves to database
- **Flow**:
  1. Calls `generate-gist-v2` to get content
  2. Handles image upload/storage
  3. Inserts gist into `gists` table
- **Auth**: Accepts publishable key (anon key) for admin operations

#### auto-generate-gists-v2
- **Location**: `supabase/functions/auto-generate-gists-v2/index.ts`
- **Purpose**: Scheduled cron job to auto-generate gists
- **Flow**:
  1. Fetches trending topics from `scrape-trends`
  2. Calls `publish-gist-v2` for each topic
  3. Marks trends as processed
- **Security**: HMAC signature validation

## Frontend Updates

### Files Modified
1. **src/pages/Admin.tsx**
   - Pipeline Test now calls `publish-gist-v2`
   - Create Gist form now calls `publish-gist-v2`
   - Enhanced error logging with full error details
   - Logs endpoint URL for debugging

2. **src/test-publish-gist.ts**
   - Updated to use `publish-gist-v2`

3. **supabase/functions/auto-generate-gists/index.ts**
   - Updated to call `publish-gist-v2` (v1 function still exists for backward compatibility)

## Environment Variables

### Required (Already Set)
```env
SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SB_SERVICE_ROLE_KEY=<your-service-role-key>
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4o-mini
CRON_SECRET=<your-cron-secret>
NEWSAPI_KEY=<your-newsapi-key> (optional)
GUARDIAN_API_KEY=<your-guardian-key> (optional)
MEDIASTACK_KEY=<your-mediastack-key> (optional)
```

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://vzjyclgrqoyxbbzplkgw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>
```

## Deployment Steps

### 1. Apply Migration
```bash
supabase migration up
```

Or via Supabase Dashboard:
- Go to Database → Migrations
- Apply `20250101000000_fluxa_cache_v2.sql`

### 2. Deploy Edge Functions
```bash
supabase functions deploy gather-sources-v2
supabase functions deploy generate-gist-v2
supabase functions deploy publish-gist-v2
supabase functions deploy auto-generate-gists-v2
```

### 3. Verify Secrets
Ensure all environment variables are set in Supabase Dashboard:
- Project Settings → Edge Functions → Secrets

## Testing

### Admin Pipeline Test
1. Navigate to `/admin`
2. Click "Test Pipeline" button
3. Check logs for:
   - ✅ Endpoint URL logged
   - ✅ Full error messages displayed
   - ✅ Success confirmation

### Create Gist
1. Navigate to `/admin`
2. Fill in topic and category
3. Click "Generate Gist"
4. Verify gist appears in feed

## Architecture Improvements

### v1 vs v2

| Feature | v1 | v2 |
|---------|----|----|
| Modularity | Monolithic | Modular (3 separate functions) |
| Caching | None | Redis-like cache table |
| API Calls | Parallel (Promise.all) | Sequential (stops early) |
| Error Handling | Basic | Comprehensive with details |
| Code Reuse | Duplicated | Shared utilities |
| Performance | Slower | Faster (caching + early stop) |

### Pipeline Flow

```
User/Admin
    ↓
publish-gist-v2
    ↓
generate-gist-v2
    ↓
gather-sources-v2 → [Cache Check] → NewsAPI/Guardian/Mediastack
    ↓
OpenAI GPT-4o-mini (if no external sources)
    ↓
DALL-E 3 (image generation)
    ↓
publish-gist-v2 (saves to DB)
    ↓
Success Response
```

## Backward Compatibility

- v1 functions (`publish-gist`, `generate-gist`, `auto-generate-gists`) still exist
- v2 functions are new and don't break existing functionality
- Frontend now uses v2, but v1 can still be called directly if needed

## Troubleshooting

### Cache Issues
- Check `fluxa_cache` table exists: `SELECT * FROM fluxa_cache LIMIT 10;`
- Clear cache: `DELETE FROM fluxa_cache WHERE expires_at < NOW();`

### Function Errors
- Check Supabase Dashboard → Edge Functions → Logs
- Verify all secrets are set correctly
- Ensure migration was applied

### Frontend Errors
- Verify `VITE_SUPABASE_PUBLISHABLE_KEY` is set
- Check browser console for full error messages
- Verify endpoint URL is correct (should be absolute, not relative)

## Next Steps

1. ✅ Deploy all v2 functions
2. ✅ Test Pipeline Test page
3. ✅ Test Create Gist page
4. ✅ Monitor function logs for errors
5. ✅ Set up cron schedule for `auto-generate-gists-v2` (if needed)

---

**Status**: ✅ Pipeline v2 installed and ready for deployment!

