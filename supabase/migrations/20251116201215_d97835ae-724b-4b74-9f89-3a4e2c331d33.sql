-- Gamification System Tables

-- User points and levels table
CREATE TABLE IF NOT EXISTS user_gamification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  total_points integer DEFAULT 0,
  level integer DEFAULT 1,
  comments_count integer DEFAULT 0,
  likes_given integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  posts_read integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Achievements/Badges definition
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  points_required integer,
  activity_type text, -- 'comments', 'likes', 'shares', 'reads'
  activity_count integer,
  tier text DEFAULT 'bronze', -- bronze, silver, gold, platinum
  created_at timestamp with time zone DEFAULT now()
);

-- User achievements (earned badges)
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  achievement_id uuid REFERENCES achievements NOT NULL,
  earned_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  endpoint text NOT NULL UNIQUE,
  auth_key text NOT NULL,
  p256dh_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_gamification
CREATE POLICY "Users can view all gamification stats" ON user_gamification FOR SELECT USING (true);
CREATE POLICY "Users can update own gamification" ON user_gamification FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gamification" ON user_gamification FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Anyone can view achievements" ON achievements FOR SELECT USING (true);
CREATE POLICY "Only admins can manage achievements" ON achievements FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view all earned achievements" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "System can insert achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Function to update gamification stats
CREATE OR REPLACE FUNCTION update_user_gamification()
RETURNS TRIGGER AS $$
DECLARE
  points_to_add integer := 0;
  new_level integer;
BEGIN
  -- Determine points based on activity
  IF TG_TABLE_NAME = 'article_comments' THEN
    points_to_add := 10;
    UPDATE user_gamification 
    SET comments_count = comments_count + 1
    WHERE user_id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'article_likes' THEN
    points_to_add := 2;
    UPDATE user_gamification 
    SET likes_given = likes_given + 1
    WHERE user_id = NEW.user_id;
  ELSIF TG_TABLE_NAME = 'post_analytics' AND TG_OP = 'UPDATE' AND NEW.shares > OLD.shares THEN
    points_to_add := 5;
    -- Note: We'd need to track who shared, for now we skip this
    RETURN NEW;
  END IF;
  
  -- Add points and recalculate level
  IF points_to_add > 0 THEN
    UPDATE user_gamification 
    SET 
      total_points = total_points + points_to_add,
      level = FLOOR((total_points + points_to_add) / 100) + 1,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Check for new achievements
    PERFORM check_and_award_achievements(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id uuid)
RETURNS void AS $$
DECLARE
  user_stats record;
  achievement record;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats FROM user_gamification WHERE user_id = p_user_id;
  
  -- Check all achievements
  FOR achievement IN SELECT * FROM achievements LOOP
    -- Check if user already has this achievement
    IF NOT EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_id = p_user_id AND achievement_id = achievement.id
    ) THEN
      -- Check if user qualifies
      IF (achievement.activity_type = 'comments' AND user_stats.comments_count >= achievement.activity_count) OR
         (achievement.activity_type = 'likes' AND user_stats.likes_given >= achievement.activity_count) OR
         (achievement.activity_type = 'shares' AND user_stats.shares_count >= achievement.activity_count) OR
         (achievement.activity_type = 'reads' AND user_stats.posts_read >= achievement.activity_count) OR
         (achievement.points_required IS NOT NULL AND user_stats.total_points >= achievement.points_required) THEN
        
        -- Award achievement
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, achievement.id);
        
        -- Create notification
        INSERT INTO notifications (user_id, type, title, message)
        VALUES (
          p_user_id,
          'achievement',
          'New Achievement Unlocked! 🎉',
          'You earned the "' || achievement.name || '" badge!'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for gamification
DROP TRIGGER IF EXISTS award_points_comment ON article_comments;
CREATE TRIGGER award_points_comment
  AFTER INSERT ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gamification();

DROP TRIGGER IF EXISTS award_points_like ON article_likes;
CREATE TRIGGER award_points_like
  AFTER INSERT ON article_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_gamification();

-- Insert default achievements
INSERT INTO achievements (name, description, icon, activity_type, activity_count, tier) VALUES
  ('First Steps', 'Post your first comment', '💬', 'comments', 1, 'bronze'),
  ('Conversationalist', 'Post 10 comments', '🗨️', 'comments', 10, 'silver'),
  ('Debate Master', 'Post 50 comments', '🎤', 'comments', 50, 'gold'),
  ('Legend', 'Post 100 comments', '👑', 'comments', 100, 'platinum'),
  ('Generous', 'Give 50 likes', '❤️', 'likes', 50, 'bronze'),
  ('Supporter', 'Give 200 likes', '💕', 'likes', 200, 'silver'),
  ('Super Fan', 'Give 500 likes', '🌟', 'likes', 500, 'gold')
ON CONFLICT DO NOTHING;

-- Function to handle mentions in comments
CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
DECLARE
  mention text;
  mentioned_username text;
  mentioned_user_id uuid;
  post_headline text;
BEGIN
  -- Get post headline
  SELECT headline INTO post_headline FROM gists WHERE id = NEW.article_id;
  
  -- Extract mentions from content (simple regex for @username)
  FOR mention IN SELECT unnest(regexp_matches(NEW.content, '@(\w+)', 'g')) LOOP
    mentioned_username := mention;
    
    -- Find user by display name
    SELECT user_id INTO mentioned_user_id 
    FROM profiles 
    WHERE LOWER(display_name) = LOWER(mentioned_username)
    LIMIT 1;
    
    -- Create notification if user found and not mentioning themselves
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO notifications (user_id, type, title, message, gist_id, entity_id)
      VALUES (
        mentioned_user_id,
        'mention',
        'Someone mentioned you',
        'You were mentioned in a comment on "' || COALESCE(post_headline, 'a post') || '"',
        NEW.article_id,
        NEW.id
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for mentions
DROP TRIGGER IF EXISTS on_comment_mention ON article_comments;
CREATE TRIGGER on_comment_mention
  AFTER INSERT ON article_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_mentioned_users();