-- ============================================
-- Add NewsX (RapidAPI) Content Source
-- ============================================
-- 
-- Purpose: Register NewsX as a content source in the admin-controlled pipeline
-- 
-- Migration: 20250120000000_add_newsx_source.sql
-- Date: 2025-01-20
-- ============================================

-- ============================================
-- Add NewsX Source (Active)
-- ============================================
INSERT INTO public.content_sources (source_key, name, api_base_url, is_active, config) VALUES
  ('newsx', 'NewsX', 'https://newsx.p.rapidapi.com', true, '{"requires_auth": true, "uses_rapidapi": true, "host": "newsx.p.rapidapi.com"}'::jsonb)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_base_url = EXCLUDED.api_base_url,
  is_active = EXCLUDED.is_active,
  config = EXCLUDED.config,
  updated_at = now();

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify NewsX is registered:
-- SELECT source_key, name, is_active, config->>'uses_rapidapi' as uses_rapidapi, config->>'host' as host
-- FROM content_sources 
-- WHERE source_key = 'newsx';
