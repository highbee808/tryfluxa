-- Fix: Ensure has_role function exists and works correctly
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'has_role';

-- Step 2: Recreate has_role function if needed
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 3: Grant execute permission
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

-- Step 4: Test the function (replace YOUR_USER_ID with actual user ID)
-- SELECT public.has_role('YOUR_USER_ID'::UUID, 'admin'::public.app_role);

