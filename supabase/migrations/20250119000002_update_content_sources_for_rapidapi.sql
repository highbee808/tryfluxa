-- ============================================
-- Update Content Sources: Remove Guardian, Add RapidAPI Adapters
-- ============================================
-- 
-- Purpose: 
-- - Deactivate Guardian and expired adapters (old mediastack, old newsapi)
-- - Add new RapidAPI-based adapters (mediastack-rapidapi, newsapi-rapidapi)
-- - Prioritize RapidAPI adapters
-- 
-- Migration: 20250119000002_update_content_sources_for_rapidapi.sql
-- Date: 2025-01-19
-- ============================================

-- ============================================
-- STEP 1: Deactivate Expired/Unsupported Adapters
-- ============================================
UPDATE public.content_sources
SET is_active = false, updated_at = now()
WHERE source_key IN ('guardian', 'mediastack', 'newsapi');

-- ============================================
-- STEP 2: Add RapidAPI Adapters (Active)
-- ============================================
INSERT INTO public.content_sources (source_key, name, api_base_url, is_active, config) VALUES
  ('mediastack-rapidapi', 'Mediastack (RapidAPI)', 'https://mediastack.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  ('newsapi-rapidapi', 'NewsAPI (RapidAPI)', 'https://newsapi-rapidapi.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_base_url = EXCLUDED.api_base_url,
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config,
  updated_at = now();

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify RapidAPI adapters are active and Guardian is inactive:
-- SELECT source_key, name, is_active, config->>'uses_rapidapi' as uses_rapidapi 
-- FROM content_sources 
-- ORDER BY 
--   CASE WHEN config->>'uses_rapidapi' = 'true' THEN 0 ELSE 1 END,
--   source_key;
