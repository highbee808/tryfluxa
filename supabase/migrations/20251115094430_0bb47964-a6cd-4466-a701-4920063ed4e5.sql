-- Create post analytics table for real-time engagement tracking
CREATE TABLE IF NOT EXISTS public.post_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON public.post_analytics(post_id);

-- Create unique constraint to ensure one analytics record per post
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_analytics_unique_post ON public.post_analytics(post_id);

-- Enable RLS
ALTER TABLE public.post_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view analytics (public engagement metrics)
CREATE POLICY "Anyone can view post analytics"
  ON public.post_analytics FOR SELECT
  USING (true);

-- Service role can manage analytics
CREATE POLICY "Service role can manage analytics"
  ON public.post_analytics FOR ALL
  USING (true);

-- Add comment reactions and threading support
ALTER TABLE public.article_comments 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.article_comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN NOT NULL DEFAULT false;

-- Create comment likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.article_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON public.article_comments(parent_id);

-- Enable RLS for comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Comment likes policies
CREATE POLICY "Anyone can view comment likes"
  ON public.comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like comments"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for comment likes
DROP TRIGGER IF EXISTS trigger_update_comment_likes ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Function to update post analytics comment count
CREATE OR REPLACE FUNCTION update_post_analytics_comments()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for post analytics comments
DROP TRIGGER IF EXISTS trigger_update_post_analytics_comments ON article_comments;
CREATE TRIGGER trigger_update_post_analytics_comments
  AFTER INSERT OR DELETE ON article_comments
  FOR EACH ROW EXECUTE FUNCTION update_post_analytics_comments();

-- Function to update post analytics likes count
CREATE OR REPLACE FUNCTION update_post_analytics_likes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for post analytics likes
DROP TRIGGER IF EXISTS trigger_update_post_analytics_likes ON article_likes;
CREATE TRIGGER trigger_update_post_analytics_likes
  AFTER INSERT OR DELETE ON article_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_analytics_likes();

-- Enable realtime for comments and analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.article_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comment_likes;