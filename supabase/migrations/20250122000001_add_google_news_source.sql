-- Phase 9: Add Google News RapidAPI source and deactivate quota-exceeded sources

-- Deactivate sources that have exceeded their API quotas
UPDATE public.content_sources
SET is_active = false,
    updated_at = now()
WHERE source_key IN ('newsapi-rapidapi', 'mediastack-rapidapi')
  AND is_active = true;

-- Add Google News RapidAPI source
INSERT INTO public.content_sources (
  source_key,
  name,
  api_base_url,
  is_active,
  config,
  created_at,
  updated_at
) VALUES (
  'google-news',
  'Google News (RapidAPI)',
  'https://google-news22.p.rapidapi.com',
  true,
  jsonb_build_object(
    'host', 'google-news22.p.rapidapi.com',
    'default_refresh_hours', 3,
    'max_items_per_run', 50,
    'topic', 'business',
    'country', 'us',
    'language', 'en'
  ),
  now(),
  now()
)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_base_url = EXCLUDED.api_base_url,
  is_active = true,
  config = EXCLUDED.config,
  updated_at = now();
