# How to Add a User as Admin

The app uses a `user_roles` table to manage admin permissions. Here's how to add an admin user:

## Method 1: Via Supabase Dashboard SQL Editor (Recommended)

### Step 1: Get the User's ID

1. **Go to Supabase Dashboard** → Your Project
2. **Go to Authentication** → Users
3. **Find the user** you want to make admin
4. **Copy their User ID** (UUID format)

### Step 2: Add Admin Role

1. **Go to SQL Editor** in Supabase Dashboard
2. **Run this SQL** (replace `USER_ID_HERE` with the actual user ID):

```sql
-- Add admin role to a user
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Example:**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

3. **Click "Run"**

---

## Method 2: Find User by Email First

If you only know the email, first find the user ID:

```sql
-- Find user ID by email
SELECT id, email 
FROM auth.users 
WHERE email = 'user@example.com';
```

Then use that ID in Method 1.

---

## Method 3: Add Yourself as First Admin

If you're logged in and want to add yourself:

1. **Get your user ID from browser console:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Your User ID:', user.id);
   ```

2. **Copy the User ID** from console

3. **Run in Supabase Dashboard SQL Editor:**
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('YOUR_USER_ID_FROM_CONSOLE', 'admin')
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

---

## Verify Admin Access

After adding the admin role:

1. **Refresh your app**
2. **Navigate to `/admin`**
3. **You should now have access!**

---

## Check Existing Admins

To see all current admins:

```sql
SELECT 
  ur.user_id,
  u.email,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

---

## Remove Admin Role

To remove admin access:

```sql
DELETE FROM public.user_roles
WHERE user_id = 'USER_ID_HERE'
AND role = 'admin';
```

---

## Important Notes

- **First Admin:** The first admin must be added via SQL Editor (bypassing RLS)
- **Subsequent Admins:** Can be added by existing admins through the app (if you build an admin management UI)
- **RLS Policies:** Only admins can manage roles through the app, but SQL Editor bypasses RLS
- **Service Role:** You can also use the service role key in code to add admins programmatically

---

## Quick Script: Add Admin by Email

Here's a complete script to add admin by email:

```sql
-- Add admin role by email
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Find user by email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'user@example.com';
  
  -- Add admin role if user exists
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role added for user: %', user_uuid;
  ELSE
    RAISE NOTICE 'User not found with email: user@example.com';
  END IF;
END $$;
```

Replace `'user@example.com'` with the actual email address.

