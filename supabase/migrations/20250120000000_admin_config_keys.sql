-- ============================================
-- PHASE 8: ADMIN CONFIG API - New Config Keys
-- ============================================
-- 
-- Purpose: Add new configuration keys for admin-controlled settings
-- Features:
-- - Sports mode toggle and league configuration
-- - Ingestion refresh interval (stored only, no scheduler wiring)
-- 
-- Migration: 20250120000000_admin_config_keys.sql
-- Date: 2025-01-20
-- ============================================

-- ============================================
-- STEP 1: Add sports mode config keys
-- ============================================

INSERT INTO public.content_config (config_key, config_value, description, is_active) VALUES
  ('sports.enabled', 'true'::jsonb, 'Enable sports content ingestion'),
  ('sports.leagues', '["nba", "nfl", "epl", "mlb", "nhl"]'::jsonb, 'Active sports leagues for content ingestion')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- STEP 2: Add ingestion interval config
-- ============================================

INSERT INTO public.content_config (config_key, config_value, description, is_active) VALUES
  ('ingestion.refresh_interval_minutes', '60'::jsonb, 'Ingestion refresh interval in minutes (stored config, scheduler uses vercel.json)')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- STEP 3: Add API budget default config
-- ============================================

INSERT INTO public.content_config (config_key, config_value, description, is_active) VALUES
  ('api.default_daily_budget', '100'::jsonb, 'Default daily API call budget per source'),
  ('api.budget_warning_threshold', '0.8'::jsonb, 'Percentage threshold to trigger budget warning (0.0-1.0)')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================
