-- Add missing columns to gists table
ALTER TABLE public.gists 
ADD COLUMN IF NOT EXISTS narration TEXT,
ADD COLUMN IF NOT EXISTS topic_category TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'published', 'failed')),
ADD COLUMN IF NOT EXISTS play_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;

-- Update existing records to have published status
UPDATE public.gists SET status = 'published' WHERE status IS NULL;

-- Create index for fast fetching
CREATE INDEX IF NOT EXISTS idx_gists_status_published ON public.gists(status, published_at DESC);

-- Update RLS policies for gists table
DROP POLICY IF EXISTS "Anyone can view published gists" ON public.gists;

CREATE POLICY "Anyone can view published gists" 
ON public.gists 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Service role can insert gists" 
ON public.gists 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update gists" 
ON public.gists 
FOR UPDATE 
USING (true);