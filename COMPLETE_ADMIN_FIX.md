# Complete Admin Access Fix

Since you've tried everything, let's diagnose the exact issue step by step.

## Step 1: Run Diagnostic Script

**Open browser console (F12) and paste this entire script:**

```javascript
(async () => {
  console.log('🔍 COMPLETE ADMIN DIAGNOSTIC\n');
  
  // Get user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ Not logged in');
    return;
  }
  
  console.log('✅ User:', user.email);
  console.log('   ID:', user.id);
  console.log('');
  
  // Check user_roles table
  console.log('1️⃣ Checking user_roles table...');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id);
  
  console.log('   Roles:', roles);
  console.log('   Error:', rolesError);
  console.log('');
  
  // Test has_role function
  console.log('2️⃣ Testing has_role function...');
  const { data: hasAdmin, error: rpcError } = await supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin'
  });
  
  console.log('   Result:', hasAdmin);
  console.log('   Error:', rpcError);
  console.log('');
  
  // Summary
  console.log('📋 SUMMARY:');
  if (roles && roles.find(r => r.role === 'admin')) {
    console.log('   ✅ Admin role EXISTS in database');
  } else {
    console.log('   ❌ Admin role NOT in database');
  }
  
  if (hasAdmin === true) {
    console.log('   ✅ has_role returns TRUE');
  } else {
    console.log('   ❌ has_role returns FALSE or error');
  }
  
  if (rpcError) {
    console.log('\n⚠️  FUNCTION ERROR:', rpcError.message);
    console.log('   → The has_role function might not exist');
    console.log('   → Run FIX_HAS_ROLE_FUNCTION.sql in Supabase Dashboard');
  }
})();
```

**Copy the output and share it with me.**

---

## Step 2: Fix Based on Diagnostic Results

### If "Admin role NOT in database":

**Run this in Supabase Dashboard → SQL Editor:**

```sql
-- Get your user ID first (from Step 1 output)
-- Then run:
INSERT INTO public.user_roles (user_id, role)
VALUES ('YOUR_USER_ID_FROM_STEP_1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING
RETURNING *;
```

### If "has_role function error" or function doesn't exist:

**Run this in Supabase Dashboard → SQL Editor:**

```sql
-- Recreate has_role function
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;
```

### If "has_role returns FALSE" but role exists:

**This is an RLS policy issue. Run this:**

```sql
-- Check RLS policies on user_roles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_roles';

-- Ensure users can read their own roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);
```

---

## Step 3: Alternative - Bypass RLS Temporarily

If nothing works, temporarily allow service role to insert admin:

**In Supabase Dashboard → SQL Editor:**

```sql
-- Temporarily allow service role to insert (bypasses RLS)
-- This is safe because you're using SQL Editor with service role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING
RETURNING *;
```

---

## Step 4: Test Again

After running the fixes:

1. **Sign out completely:**
   ```javascript
   await supabase.auth.signOut();
   ```

2. **Clear everything:**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Sign in again**

4. **Navigate to `/admin`**

---

## Quick All-in-One Fix

**If you want to try everything at once, run this in SQL Editor:**

```sql
-- Step 1: Ensure has_role function exists
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

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO anon;

-- Step 3: Fix RLS policy
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Step 4: Add admin role (REPLACE YOUR_EMAIL_HERE)
DO $$
DECLARE
  user_uuid UUID;
BEGIN
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'YOUR_EMAIL_HERE';
  
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE '✅ Admin added for: %', user_uuid;
  END IF;
END $$;

-- Step 5: Verify
SELECT 
  ur.user_id,
  u.email,
  ur.role
FROM public.user_roles ur
JOIN auth.users u ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

**Replace `YOUR_EMAIL_HERE` with your actual email address.**

---

## Still Not Working?

Run the diagnostic script from Step 1 and share the complete output. That will tell us exactly what's wrong.

