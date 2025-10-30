-- Fix function search path for update_fluxa_memory_updated_at
DROP FUNCTION IF EXISTS update_fluxa_memory_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_fluxa_memory_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_fluxa_memory_updated_at
BEFORE UPDATE ON public.fluxa_memory
FOR EACH ROW
EXECUTE FUNCTION update_fluxa_memory_updated_at();