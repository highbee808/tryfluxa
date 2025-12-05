-- Add stats and related_artists columns to artist_cache table
ALTER TABLE public.artist_cache 
ADD COLUMN IF NOT EXISTS stats JSONB,
ADD COLUMN IF NOT EXISTS related_artists JSONB;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artist_cache_last_refreshed ON public.artist_cache(last_refreshed_at DESC);

