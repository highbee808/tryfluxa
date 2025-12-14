-- Delete old gists from the database (2+ years old)
-- This script removes gists that were created more than 2 years ago
-- Run this in Supabase SQL Editor or via CLI

-- First, let's see how many old gists exist
SELECT 
  COUNT(*) as old_gist_count,
  MIN(created_at) as oldest_gist,
  MAX(created_at) as newest_old_gist
FROM public.gists
WHERE created_at < NOW() - INTERVAL '2 years';

-- Delete old gists (gists created more than 2 years ago)
DELETE FROM public.gists
WHERE created_at < NOW() - INTERVAL '2 years';

-- Verify deletion
SELECT 
  COUNT(*) as remaining_gist_count,
  MIN(created_at) as oldest_remaining_gist,
  MAX(created_at) as newest_gist
FROM public.gists;

-- Optional: If you want to be more conservative and keep at least some recent content
-- Use this instead to delete only very old gists (3+ years):
-- DELETE FROM public.gists
-- WHERE created_at < NOW() - INTERVAL '3 years';
