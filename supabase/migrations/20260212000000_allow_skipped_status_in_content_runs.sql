-- Add 'skipped' to the content_runs status CHECK constraint.
-- The ingestion runner creates 'skipped' runs for cadence checks,
-- but the original constraint only allowed: running, completed, failed, cancelled.
-- This caused silent INSERT failures and empty runIds in the cron response.

ALTER TABLE public.content_runs
  DROP CONSTRAINT IF EXISTS content_runs_status_check;

ALTER TABLE public.content_runs
  ADD CONSTRAINT content_runs_status_check
  CHECK (status IN ('running', 'completed', 'failed', 'cancelled', 'skipped'));
