-- Fix 1: Add RLS policies to user_roles table to prevent unauthorized role modifications
-- Only admins can insert, update, or delete roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Restrict feedback table access to admins only
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can view all feedback" ON public.feedback;

-- Create admin-only policy for viewing feedback
CREATE POLICY "Only admins can view feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Require authentication for chat message insertion
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.chat_messages;

-- Create authenticated-only policy for inserting chat messages
CREATE POLICY "Authenticated users can insert chat messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also restrict viewing chat messages to authenticated users
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;

CREATE POLICY "Authenticated users can view chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (true);