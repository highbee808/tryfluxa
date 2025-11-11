-- Create news_cache table for caching news data
CREATE TABLE IF NOT EXISTS public.news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  news_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_news_cache_entity_cached ON public.news_cache(entity, cached_at DESC);

-- Enable RLS
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read cached news
CREATE POLICY "Anyone can read cached news"
  ON public.news_cache
  FOR SELECT
  USING (true);

-- Only service role can insert/update cache
CREATE POLICY "Service role can manage cache"
  ON public.news_cache
  FOR ALL
  USING (auth.role() = 'service_role');