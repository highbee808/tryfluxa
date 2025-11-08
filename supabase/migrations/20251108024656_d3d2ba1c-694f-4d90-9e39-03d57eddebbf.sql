-- Fix SECURITY DEFINER function missing search_path
-- This addresses security finding: notify_search_path

-- Drop and recreate notify_followers_new_gist with proper search_path
DROP FUNCTION IF EXISTS public.notify_followers_new_gist() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_followers_new_gist()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if gist is published and has a topic
  IF NEW.status = 'published' AND NEW.topic IS NOT NULL THEN
    -- Insert notifications for all users following entities related to this topic
    INSERT INTO public.notifications (user_id, type, title, message, gist_id, entity_name, created_at)
    SELECT DISTINCT 
      ff.user_id,
      'new_gist',
      'New gist from Fluxa',
      'Hey bestie 👀 ' || NEW.headline || ' — I got the gist 💅',
      NEW.id,
      NEW.topic,
      now()
    FROM public.fan_follows ff
    JOIN public.fan_entities fe ON ff.entity_id = fe.id
    WHERE LOWER(fe.name) = LOWER(NEW.topic) 
       OR LOWER(NEW.topic) LIKE '%' || LOWER(fe.name) || '%';
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_new_gist ON public.gists;
CREATE TRIGGER trigger_notify_new_gist
AFTER INSERT OR UPDATE ON public.gists
FOR EACH ROW
EXECUTE FUNCTION public.notify_followers_new_gist();

-- Fix anonymous thread creation
-- This addresses security finding: anon_threads

-- Make user_id required (not nullable)
ALTER TABLE public.fanbase_threads 
ALTER COLUMN user_id SET NOT NULL;

-- Drop and recreate INSERT policy to require authenticated user
DROP POLICY IF EXISTS "Authenticated users can insert threads" ON public.fanbase_threads;
CREATE POLICY "Authenticated users can insert threads"
  ON public.fanbase_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update UPDATE policy to remove NULL check
DROP POLICY IF EXISTS "Users can update own threads" ON public.fanbase_threads;
CREATE POLICY "Users can update own threads"
  ON public.fanbase_threads
  FOR UPDATE
  USING (auth.uid() = user_id);