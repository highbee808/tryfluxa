-- SIMPLE ADMIN FIX - Run this instead
-- Replace 'YOUR_EMAIL_HERE' with your actual email

-- Step 1: Create enum type
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create table with TEXT first, then convert
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.user_roles 
    ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Step 3: Convert role column to enum if it's TEXT
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles' 
    AND column_name = 'role'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE public.user_roles 
    ALTER COLUMN role TYPE public.app_role 
    USING role::public.app_role;
  END IF;
END $$;

-- Step 4: Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create has_role function (using text comparison to avoid type issues)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role::text
  );
END;
$$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

-- Step 7: Create RLS policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Step 8: Add admin role (REPLACE YOUR_EMAIL_HERE)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'YOUR_EMAIL_HERE';
  
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin'::public.app_role;
    
    RAISE NOTICE '✅ Admin role added for: %', user_uuid;
  ELSE
    RAISE NOTICE '❌ User not found';
  END IF;
END $$;

-- Step 9: Verify (removed created_at since it might not exist)
SELECT 
  ur.user_id,
  u.email,
  ur.role
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role::text = 'admin'
ORDER BY u.created_at DESC;

