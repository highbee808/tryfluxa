-- Add search_path to update_fan_updated_at function for security
CREATE OR REPLACE FUNCTION public.update_fan_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;