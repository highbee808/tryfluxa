-- Clear all existing gists from the database
-- This script removes ALL gists to start fresh
-- ⚠️ WARNING: This will delete ALL content - use with caution!
-- Run this in Supabase SQL Editor or via CLI

-- First, let's see how many gists exist
SELECT 
  COUNT(*) as total_gist_count,
  MIN(created_at) as oldest_gist,
  MAX(created_at) as newest_gist
FROM public.gists;

-- Delete ALL gists from the database
DELETE FROM public.gists;

-- Verify deletion - should return 0
SELECT 
  COUNT(*) as remaining_gist_count
FROM public.gists;

-- Optional: Reset any sequences if needed
-- ALTER SEQUENCE IF EXISTS public.gists_id_seq RESTART WITH 1;
