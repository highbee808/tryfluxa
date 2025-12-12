-- Add raw_trend_id column to gists table to enforce 1:1 mapping
-- This ensures each gist is linked to exactly one raw_trend row

ALTER TABLE public.gists 
ADD COLUMN IF NOT EXISTS raw_trend_id UUID REFERENCES public.raw_trends(id) ON DELETE SET NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_gists_raw_trend_id ON public.gists(raw_trend_id);

-- Create unique constraint to prevent multiple gists for same raw_trend
-- This enforces strict 1:1 relationship
CREATE UNIQUE INDEX IF NOT EXISTS idx_gists_raw_trend_id_unique 
ON public.gists(raw_trend_id) 
WHERE raw_trend_id IS NOT NULL;

