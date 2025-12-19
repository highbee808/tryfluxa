-- ============================================
-- PHASE 9: Content Pipeline Observability
-- Add skipped_reason and content_source_health
-- ============================================
-- 
-- Purpose: Enable operational visibility for content ingestion
-- Features:
-- - Track why content runs were skipped
-- - Per-source health metrics for monitoring
--
-- Migration: 20250121000000_add_observability_fields.sql
-- Date: 2025-01-21
-- ============================================

-- ============================================
-- STEP 1: Add skipped_reason to content_runs
-- ============================================
-- Tracks why a run was skipped (cadence, disabled, budget_exceeded, no_data)

ALTER TABLE public.content_runs
ADD COLUMN IF NOT EXISTS skipped_reason TEXT;

-- Index for querying skipped runs efficiently
CREATE INDEX IF NOT EXISTS idx_content_runs_skipped_reason 
  ON public.content_runs(skipped_reason) 
  WHERE skipped_reason IS NOT NULL;

-- Document the column
COMMENT ON COLUMN public.content_runs.skipped_reason IS 
  'Reason for skipping: cadence, disabled, budget_exceeded, no_data, error';

-- ============================================
-- STEP 2: Create content_source_health table
-- ============================================
-- Tracks per-source health metrics for admin observability

CREATE TABLE IF NOT EXISTS public.content_source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  last_success_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  last_error_reason TEXT,
  items_generated_last_run INTEGER DEFAULT 0,
  last_run_id UUID REFERENCES public.content_runs(id) ON DELETE SET NULL,
  consecutive_failures INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id)
);

-- Indexes for health queries
CREATE INDEX IF NOT EXISTS idx_content_source_health_source_id 
  ON public.content_source_health(source_id);
CREATE INDEX IF NOT EXISTS idx_content_source_health_last_success 
  ON public.content_source_health(last_success_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_source_health_last_error 
  ON public.content_source_health(last_error_at DESC);

-- ============================================
-- STEP 3: RLS policies for content_source_health
-- ============================================

ALTER TABLE public.content_source_health ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (idempotent)
DROP POLICY IF EXISTS "Service role can manage content_source_health" ON public.content_source_health;

-- Service role full access
CREATE POLICY "Service role can manage content_source_health"
  ON public.content_source_health FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- Migration Complete
-- ============================================
