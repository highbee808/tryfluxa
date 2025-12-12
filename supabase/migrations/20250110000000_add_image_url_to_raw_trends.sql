-- Add image_url column to raw_trends table
ALTER TABLE public.raw_trends 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for image_url queries (optional, but helpful for filtering)
CREATE INDEX IF NOT EXISTS idx_raw_trends_image_url ON public.raw_trends(image_url) WHERE image_url IS NOT NULL;

