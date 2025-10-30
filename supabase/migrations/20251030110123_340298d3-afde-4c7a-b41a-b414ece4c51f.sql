-- Create health log table
CREATE TABLE IF NOT EXISTS public.fluxa_health_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  component text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fluxa_health_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view health logs
CREATE POLICY "Only admins can view health logs"
ON public.fluxa_health_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert health logs
CREATE POLICY "Service role can insert health logs"
ON public.fluxa_health_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_health_log_timestamp ON public.fluxa_health_log(timestamp DESC);