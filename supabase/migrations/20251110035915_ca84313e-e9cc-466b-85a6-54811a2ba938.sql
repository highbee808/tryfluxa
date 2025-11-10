-- Fix all remaining critical security and functional issues

-- 1. Add DELETE policy to profiles table (GDPR compliance)
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = user_id);

-- 2. Add CASCADE delete from auth.users to profiles (clean up orphaned data)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey,
ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 3. Make user_id NOT NULL on profiles (prevent orphaned records)
ALTER TABLE profiles 
ALTER COLUMN user_id SET NOT NULL;