-- Create rapid_api_usage table for tracking RAPID API calls
CREATE TABLE IF NOT EXISTS public.rapid_api_usage (
  date DATE NOT NULL PRIMARY KEY,
  calls_used INTEGER NOT NULL DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rapid_api_usage_date ON public.rapid_api_usage(date);

-- Enable RLS (but allow service role to access)
ALTER TABLE public.rapid_api_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role can manage rapid_api_usage"
ON public.rapid_api_usage
FOR ALL
USING (true)
WITH CHECK (true);

-- Function to increment calls_used atomically
CREATE OR REPLACE FUNCTION increment_rapid_api_calls(call_date DATE, call_count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  INSERT INTO public.rapid_api_usage (date, calls_used, last_reset)
  VALUES (call_date, call_count, now())
  ON CONFLICT (date) 
  DO UPDATE SET 
    calls_used = rapid_api_usage.calls_used + call_count,
    updated_at = now(),
    last_reset = now();
END;
$$ LANGUAGE plpgsql;

