-- Add new fields to fan_entities table for matches and events
ALTER TABLE public.fan_entities
ADD COLUMN IF NOT EXISTS next_match jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_match jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS upcoming_events jsonb DEFAULT '[]'::jsonb;