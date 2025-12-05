-- Quick script to add admin user
-- Replace 'USER_EMAIL_HERE' with the actual email address

DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'USER_EMAIL_HERE';
  
  -- Add admin role if user exists
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE '✅ Admin role added for user: %', user_uuid;
  ELSE
    RAISE NOTICE '❌ User not found with email: USER_EMAIL_HERE';
  END IF;
END $$;

-- Verify the admin was added
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

