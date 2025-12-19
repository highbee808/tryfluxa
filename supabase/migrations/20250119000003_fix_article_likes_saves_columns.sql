-- Fix article_likes and article_saves tables to have article_id column
-- This column was missing, causing likes/saves to fail

-- Add article_id column to article_likes if not exists
ALTER TABLE public.article_likes 
  ADD COLUMN IF NOT EXISTS article_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Add article_id column to article_saves if not exists
ALTER TABLE public.article_saves 
  ADD COLUMN IF NOT EXISTS article_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';

-- Create unique index to prevent duplicate likes (one like per user per article)
CREATE UNIQUE INDEX IF NOT EXISTS article_likes_user_article_idx 
  ON public.article_likes(user_id, article_id);

-- Create unique index to prevent duplicate saves (one save per user per article)
CREATE UNIQUE INDEX IF NOT EXISTS article_saves_user_article_idx 
  ON public.article_saves(user_id, article_id);

-- Create indexes for faster lookups by article_id
CREATE INDEX IF NOT EXISTS article_likes_article_id_idx 
  ON public.article_likes(article_id);

CREATE INDEX IF NOT EXISTS article_saves_article_id_idx 
  ON public.article_saves(article_id);
