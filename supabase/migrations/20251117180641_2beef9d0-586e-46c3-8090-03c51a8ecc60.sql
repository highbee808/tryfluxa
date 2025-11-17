-- Enable realtime for match_results table
ALTER TABLE public.match_results REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_results;