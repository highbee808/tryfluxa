-- ============================================
-- FLUXA CONTENT INGESTION SYSTEM - PHASE 1
-- Database Schema Migration
-- ============================================
-- 
-- Purpose: Create production-ready schema for content ingestion system
-- Features:
-- - Multi-source content ingestion (NewsAPI, Guardian, Mediastack, etc.)
-- - Global deduplication via SHA-256 content hashing
-- - Per-user content seen tracking (no repeats)
-- - Admin-controlled configuration
-- - API usage budgeting and tracking
-- - Ingestion run observability
-- - Content categorization
--
-- Migration: 20250115000000_content_ingestion_system.sql
-- Date: 2025-01-15
-- ============================================

-- ============================================
-- STEP 1: Create content_sources table
-- ============================================
-- Registry of API endpoints that provide content

CREATE TABLE IF NOT EXISTS public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  api_base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  rate_limit_per_hour INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for content_sources
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_sources_source_key ON public.content_sources(source_key);
CREATE INDEX IF NOT EXISTS idx_content_sources_is_active ON public.content_sources(is_active);

-- ============================================
-- STEP 2: Create content_categories table
-- ============================================
-- Categorization system for content (many-to-many with content_items)

CREATE TABLE IF NOT EXISTS public.content_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for content_categories
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_categories_name ON public.content_categories(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_categories_slug ON public.content_categories(slug);
CREATE INDEX IF NOT EXISTS idx_content_categories_is_active ON public.content_categories(is_active);

-- ============================================
-- STEP 3: Create content_items table
-- ============================================
-- Core content storage with global deduplication via content_hash
-- 
-- Hash Generation Logic (application-level):
-- normalized_title = normalize(title)  // Derived from raw title, not stored
-- hash_input = normalized_title + "|" + source_key + "|" + truncate_to_hour(published_at)
-- content_hash = SHA-256(hash_input).hexdigest()
--
-- Important Notes:
-- - title stores the raw, original title from the source for display fidelity
-- - Normalization is a derived value computed in the hashing utility only
-- - This allows future normalization algorithm changes without data loss
-- - content_hash enforces global deduplication
-- - external_id is nullable (some sources don't provide stable IDs) and used only for updates, NOT deduplication

CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  external_id TEXT,
  content_hash TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  url TEXT,
  excerpt TEXT,
  published_at TIMESTAMPTZ,
  image_url TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for content_items
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_items_content_hash ON public.content_items(content_hash);
CREATE INDEX IF NOT EXISTS idx_content_items_source_id ON public.content_items(source_id);
CREATE INDEX IF NOT EXISTS idx_content_items_external_id ON public.content_items(external_id);
CREATE INDEX IF NOT EXISTS idx_content_items_published_at ON public.content_items(published_at);
CREATE INDEX IF NOT EXISTS idx_content_items_source_external ON public.content_items(source_id, external_id);

-- ============================================
-- STEP 4: Create content_item_categories table
-- ============================================
-- Many-to-many relationship between content_items and content_categories

CREATE TABLE IF NOT EXISTS public.content_item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.content_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_item_id, category_id)
);

-- Indexes for content_item_categories
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_item_categories_unique ON public.content_item_categories(content_item_id, category_id);
CREATE INDEX IF NOT EXISTS idx_content_item_categories_category_id ON public.content_item_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_content_item_categories_content_item_id ON public.content_item_categories(content_item_id);

-- ============================================
-- STEP 5: Create content_runs table
-- ============================================
-- Track ingestion runs for observability (when, what source, results)

CREATE TABLE IF NOT EXISTS public.content_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  items_fetched INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_skipped INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for content_runs
CREATE INDEX IF NOT EXISTS idx_content_runs_source_id ON public.content_runs(source_id);
CREATE INDEX IF NOT EXISTS idx_content_runs_status ON public.content_runs(status);
CREATE INDEX IF NOT EXISTS idx_content_runs_started_at ON public.content_runs(started_at);
CREATE INDEX IF NOT EXISTS idx_content_runs_source_started ON public.content_runs(source_id, started_at);

-- ============================================
-- STEP 6: Create user_content_seen table
-- ============================================
-- Per-user tracking to prevent showing same content twice
-- Composite primary key: (user_id, content_item_id)

CREATE TABLE IF NOT EXISTS public.user_content_seen (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_item_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  seen_at TIMESTAMPTZ DEFAULT now(),
  interacted BOOLEAN DEFAULT false,
  interacted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, content_item_id)
);

-- Indexes for user_content_seen
-- Note: Primary key already indexes (user_id, content_item_id)
CREATE INDEX IF NOT EXISTS idx_user_content_seen_user_id ON public.user_content_seen(user_id);
CREATE INDEX IF NOT EXISTS idx_user_content_seen_seen_at ON public.user_content_seen(seen_at);

-- ============================================
-- STEP 7: Create content_config table
-- ============================================
-- Admin-controlled configuration (no hard-coded values)

CREATE TABLE IF NOT EXISTS public.content_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for content_config
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_config_config_key ON public.content_config(config_key);
CREATE INDEX IF NOT EXISTS idx_content_config_is_active ON public.content_config(is_active);

-- ============================================
-- STEP 8: Create api_usage_budget table
-- ============================================
-- Track API usage and budgets per source

CREATE TABLE IF NOT EXISTS public.api_usage_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE RESTRICT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  budget_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for api_usage_budget
CREATE INDEX IF NOT EXISTS idx_api_usage_budget_source_id ON public.api_usage_budget(source_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_budget_period ON public.api_usage_budget(source_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_api_usage_budget_period_start ON public.api_usage_budget(period_start);
CREATE INDEX IF NOT EXISTS idx_api_usage_budget_period_end ON public.api_usage_budget(period_end);

-- ============================================
-- STEP 9: Seed content_sources
-- ============================================

INSERT INTO public.content_sources (source_key, name, api_base_url, is_active, config) VALUES
  ('newsapi', 'NewsAPI', 'https://newsapi.org/v2', true, '{"requires_auth": true}'::jsonb),
  ('guardian', 'The Guardian API', 'https://content.guardianapis.com', true, '{"requires_auth": true}'::jsonb),
  ('mediastack', 'Mediastack', 'http://api.mediastack.com/v1', true, '{"requires_auth": true}'::jsonb)
ON CONFLICT (source_key) DO NOTHING;

-- ============================================
-- STEP 10: Seed content_categories
-- ============================================

INSERT INTO public.content_categories (name, slug, description) VALUES
  ('Technology', 'technology', 'Tech news and innovations'),
  ('Sports', 'sports', 'Sports news and updates'),
  ('Entertainment', 'entertainment', 'Entertainment industry news'),
  ('Politics', 'politics', 'Political news and analysis'),
  ('Business', 'business', 'Business and financial news'),
  ('Science', 'science', 'Scientific discoveries and research'),
  ('Health', 'health', 'Health and wellness news'),
  ('World', 'world', 'International news')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 11: Seed content_config
-- ============================================

INSERT INTO public.content_config (config_key, config_value, description) VALUES
  ('ingestion.enabled', 'true'::jsonb, 'Enable/disable content ingestion'),
  ('deduplication.hash_algorithm', '"sha256"'::jsonb, 'Hash algorithm for content deduplication'),
  ('ingestion.max_items_per_run', '100'::jsonb, 'Maximum items to fetch per ingestion run'),
  ('ingestion.default_categories', '["Technology", "Sports", "Entertainment"]'::jsonb, 'Default categories for content')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- ============================================
-- STEP 12: Enable RLS (Row Level Security)
-- ============================================
-- Note: Detailed RLS policies can be added in a follow-up migration.
-- For Phase 1, basic service role access is sufficient.
-- Users will be able to access their own records via application logic.

ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_seen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_budget ENABLE ROW LEVEL SECURITY;

-- Basic policies for service role access (all tables)
-- Users will only access via application logic in Phase 2

DROP POLICY IF EXISTS "Service role can manage content_sources" ON public.content_sources;
CREATE POLICY "Service role can manage content_sources"
  ON public.content_sources FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage content_categories" ON public.content_categories;
CREATE POLICY "Service role can manage content_categories"
  ON public.content_categories FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage content_items" ON public.content_items;
CREATE POLICY "Service role can manage content_items"
  ON public.content_items FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage content_item_categories" ON public.content_item_categories;
CREATE POLICY "Service role can manage content_item_categories"
  ON public.content_item_categories FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage content_runs" ON public.content_runs;
CREATE POLICY "Service role can manage content_runs"
  ON public.content_runs FOR ALL
  USING (auth.role() = 'service_role');

-- Users can only see their own seen records
DROP POLICY IF EXISTS "Users can view their own content_seen" ON public.user_content_seen;
CREATE POLICY "Users can view their own content_seen"
  ON public.user_content_seen FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own content_seen" ON public.user_content_seen;
CREATE POLICY "Users can insert their own content_seen"
  ON public.user_content_seen FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage user_content_seen" ON public.user_content_seen;
CREATE POLICY "Service role can manage user_content_seen"
  ON public.user_content_seen FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage content_config" ON public.content_config;
CREATE POLICY "Service role can manage content_config"
  ON public.content_config FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage api_usage_budget" ON public.api_usage_budget;
CREATE POLICY "Service role can manage api_usage_budget"
  ON public.api_usage_budget FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Migration Complete
-- ============================================