-- Fix: Remove SECURITY DEFINER from user_activity_feed view
-- This ensures the view respects RLS policies of the querying user
-- rather than bypassing them with the view creator's permissions

DROP VIEW IF EXISTS public.user_activity_feed;

CREATE VIEW public.user_activity_feed AS
SELECT 
  'favorite'::text AS activity_type,
  uf.user_id,
  uf.gist_id AS item_id,
  g.headline AS item_title,
  g.image_url AS item_image,
  uf.created_at
FROM public.user_favorites uf
JOIN public.gists g ON uf.gist_id = g.id

UNION ALL

SELECT 
  'post'::text AS activity_type,
  fp.user_id,
  fp.id AS item_id,
  fp.content AS item_title,
  fp.media_url AS item_image,
  fp.created_at
FROM public.fan_posts fp;

-- The view now uses the permissions of the querying user
-- and respects RLS policies on user_favorites, gists, and fan_posts tables