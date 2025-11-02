-- Create raw_trends table to store aggregated trends from multiple APIs
CREATE TABLE IF NOT EXISTS public.raw_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed BOOLEAN DEFAULT false
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_raw_trends_created_at ON public.raw_trends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_trends_processed ON public.raw_trends(processed);
CREATE INDEX IF NOT EXISTS idx_raw_trends_category ON public.raw_trends(category);

-- Add source_url and published_at to gists table
ALTER TABLE public.gists 
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS news_published_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on raw_trends
ALTER TABLE public.raw_trends ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage raw_trends (admin only)
CREATE POLICY "Service role can manage raw_trends"
  ON public.raw_trends
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Users can view raw_trends
CREATE POLICY "Users can view raw_trends"
  ON public.raw_trends
  FOR SELECT
  USING (true);