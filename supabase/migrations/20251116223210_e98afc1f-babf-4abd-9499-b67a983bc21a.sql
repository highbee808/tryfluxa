-- Fix database functions missing search_path configuration
-- This prevents search_path manipulation attacks

-- Fix update_comment_likes_count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE article_comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE article_comments 
    SET likes_count = likes_count - 1 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_post_analytics_comments
CREATE OR REPLACE FUNCTION public.update_post_analytics_comments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_analytics (post_id, comments)
    VALUES (NEW.article_id, 1)
    ON CONFLICT (post_id) 
    DO UPDATE SET 
      comments = post_analytics.comments + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_analytics 
    SET 
      comments = GREATEST(comments - 1, 0),
      updated_at = now()
    WHERE post_id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix update_post_analytics_likes
CREATE OR REPLACE FUNCTION public.update_post_analytics_likes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO post_analytics (post_id, likes)
    VALUES (NEW.article_id::uuid, 1)
    ON CONFLICT (post_id) 
    DO UPDATE SET 
      likes = post_analytics.likes + 1,
      updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE post_analytics 
    SET 
      likes = GREATEST(likes - 1, 0),
      updated_at = now()
    WHERE post_id = OLD.article_id::uuid;
  END IF;
  RETURN NULL;
END;
$function$;

-- Fix notify_comment_reply
CREATE OR REPLACE FUNCTION public.notify_comment_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  parent_user_id uuid;
  post_headline text;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_user_id 
    FROM article_comments 
    WHERE id = NEW.parent_id;
    
    SELECT headline INTO post_headline
    FROM gists
    WHERE id = NEW.article_id;
    
    IF parent_user_id IS NOT NULL AND parent_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, entity_id, gist_id)
      VALUES (
        parent_user_id,
        'comment_reply',
        'New Reply',
        'Someone replied to your comment on "' || COALESCE(post_headline, 'a post') || '"',
        NEW.article_id,
        NEW.article_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix notify_new_follower
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  follower_name text;
BEGIN
  SELECT display_name INTO follower_name
  FROM profiles
  WHERE user_id = NEW.follower_id;
  
  IF NEW.follower_id != NEW.following_id THEN
    INSERT INTO notifications (user_id, type, title, message, entity_id)
    VALUES (
      NEW.following_id,
      'new_follower',
      'New Follower',
      COALESCE(follower_name, 'Someone') || ' started following you',
      NEW.follower_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;