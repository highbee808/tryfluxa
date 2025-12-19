-- ============================================
-- Update RapidAPI Sources: Fix Hosts and Add New Sources
-- ============================================
-- 
-- Purpose: 
-- - Update existing RapidAPI sources with correct host endpoints
-- - Add new RapidAPI sources from user's RapidAPI Hub configuration
-- - Ensure all hosts match the X-RapidAPI-Host headers from RapidAPI
-- 
-- Migration: 20250119000004_update_rapidapi_sources_hosts.sql
-- Date: 2025-01-19
-- ============================================

-- ============================================
-- STEP 1: Update Existing RapidAPI Sources with Correct Hosts
-- ============================================

-- Update NewsAPI RapidAPI host (corrected from newsapi-rapidapi.p.rapidapi.com to news-api14.p.rapidapi.com)
UPDATE public.content_sources
SET 
  api_base_url = 'https://news-api14.p.rapidapi.com',
  updated_at = now()
WHERE source_key = 'newsapi-rapidapi';

-- Mediastack RapidAPI is already correct (mediastack.p.rapidapi.com), no update needed

-- ============================================
-- STEP 2: Add New RapidAPI Sources
-- ============================================

INSERT INTO public.content_sources (source_key, name, api_base_url, is_active, config) VALUES
  -- Webit News Search API
  ('webit-news-search', 'Webit News Search', 'https://webit-news-search.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  
  -- Real-Time Sports News API
  ('real-time-sports-news-api', 'Real-Time Sports News API', 'https://real-time-sports-news-api.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  
  -- Biz News API
  ('biz-news-api', 'Biz News API', 'https://biz-news-api.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  
  -- TheRundown API
  ('therundown', 'TheRundown', 'https://therundown-therundown-v1.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  
  -- Soccer - Sports Open Data
  ('soccer-sports-open-data', 'Soccer - Sports Open Data', 'https://sportsop-soccer-sports-open-data-v1.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  
  -- Games Details API
  ('games-details', 'Games Details', 'https://games-details.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb),
  
  -- Free API Live Football Data
  ('free-api-live-football-data', 'Free API Live Football Data', 'https://free-api-live-football-data.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true}'::jsonb)

ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_base_url = EXCLUDED.api_base_url,
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config,
  updated_at = now();

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all RapidAPI sources have correct hosts:
-- SELECT 
--   source_key, 
--   name, 
--   api_base_url, 
--   is_active, 
--   config->>'uses_rapidapi' as uses_rapidapi 
-- FROM content_sources 
-- WHERE config->>'uses_rapidapi' = 'true' OR api_base_url LIKE '%rapidapi.com%'
-- ORDER BY source_key;


