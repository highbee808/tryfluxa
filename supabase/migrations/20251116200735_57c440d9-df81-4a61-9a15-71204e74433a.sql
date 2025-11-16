-- Add database triggers for real-time notifications

-- Function to create notification for comment reply
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_user_id uuid;
  post_headline text;
BEGIN
  -- Only create notification if this is a reply (has parent_id)
  IF NEW.parent_id IS NOT NULL THEN
    -- Get parent comment user
    SELECT user_id INTO parent_user_id 
    FROM article_comments 
    WHERE id = NEW.parent_id;
    
    -- Get post headline
    SELECT headline INTO post_headline
    FROM gists
    WHERE id = NEW.article_id;
    
    -- Don't notify if user is replying to their own comment
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment replies
DROP TRIGGER IF EXISTS on_comment_reply ON article_comments;
CREATE TRIGGER on_comment_reply
  AFTER INSERT ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_reply();

-- Function to create notification for new follower
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_name text;
BEGIN
  -- Get follower display name
  SELECT display_name INTO follower_name
  FROM profiles
  WHERE user_id = NEW.follower_id;
  
  -- Don't notify if user follows themselves
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new followers
DROP TRIGGER IF EXISTS on_new_follower ON user_follows;
CREATE TRIGGER on_new_follower
  AFTER INSERT ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();