-- ============================================
-- Phase 5: Verification Queries for Ingestion
-- ============================================
-- 
-- Use these queries to verify ingestion results after activating a source
-- Replace 'SOURCE_KEY' with the source you're verifying (e.g., 'tmdb')
-- ============================================

-- ============================================
-- 1. Check Latest Run for a Source
-- ============================================
-- Replace 'tmdb' with your source_key
SELECT 
  cs.source_key,
  cs.name,
  cr.status,
  cr.items_fetched,
  cr.items_created,
  cr.items_skipped,
  cr.items_updated,
  cr.started_at,
  cr.completed_at,
  cr.error_message
FROM content_runs cr
JOIN content_sources cs ON cr.source_id = cs.id
WHERE cs.source_key = 'tmdb'  -- Change this
ORDER BY cr.started_at DESC
LIMIT 1;

-- ============================================
-- 2. Check Items Created for a Source
-- ============================================
SELECT 
  cs.source_key,
  cs.name,
  COUNT(ci.id) as item_count,
  MIN(ci.created_at) as first_item,
  MAX(ci.created_at) as latest_item
FROM content_sources cs
LEFT JOIN content_items ci ON cs.id = ci.source_id
WHERE cs.source_key = 'tmdb'  -- Change this
GROUP BY cs.id, cs.source_key, cs.name;

-- ============================================
-- 3. Latest Runs Per Source (All Sources)
-- ============================================
SELECT 
  cs.source_key,
  cs.name,
  cr.status,
  cr.items_fetched,
  cr.items_created,
  cr.items_skipped,
  cr.items_updated,
  cr.started_at,
  cr.completed_at,
  cr.error_message
FROM content_runs cr
JOIN content_sources cs ON cr.source_id = cs.id
WHERE cr.started_at >= NOW() - INTERVAL '24 hours'
ORDER BY cr.started_at DESC;

-- ============================================
-- 4. Total Items Per Source (All Sources)
-- ============================================
SELECT 
  cs.source_key,
  cs.name,
  cs.is_active,
  COUNT(ci.id) as total_items,
  COUNT(CASE WHEN ci.created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as items_last_24h,
  MIN(ci.created_at) as first_item,
  MAX(ci.created_at) as latest_item
FROM content_sources cs
LEFT JOIN content_items ci ON cs.id = ci.source_id
GROUP BY cs.id, cs.source_key, cs.name, cs.is_active
ORDER BY cs.source_key;

-- ============================================
-- 5. Source Activity Summary (Last 7 Days)
-- ============================================
SELECT 
  cs.source_key,
  cs.is_active,
  COUNT(DISTINCT cr.id) as total_runs,
  COUNT(DISTINCT CASE WHEN cr.status = 'success' THEN cr.id END) as successful_runs,
  COUNT(DISTINCT CASE WHEN cr.status = 'failed' THEN cr.id END) as failed_runs,
  COUNT(DISTINCT CASE WHEN cr.status = 'skipped' THEN cr.id END) as skipped_runs,
  SUM(cr.items_created) as total_items_created,
  SUM(cr.items_skipped) as total_items_skipped
FROM content_sources cs
LEFT JOIN content_runs cr ON cs.id = cr.source_id
WHERE cr.started_at >= NOW() - INTERVAL '7 days' OR cr.started_at IS NULL
GROUP BY cs.id, cs.source_key, cs.is_active
ORDER BY cs.source_key;

-- ============================================
-- 6. Deduplication Effectiveness
-- ============================================
SELECT 
  cs.source_key,
  SUM(cr.items_fetched) as total_fetched,
  SUM(cr.items_created) as total_created,
  SUM(cr.items_skipped) as total_skipped,
  ROUND(100.0 * SUM(cr.items_skipped) / NULLIF(SUM(cr.items_fetched), 0), 2) as dedup_rate_percent
FROM content_sources cs
JOIN content_runs cr ON cs.id = cr.source_id
WHERE cr.started_at >= NOW() - INTERVAL '7 days'
  AND cr.items_fetched > 0
GROUP BY cs.source_key
ORDER BY cs.source_key;
