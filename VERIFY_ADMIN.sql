-- Step 1: Check if you're logged in and get your user ID
-- Run this in browser console first:
-- const { data: { user } } = await supabase.auth.getUser(); console.log('Your User ID:', user.id);

-- Step 2: Check if admin role exists for a specific user
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from Step 1
SELECT 
  ur.id,
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.user_id = 'YOUR_USER_ID_HERE';

-- Step 3: Check all admins
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin'
ORDER BY ur.created_at DESC;

-- Step 4: If no admin role found, add it (replace YOUR_USER_ID_HERE)
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING
RETURNING *;

