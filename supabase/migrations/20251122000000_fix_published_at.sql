-- Fix: Add missing published_at column to gists table
-- This migration fixes the issue where gists table exists but published_at column is missing

-- Add published_at column if it doesn't exist
ALTER TABLE public.gists 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing rows that have NULL published_at
UPDATE public.gists 
SET published_at = COALESCE(created_at, now()) 
WHERE published_at IS NULL;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_gists_published_at ON public.gists(published_at DESC);

-- Create composite index for status + published_at queries
CREATE INDEX IF NOT EXISTS idx_gists_status_published ON public.gists(status, published_at DESC);

