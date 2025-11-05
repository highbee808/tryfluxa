-- Enable realtime for fan_entities table
ALTER TABLE public.fan_entities REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fan_entities;