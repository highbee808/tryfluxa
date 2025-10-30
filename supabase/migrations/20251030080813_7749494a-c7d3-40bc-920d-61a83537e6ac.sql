-- Create stories table for Fluxa's daily story content
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gist_id UUID REFERENCES public.gists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '24 hours')
);

-- Create story_reactions table for user reactions
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('😂', '🔥', '😱', '💋')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id)
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Stories policies
CREATE POLICY "Anyone can view active stories"
  ON public.stories
  FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Service role can insert stories"
  ON public.stories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update stories"
  ON public.stories
  FOR UPDATE
  USING (true);

-- Story reactions policies
CREATE POLICY "Users can view all reactions"
  ON public.story_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON public.story_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.story_reactions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.story_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_stories_expires_at ON public.stories(expires_at);
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);