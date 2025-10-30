-- Fix search_path for get_favorite_category function
CREATE OR REPLACE FUNCTION get_favorite_category(user_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  fav_category TEXT;
BEGIN
  SELECT topic_category
  INTO fav_category
  FROM (
    SELECT 
      jsonb_array_elements(gist_history)->>'topic' as topic_category,
      COUNT(*) as play_count
    FROM fluxa_memory
    WHERE user_id = user_uuid
    GROUP BY topic_category
    ORDER BY play_count DESC
    LIMIT 1
  ) as categories;
  
  RETURN fav_category;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;