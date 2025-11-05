-- Create data monitor log table
CREATE TABLE IF NOT EXISTS public.data_monitor_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_type TEXT NOT NULL,
  entity_id UUID REFERENCES public.fan_entities(id),
  entity_name TEXT,
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  auto_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.data_monitor_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view logs
CREATE POLICY "Only admins can view monitor logs" 
ON public.data_monitor_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for service role to insert logs
CREATE POLICY "Service role can insert monitor logs" 
ON public.data_monitor_log 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_data_monitor_log_timestamp ON public.data_monitor_log(timestamp DESC);
CREATE INDEX idx_data_monitor_log_entity ON public.data_monitor_log(entity_id);
CREATE INDEX idx_data_monitor_log_severity ON public.data_monitor_log(severity);

COMMENT ON TABLE public.data_monitor_log IS 'Logs all data consistency checks and auto-corrections performed by the monitoring system';