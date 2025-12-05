-- ============================================
-- UPDATE CRON SCHEDULE TO RUN EVERY 10 MINUTES
-- ============================================
-- Copy and paste this into Supabase SQL Editor

-- Remove existing cron job
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

-- Recreate with 10-minute schedule (every 10 minutes)
SELECT cron.schedule(
    'auto-generate-gists-v2',                    -- Job name
    '*/10 * * * *',                              -- Schedule: every 10 minutes
    $$
    SELECT net.http_post(
        url := 'https://vzjyclgrqoyxbbzplkgw.supabase.co/functions/v1/auto-generate-gists-v2',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6anljbGdycW95eGJienBsa2d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzc0NzYwNSwiZXhwIjoyMDc5MzIzNjA1fQ.KoTM6PCXJy81_RdN9wa_Q59DFIWDI3dAgLkcMhJazYA',
            'x-cron-secret', '68DE6BA1ED9113AA26C725EA4C926'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Verify the cron job was updated
SELECT 
    jobid,
    jobname,
    schedule,
    active,
    command
FROM cron.job
WHERE jobname = 'auto-generate-gists-v2';

