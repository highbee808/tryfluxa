-- ============================================
-- Disable Sources Without Adapters
-- ============================================
-- 
-- Purpose: Disable sources that don't have adapter implementations yet
--          to prevent "Adapter not found" errors in Admin UI
-- 
-- Migration: 20250120000001_disable_sources_without_adapters.sql
-- Date: 2025-01-20
-- ============================================

-- Disable sources that don't have adapters implemented yet
UPDATE public.content_sources
SET 
  is_active = false,
  updated_at = now()
WHERE source_key IN (
  'biz-news-api',
  'webit-news-search',
  'real-time-sports-news-api',
  'therundown',
  'soccer-sports-open-data',
  'games-details',
  'free-api-live-football-data'
)
AND is_active = true;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify sources without adapters are disabled:
-- SELECT source_key, name, is_active 
-- FROM content_sources 
-- WHERE source_key IN ('biz-news-api', 'webit-news-search', 'real-time-sports-news-api', 'therundown', 'soccer-sports-open-data', 'games-details', 'free-api-live-football-data')
-- ORDER BY source_key;
