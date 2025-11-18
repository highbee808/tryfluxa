-- Allow audio to be generated on demand and cached per gist
ALTER TABLE public.gists ALTER COLUMN audio_url DROP NOT NULL;
ALTER TABLE public.gists ALTER COLUMN audio_url DROP DEFAULT;
ALTER TABLE public.gists ADD COLUMN IF NOT EXISTS audio_cache_url TEXT;

-- Expand news_cache so we can persist normalized payloads and explanation audio
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS summary_payload JSONB;
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS audio_cache JSONB;
