-- Create enum for entity categories
CREATE TYPE public.fan_entity_category AS ENUM ('sports', 'music', 'culture');

-- Create fan_entities table for teams, artists, etc.
CREATE TABLE public.fan_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category public.fan_entity_category NOT NULL,
  logo_url TEXT,
  background_url TEXT,
  bio TEXT,
  api_id TEXT,
  api_source TEXT,
  achievements JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fan_posts table for user posts on entity pages
CREATE TABLE public.fan_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  reaction_count INTEGER DEFAULT 0,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create fan_entity_stats table for live data
CREATE TABLE public.fan_entity_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE NOT NULL,
  stat_type TEXT NOT NULL,
  stat_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(entity_id, stat_type)
);

-- Create fan_follows table for user follows
CREATE TABLE public.fan_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_id UUID REFERENCES public.fan_entities(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, entity_id)
);

-- Enable RLS
ALTER TABLE public.fan_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_entity_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fan_entities
CREATE POLICY "Anyone can view fan entities"
  ON public.fan_entities FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage entities"
  ON public.fan_entities FOR ALL
  USING (true);

-- RLS Policies for fan_posts
CREATE POLICY "Anyone can view fan posts"
  ON public.fan_posts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON public.fan_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.fan_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.fan_posts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for fan_entity_stats
CREATE POLICY "Anyone can view entity stats"
  ON public.fan_entity_stats FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage stats"
  ON public.fan_entity_stats FOR ALL
  USING (true);

-- RLS Policies for fan_follows
CREATE POLICY "Users can view all follows"
  ON public.fan_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own follows"
  ON public.fan_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows"
  ON public.fan_follows FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_fan_entities_slug ON public.fan_entities(slug);
CREATE INDEX idx_fan_entities_category ON public.fan_entities(category);
CREATE INDEX idx_fan_posts_entity_id ON public.fan_posts(entity_id);
CREATE INDEX idx_fan_posts_user_id ON public.fan_posts(user_id);
CREATE INDEX idx_fan_posts_created_at ON public.fan_posts(created_at DESC);
CREATE INDEX idx_fan_follows_user_id ON public.fan_follows(user_id);
CREATE INDEX idx_fan_follows_entity_id ON public.fan_follows(entity_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_fan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_fan_entities_updated_at
  BEFORE UPDATE ON public.fan_entities
  FOR EACH ROW
  EXECUTE FUNCTION update_fan_updated_at();

CREATE TRIGGER update_fan_posts_updated_at
  BEFORE UPDATE ON public.fan_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_fan_updated_at();