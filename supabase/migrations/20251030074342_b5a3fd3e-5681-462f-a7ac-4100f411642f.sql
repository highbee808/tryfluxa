-- Create fluxa_memory table to store user interaction history
CREATE TABLE IF NOT EXISTS public.fluxa_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  gist_history JSONB DEFAULT '[]'::jsonb,
  favorite_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fluxa_memory ENABLE ROW LEVEL SECURITY;

-- Users can view their own memory
CREATE POLICY "Users can view own memory"
ON public.fluxa_memory
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own memory
CREATE POLICY "Users can insert own memory"
ON public.fluxa_memory
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own memory
CREATE POLICY "Users can update own memory"
ON public.fluxa_memory
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own memory
CREATE POLICY "Users can delete own memory"
ON public.fluxa_memory
FOR DELETE
USING (auth.uid() = user_id);

-- Add favorite_count to gists table
ALTER TABLE public.gists ADD COLUMN IF NOT EXISTS favorite_count INTEGER DEFAULT 0;

-- Create user_favorites table for tracking liked gists
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gist_id UUID REFERENCES public.gists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, gist_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger to update updated_at on fluxa_memory
CREATE OR REPLACE FUNCTION update_fluxa_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fluxa_memory_updated_at
BEFORE UPDATE ON public.fluxa_memory
FOR EACH ROW
EXECUTE FUNCTION update_fluxa_memory_updated_at();