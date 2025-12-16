-- ============================================
-- Phase 5: Activate Content Source
-- ============================================
-- 
-- Usage: Run this SQL to activate a specific source
-- Replace 'SOURCE_KEY' with: 'tmdb', 'rapidapi-sports', or 'ticketmaster'
-- 
-- Example:
--   UPDATE public.content_sources
--   SET is_active = true, updated_at = now()
--   WHERE source_key = 'tmdb';
-- ============================================

-- Activate TMDB
-- UPDATE public.content_sources
-- SET is_active = true, updated_at = now()
-- WHERE source_key = 'tmdb';

-- Activate RapidAPI Sports
-- UPDATE public.content_sources
-- SET is_active = true, updated_at = now()
-- WHERE source_key = 'rapidapi-sports';

-- Activate Ticketmaster
-- UPDATE public.content_sources
-- SET is_active = true, updated_at = now()
-- WHERE source_key = 'ticketmaster';

-- ============================================
-- Verification Query
-- ============================================
-- SELECT source_key, name, is_active, updated_at
-- FROM content_sources
-- ORDER BY source_key;
