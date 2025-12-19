-- ============================================
-- AI SUMMARY ENRICHMENT - DATABASE MIGRATION
-- ============================================
-- 
-- Purpose: Add AI summary fields to content_items table
-- for storing OpenAI-generated article summaries
--
-- Migration: 20251220000000_add_ai_summary_fields.sql
-- Date: 2025-12-20
-- ============================================

-- Add AI summary columns to content_items
-- All columns are nullable to preserve existing data
ALTER TABLE public.content_items
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_model TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_summary_length INTEGER;

-- Add index on ai_summary_generated_at for observability queries
CREATE INDEX IF NOT EXISTS idx_content_items_ai_summary_generated_at 
  ON public.content_items(ai_summary_generated_at)
  WHERE ai_summary_generated_at IS NOT NULL;

-- Add partial index for items without summaries (for backfill queries)
CREATE INDEX IF NOT EXISTS idx_content_items_missing_ai_summary
  ON public.content_items(created_at)
  WHERE ai_summary IS NULL;

-- ============================================
-- Migration Complete
-- ============================================
