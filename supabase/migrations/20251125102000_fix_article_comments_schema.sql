-- Rebuild article_comments schema with required columns and relationships
DO $$
BEGIN
  -- Drop dependent tables first to avoid FK conflicts
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'comment_likes'
  ) THEN
    DROP TABLE public.comment_likes CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'article_comments'
  ) THEN
    DROP TABLE public.article_comments CASCADE;
  END IF;
END $$ LANGUAGE plpgsql;

-- Core comments table
CREATE TABLE public.article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.gists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.article_comments(id) ON DELETE CASCADE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  is_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.article_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_article_comments_article_id ON public.article_comments(article_id);
CREATE INDEX idx_article_comments_user_id ON public.article_comments(user_id);
CREATE INDEX idx_article_comments_parent_id ON public.article_comments(parent_id);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_article_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_touch_article_comments_updated_at
BEFORE UPDATE ON public.article_comments
FOR EACH ROW EXECUTE FUNCTION public.touch_article_comments_updated_at();

-- Policies
CREATE POLICY "Anyone can view comments"
ON public.article_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.article_comments FOR INSERT
WITH CHECK (auth.uid() = user_id AND content IS NOT NULL AND content <> '');

CREATE POLICY "Users can update their own comments"
ON public.article_comments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.article_comments FOR DELETE
USING (auth.uid() = user_id);

-- Comment likes table
CREATE TABLE public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.article_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes(user_id);

CREATE POLICY "Anyone can view comment likes"
ON public.comment_likes FOR SELECT USING (true);

CREATE POLICY "Users can like comments"
ON public.comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike comments"
ON public.comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Analytics helpers
CREATE OR REPLACE FUNCTION public.update_post_analytics_comments()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.post_analytics (post_id, comments)
    VALUES (NEW.article_id, 1)
    ON CONFLICT (post_id)
    DO UPDATE SET comments = public.post_analytics.comments + 1,
                  updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_analytics
    SET comments = GREATEST(public.post_analytics.comments - 1, 0),
        updated_at = now()
    WHERE post_id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_post_analytics_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.post_analytics (post_id, likes)
    VALUES (NEW.article_id, 1)
    ON CONFLICT (post_id)
    DO UPDATE SET likes = public.post_analytics.likes + 1,
                  updated_at = now();
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_analytics
    SET likes = GREATEST(public.post_analytics.likes - 1, 0),
        updated_at = now()
    WHERE post_id = OLD.article_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers hooking analytics
CREATE TRIGGER trigger_update_post_analytics_comments
AFTER INSERT OR DELETE ON public.article_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_analytics_comments();

CREATE TRIGGER trigger_update_post_analytics_likes
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_analytics_likes();

