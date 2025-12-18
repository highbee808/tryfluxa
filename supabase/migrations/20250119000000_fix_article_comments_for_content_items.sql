-- Fix article_comments to support both gists and content_items
-- Remove foreign key constraint to allow article_id to reference any UUID (gists or content_items)

-- Drop the foreign key constraint (this allows article_id to be any UUID, not just from gists table)
ALTER TABLE public.article_comments 
  DROP CONSTRAINT IF EXISTS article_comments_article_id_fkey;

-- Note: article_id remains NOT NULL and UUID type, but no longer has FK constraint
-- This allows it to reference both gists.id and content_items.id
