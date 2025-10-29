-- Create feedback table for MVP testers
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  page_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (public MVP testing)
CREATE POLICY "Anyone can submit feedback"
  ON public.feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can view all feedback (for admin panel)
CREATE POLICY "Authenticated users can view all feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index on created_at for faster sorting
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at DESC);