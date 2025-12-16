-- ============================================
-- PHASE 5: Controlled Source Activation
-- Add Missing Content Sources and Set All Inactive
-- ============================================
-- 
-- Purpose: Add missing sources (tmdb, rapidapi-sports, ticketmaster) 
--          and set all sources to inactive for safe activation
-- 
-- Migration: 20250116000000_add_missing_content_sources.sql
-- Date: 2025-01-16
-- ============================================

-- ============================================
-- STEP 1: Add Missing Sources (All Inactive)
-- ============================================
-- Add tmdb, rapidapi-sports, and ticketmaster sources
-- All start with is_active = false for controlled activation

INSERT INTO public.content_sources (source_key, name, api_base_url, is_active, config) VALUES
  ('tmdb', 'The Movie Database', 'https://api.themoviedb.org/3', false, '{"requires_auth": true}'::jsonb),
  ('rapidapi-sports', 'RapidAPI Sports News', 'https://sportspage-feeds.p.rapidapi.com', false, '{"requires_auth": true}'::jsonb),
  ('ticketmaster', 'Ticketmaster Discovery API', 'https://app.ticketmaster.com/discovery/v2', false, '{"requires_auth": true}'::jsonb)
ON CONFLICT (source_key) DO UPDATE SET
  name = EXCLUDED.name,
  api_base_url = EXCLUDED.api_base_url,
  config = EXCLUDED.config,
  updated_at = now();

-- ============================================
-- STEP 2: Set All Sources to Inactive (Safety)
-- ============================================
-- Ensure all sources start inactive for controlled activation
-- Sources will be activated one at a time via manual SQL updates

UPDATE public.content_sources
SET is_active = false, updated_at = now()
WHERE is_active = true;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all sources are inactive:
-- SELECT source_key, name, is_active FROM content_sources ORDER BY source_key;
