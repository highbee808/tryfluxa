-- Fix post_analytics to support both gists and content_items
-- Drop foreign key constraint on post_id to allow it to reference any UUID

-- Drop the foreign key constraint if it exists
ALTER TABLE public.post_analytics 
  DROP CONSTRAINT IF EXISTS post_analytics_post_id_fkey;

-- Note: post_id remains NOT NULL and UUID type, but no longer has FK constraint
-- This allows it to reference both gists.id and content_items.id
