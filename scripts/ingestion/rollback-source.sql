-- ============================================
-- Phase 5: Rollback Content Source
-- ============================================
-- 
-- Usage: Run this SQL to deactivate a source (instant rollback)
-- Replace 'SOURCE_KEY' with the source to disable
-- ============================================

-- Deactivate a specific source
-- UPDATE public.content_sources
-- SET is_active = false, updated_at = now()
-- WHERE source_key = 'SOURCE_KEY';

-- Deactivate all sources (emergency rollback)
-- UPDATE public.content_sources
-- SET is_active = false, updated_at = now();

-- ============================================
-- Verification Query
-- ============================================
-- SELECT source_key, name, is_active, updated_at
-- FROM content_sources
-- ORDER BY source_key;
