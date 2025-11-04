-- Create user_subniches table
CREATE TABLE public.user_subniches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  main_topic TEXT NOT NULL,
  sub_niches TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_subniches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_subniches
CREATE POLICY "Users can view own subniches"
  ON public.user_subniches
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subniches"
  ON public.user_subniches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subniches"
  ON public.user_subniches
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subniches"
  ON public.user_subniches
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create sports_fan_reactions table
CREATE TABLE public.sports_fan_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team TEXT NOT NULL,
  reaction TEXT NOT NULL,
  match_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sports_fan_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sports_fan_reactions
CREATE POLICY "Users can view all reactions"
  ON public.sports_fan_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON public.sports_fan_reactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.sports_fan_reactions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.sports_fan_reactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create fanbase_threads table
CREATE TABLE public.fanbase_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  topic_name TEXT NOT NULL,
  post TEXT NOT NULL,
  user_id UUID,
  audio_url TEXT,
  reactions JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fanbase_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fanbase_threads
CREATE POLICY "Anyone can view fanbase threads"
  ON public.fanbase_threads
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert threads"
  ON public.fanbase_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own threads"
  ON public.fanbase_threads
  FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own threads"
  ON public.fanbase_threads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER TABLE public.sports_fan_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.fanbase_threads REPLICA IDENTITY FULL;