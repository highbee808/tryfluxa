-- Rebuild news_cache table and add comments table for content foundation
-- Generated: 2025-11-24

BEGIN;

-- Ensure pgcrypto for UUID helpers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Preserve legacy data if an older news_cache exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'news_cache'
  ) THEN
    EXECUTE 'ALTER TABLE public.news_cache RENAME TO news_cache_legacy';
  END IF;
END;
$$;

-- Normalized cache table used by fetch-content
CREATE TABLE public.news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('news', 'sports', 'music')),
  query TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  summary TEXT,
  raw JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  views_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_news_cache_category_query_published
  ON public.news_cache (category, query, published_at DESC);

DROP TRIGGER IF EXISTS trg_news_cache_updated_at ON public.news_cache;
CREATE TRIGGER trg_news_cache_updated_at
  BEFORE UPDATE ON public.news_cache
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "news_cache anon select" ON public.news_cache;
DROP POLICY IF EXISTS "news_cache authenticated select" ON public.news_cache;
DROP POLICY IF EXISTS "news_cache public select" ON public.news_cache;
DROP POLICY IF EXISTS "news_cache insert service" ON public.news_cache;
DROP POLICY IF EXISTS "news_cache update service" ON public.news_cache;
DROP POLICY IF EXISTS "news_cache delete service" ON public.news_cache;

CREATE POLICY "news_cache public select"
ON public.news_cache FOR SELECT
USING (auth.role() IN ('anon', 'authenticated') OR auth.role() = 'service_role');

CREATE POLICY "news_cache insert service"
ON public.news_cache FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "news_cache update service"
ON public.news_cache FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "news_cache delete service"
ON public.news_cache FOR DELETE
USING (auth.role() = 'service_role');

-- Comments table referencing cached posts
DROP TABLE IF EXISTS public.comments CASCADE;

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.news_cache(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_comments_post_created_at
  ON public.comments (post_id, created_at DESC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments anon select" ON public.comments;
DROP POLICY IF EXISTS "comments auth select" ON public.comments;
DROP POLICY IF EXISTS "comments auth insert" ON public.comments;
DROP POLICY IF EXISTS "comments auth delete" ON public.comments;

CREATE POLICY "comments public select"
ON public.comments FOR SELECT
USING (auth.role() IN ('anon', 'authenticated') OR auth.role() = 'service_role');

CREATE POLICY "comments auth insert"
ON public.comments FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "comments auth delete"
ON public.comments FOR DELETE
USING (auth.role() = 'authenticated' AND auth.uid() = user_id);

COMMIT;

