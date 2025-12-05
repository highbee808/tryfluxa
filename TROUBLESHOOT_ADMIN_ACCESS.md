# Troubleshoot: Admin Access Required

If you're still seeing "Admin access required" after adding the role, follow these steps:

## Step 1: Get Your User ID

**In browser console (F12), run:**

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Your User ID:', user.id);
console.log('Your Email:', user.email);
```

**Copy the User ID** (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`)

---

## Step 2: Check if Admin Role Exists

**In Supabase Dashboard → SQL Editor, run:**

```sql
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID from Step 1
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.user_id = 'YOUR_USER_ID_HERE';
```

**Expected Result:**
- If you see a row with `role = 'admin'` → Role exists, proceed to Step 4
- If you see no rows → Role doesn't exist, proceed to Step 3

---

## Step 3: Add Admin Role

**In Supabase Dashboard → SQL Editor, run:**

```sql
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING
RETURNING *;
```

**Expected Result:**
- Should return 1 row with your user_id and role='admin'
- If it returns 0 rows, the role already exists (check Step 2 again)

---

## Step 4: Clear Session and Refresh

After adding the admin role:

1. **Sign out and sign back in:**
   ```javascript
   // In browser console
   await supabase.auth.signOut();
   // Then refresh page and sign in again
   ```

2. **OR clear localStorage and refresh:**
   ```javascript
   // In browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Then navigate to `/admin`** - should work now!

---

## Step 5: Verify Admin Check Works

**In browser console, test the admin check:**

```javascript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  console.log('❌ Not logged in');
} else {
  const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });
  
  console.log('User ID:', user.id);
  console.log('Has admin role?', hasAdminRole);
  console.log('Error:', error);
  
  if (hasAdminRole) {
    console.log('✅ Admin access confirmed!');
  } else {
    console.log('❌ Admin role not found - check Step 3');
  }
}
```

---

## Common Issues

### Issue: "Admin access required" persists after adding role

**Solutions:**
1. **Make sure you used the correct User ID** - check Step 1
2. **Sign out and sign back in** - session might be cached
3. **Clear browser cache** - Ctrl+Shift+Delete → Clear cached images and files
4. **Check RLS policies** - make sure `has_role` function is accessible

### Issue: SQL insert returns 0 rows

This means the role already exists. Check Step 2 to verify.

### Issue: Can't find user in auth.users

**Check if user exists:**
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'your-email@example.com';
```

If no user found, you need to sign up first via the app.

---

## Quick Fix Script

**Run this complete script in SQL Editor** (replace email with yours):

```sql
DO $$
DECLARE
  user_uuid UUID;
  role_exists BOOLEAN;
BEGIN
  -- Find user by email (replace with your email)
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'ibrahimskartel19@example.com'; -- REPLACE WITH YOUR EMAIL
  
  IF user_uuid IS NOT NULL THEN
    -- Check if role already exists
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = user_uuid AND role = 'admin'
    ) INTO role_exists;
    
    IF NOT role_exists THEN
      -- Add admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (user_uuid, 'admin');
      RAISE NOTICE '✅ Admin role added for user: %', user_uuid;
    ELSE
      RAISE NOTICE 'ℹ️ Admin role already exists for user: %', user_uuid;
    END IF;
  ELSE
    RAISE NOTICE '❌ User not found. Make sure you are signed up.';
  END IF;
END $$;

-- Verify
SELECT 
  ur.user_id,
  u.email,
  ur.role
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

---

## After Fixing

1. **Sign out** (or clear session)
2. **Sign back in**
3. **Navigate to `/admin`**
4. **Should work!**

