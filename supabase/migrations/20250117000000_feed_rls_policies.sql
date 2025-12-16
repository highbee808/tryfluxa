-- ============================================
-- PHASE 6: Feed Integration RLS Policies
-- Allow authenticated users to read content_items for feed display
-- ============================================

-- Allow authenticated users to read content_items from active sources
CREATE POLICY IF NOT EXISTS "Users can read content_items from active sources"
  ON public.content_items FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.content_sources cs
      WHERE cs.id = content_items.source_id
      AND cs.is_active = true
    )
  );

-- Allow authenticated users to read content_sources metadata (for joins)
CREATE POLICY IF NOT EXISTS "Users can read active content_sources"
  ON public.content_sources FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
  );

-- Allow authenticated users to read content_categories (for category info)
CREATE POLICY IF NOT EXISTS "Users can read active content_categories"
  ON public.content_categories FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
  );

-- Allow authenticated users to read content_item_categories (for joins)
CREATE POLICY IF NOT EXISTS "Users can read content_item_categories"
  ON public.content_item_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Note: user_content_seen policies already exist in the base migration
-- Verify they allow users to read their own seen records (already implemented)
