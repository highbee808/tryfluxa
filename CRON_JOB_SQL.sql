-- ============================================
-- CRON JOB SETUP FOR auto-generate-gists-v2
-- ============================================
-- Copy and paste this entire block into Supabase SQL Editor
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
-- You can find it in: Supabase Dashboard → Project Settings → API → service_role key

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing cron job if it exists (to avoid duplicates)
DO $$
DECLARE
    job_id bigint;
BEGIN
    SELECT jobid INTO job_id
    FROM cron.job
    WHERE jobname = 'auto-generate-gists-v2';
    
    IF job_id IS NOT NULL THEN
        PERFORM cron.unschedule(job_id);
        RAISE NOTICE 'Removed existing cron job: auto-generate-gists-v2';
    END IF;
END $$;

-- Create the cron job
-- This will call the Edge Function every 30 minutes
-- Schedule format: minute hour day month weekday
-- '*/30 * * * *' = every 30 minutes
SELECT cron.schedule(
    'auto-generate-gists-v2',                    -- Job name
    '*/30 * * * *',                              -- Schedule: every 30 minutes
    $$
    SELECT net.http_post(
        url := 'https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/auto-generate-gists-v2',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
            'x-cron-secret', '68DE6BA1ED9113AA26C725EA4C926'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Verify the cron job was created
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname = 'auto-generate-gists-v2';

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Replace YOUR_SERVICE_ROLE_KEY above with your actual service role key
-- 2. Run this entire SQL block
-- 3. Check the output to verify the cron job was created
-- 4. The job will run every 30 minutes automatically
-- 5. Monitor logs in: Supabase Dashboard → Edge Functions → Logs → auto-generate-gists-v2

