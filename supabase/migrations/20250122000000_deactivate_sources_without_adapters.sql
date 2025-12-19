-- Phase 9: Deactivate content sources that do not have implemented adapters
-- This ensures clean observability metrics by only keeping sources with working adapters

-- List of implemented adapters (from api/_internal/ingestion/adapters/index.ts):
-- - google-news (NEW - Google News via RapidAPI)
-- - mediastack-rapidapi (quota exceeded - will be deactivated separately)
-- - newsapi-rapidapi (quota exceeded - will be deactivated separately)
-- - rapidapi-sports
-- - tmdb
-- - ticketmaster
-- - api-sports

-- Deactivate all sources that are NOT in the list above
UPDATE public.content_sources
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND source_key NOT IN (
    'google-news',
    'mediastack-rapidapi',
    'newsapi-rapidapi',
    'rapidapi-sports',
    'tmdb',
    'ticketmaster',
    'api-sports'
  )
  -- Also exclude legacy/expired adapters that should remain inactive
  AND source_key NOT IN (
    'guardian',
    'mediastack',
    'newsapi'
  );

-- Log the deactivation for observability
DO $$
DECLARE
  deactivated_count INTEGER;
BEGIN
  GET DIAGNOSTICS deactivated_count = ROW_COUNT;
  
  -- Note: This will be visible in database logs
  RAISE NOTICE 'Deactivated % content source(s) without adapters', deactivated_count;
END $$;
