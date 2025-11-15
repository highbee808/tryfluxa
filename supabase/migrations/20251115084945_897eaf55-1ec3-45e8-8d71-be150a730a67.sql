-- Fix feedback spam by requiring authentication
-- Drop the permissive policy
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;

-- Create new policy requiring authentication with validation
CREATE POLICY "Authenticated users can submit feedback"
ON public.feedback FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  length(feedback_text) BETWEEN 10 AND 1000 AND
  rating BETWEEN 1 AND 5
);