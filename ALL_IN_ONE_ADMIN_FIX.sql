-- ALL-IN-ONE ADMIN FIX
-- Run this in Supabase Dashboard → SQL Editor
-- Replace 'YOUR_EMAIL_HERE' with your actual email

-- Step 0: Create app_role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 0.5: Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,  -- Start as TEXT, will convert to enum
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Convert role column to app_role enum if it's currently TEXT
DO $$ 
BEGIN
  -- Check if column is TEXT and convert to enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles' 
    AND column_name = 'role'
    AND data_type = 'text'
  ) THEN
    -- Convert existing TEXT values to enum
    ALTER TABLE public.user_roles 
    ALTER COLUMN role TYPE public.app_role 
    USING role::public.app_role;
  END IF;
END $$;

-- Step 1: Ensure has_role function exists and works
-- Handle both TEXT and app_role types
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
      AND role::text = _role::text
  )
$$;

-- Step 2: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO service_role;

-- Step 3: Fix RLS policy to allow users to read their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: Add admin role by email (REPLACE YOUR_EMAIL_HERE)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Replace with your email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'YOUR_EMAIL_HERE';
  
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Admin role added for user: %', user_uuid;
  ELSE
    RAISE NOTICE '❌ User not found. Check email address.';
  END IF;
END $$;

-- Step 5: Verify everything works
SELECT 
  'Function exists' as check_type,
  EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'has_role' 
    AND pronamespace = 'public'::regnamespace
  ) as result
UNION ALL
SELECT 
  'Admin role added' as check_type,
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN auth.users u ON ur.user_id = u.id
    WHERE ur.role = 'admin'
    AND u.email = 'YOUR_EMAIL_HERE'
  ) as result
UNION ALL
SELECT 
  'RLS policy exists' as check_type,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_roles'
    AND policyname = 'Users can view own roles'
  ) as result;

-- Step 6: Show all admins
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

