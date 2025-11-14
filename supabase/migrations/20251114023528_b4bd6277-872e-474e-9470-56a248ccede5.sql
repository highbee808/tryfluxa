-- Drop any views with security_definer property
-- This fixes the security definer view warning from the linter

DROP VIEW IF EXISTS public.user_activity_feed;