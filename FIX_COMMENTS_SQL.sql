-- ============================================
-- FIX COMMENTS FUNCTIONALITY
-- ============================================
-- Run this in Supabase SQL Editor to fix comment issues

-- First, verify the current schema
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'article_comments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'article_comments';

-- If comments are still not working, try this:
-- 1. Ensure the INSERT policy allows the user_id to be set correctly
-- 2. The policy requires: auth.uid() = user_id AND content IS NOT NULL AND content <> ''

-- Update the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.article_comments;

CREATE POLICY "Authenticated users can create comments"
ON public.article_comments FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = user_id 
    AND content IS NOT NULL 
    AND LENGTH(TRIM(content)) > 0
    AND article_id IS NOT NULL
);

-- Also ensure users can read their own comments and all public comments
DROP POLICY IF EXISTS "Anyone can view comments" ON public.article_comments;

CREATE POLICY "Anyone can view comments"
ON public.article_comments FOR SELECT
USING (true);

-- Verify the foreign key constraint exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'article_comments';

-- Test query to verify a comment can be inserted (replace with actual values)
-- This is just for testing - don't run in production without proper values
/*
INSERT INTO public.article_comments (article_id, user_id, content)
VALUES (
    'YOUR_GIST_ID_HERE'::uuid,
    auth.uid(),
    'Test comment'
)
RETURNING *;
*/

