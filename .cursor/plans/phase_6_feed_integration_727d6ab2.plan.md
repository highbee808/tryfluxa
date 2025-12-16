---
name: Phase 6 Feed Integration
overview: Integrate content_items from Phase 1-5 ingestion system into the existing Fluxa feed UI, merging them chronologically with existing gists while respecting source visibility flags and user seen tracking.
todos:
  - id: rls_policies
    content: Create RLS policies migration for user access to content_items, content_sources, and related tables
    status: completed
  - id: api_endpoint
    content: Create /api/feed/content-items.ts Vercel Serverless Function endpoint with query logic, user_content_seen filtering, and source filtering
    status: completed
  - id: mapper_function
    content: Create mapContentItemToGist() function in src/lib/feedData.ts to map content_items API response to Gist interface
    status: completed
  - id: fetch_function
    content: Create fetchContentItems() function in src/lib/feedData.ts to call the new API endpoint
    status: completed
  - id: category_mapping
    content: Create category mapping utility to map content_item categories to feed categories (Sports, News, Music)
    status: completed
  - id: feed_integration
    content: Integrate content_items fetching and merging into loadGists() function in src/pages/Feed.tsx
    status: completed
  - id: seen_tracking
    content: Implement user_content_seen tracking when user interacts with content_item cards
    status: completed
  - id: testing_verification
    content: "Test feed integration: source visibility, user seen tracking, category filtering, and chronological ordering"
    status: completed
---

# Phase 6 Plan — Feed Integration & Visibility

## Overview

Make ingested `content_items` appear in the Fluxa feed UI by creating a new API endpoint to query content_items, mapping them to the existing `Gist` interface, and integrating them into the feed loading logic.

## Architecture Decision

- **Feed Strategy**: Merge content_items with existing gists feed (interleaved by `published_at`)
- **Mapping Strategy**: Direct mapping using `mapContentItemToGist()` function (reuse existing `Gist` interface)
- **API Strategy**: New Vercel Serverless Function endpoint `/api/feed/content-items`
- **Visibility Control**: Respect `content_sources.is_active` flag (with config override for testing)
- **User Tracking**: Filter out items in `user_content_seen` table for the requesting user

---

## Implementation Steps

### Step 1: Create RLS Policies for User Access

**File**: New migration `supabase/migrations/YYYYMMDDHHMMSS_feed_rls_policies.sql`

**Purpose**: Allow authenticated users to read content_items and related tables for feed queries.

**Changes**:

- Add SELECT policy for `content_items` table: authenticated users can read items from active sources
- Add SELECT policy for `content_sources` table: authenticated users can read source metadata
- Add SELECT policy for `content_item_categories` and `content_categories` tables
- Add SELECT policy for `user_content_seen` table (already exists, verify it works)

**SQL Policy Example**:

```sql
-- Allow authenticated users to read content_items from active sources
CREATE POLICY "Users can read content_items from active sources"
  ON public.content_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content_sources cs
      WHERE cs.id = content_items.source_id
      AND cs.is_active = true
    )
  );

-- Allow authenticated users to read content_sources metadata
CREATE POLICY "Users can read active content_sources"
  ON public.content_sources FOR SELECT
  USING (is_active = true);
```

---

### Step 2: Create Feed Query API Endpoint

**File**: `api/feed/content-items.ts`

**Purpose**: Serverless function to query content_items for feed display.

**Functionality**:

- Query `content_items` joined with `content_sources` (filter `is_active = true`)
- Join with `content_item_categories` and `content_categories` (optional - for category filtering)
- Filter out items the user has seen (LEFT JOIN with `user_content_seen`, exclude where `seen_at IS NOT NULL`)
- Support query parameters:
  - `limit` (default: 50, max: 100)
  - `maxAgeHours` (default: 168 = 7 days)
  - `category` (optional: filter by category name/slug)
  - `source` (optional: filter by source_key, for testing/override)
  - `excludeSeen` (default: true, can be disabled for testing)
- Order by `published_at DESC` (or `created_at DESC` if `published_at` is null)
- Return JSON with array of content items

**Response Format**:

```typescript
{
  items: Array<{
    id: string;
    source_id: string;
    source_key: string;
    source_name: string;
    title: string;
    url: string | null;
    excerpt: string | null;
    published_at: string | null;
    image_url: string | null;
    categories: string[]; // Array of category names
    created_at: string;
  }>;
  count: number;
}
```

**Key Implementation Details**:

- Use service role Supabase client (already available in `api/_internal/ingestion/db.ts`)
- Accept `userId` from query params or JWT token (for user_content_seen filtering)
- If `userId` not provided and `excludeSeen=true`, skip the seen filter (allow unauthenticated feed viewing)
- Support `?source=tmdb` query param to override active source filtering (for testing specific sources)

---

### Step 3: Create Content Item to Gist Mapper

**File**: `src/lib/feedData.ts` (add new function)

**Purpose**: Map `content_items` API response to existing `Gist` interface.

**Function**: `mapContentItemToGist(item: ContentItemResponse): Gist`

**Mapping Logic**:

- `id` → `id`
- `title` → `headline`
- `excerpt` → `summary` (truncate to 150 chars) and `context` (full excerpt)
- `image_url` → `image_url`
- `url` → `url`
- `published_at` → `published_at`
- `source_name` or `source_key` → `topic` (for display)
- First category name → `topic_category`
- `source` → `"content"` (add new source type, or use `"news"` to match existing)
- `audio_url` → `null` (content_items don't have audio in Phase 6)
- `analytics` → default zeros (no analytics on content_items yet)

**Note**: May need to extend `Gist` interface `source` type to include `"content"` or reuse `"news"`.

---

### Step 4: Create Feed Data Fetching Function

**File**: `src/lib/feedData.ts` (add new function)

**Purpose**: Fetch content_items from the new API endpoint.

**Function**: `fetchContentItems(options?: { limit?: number; maxAgeHours?: number; category?: string; source?: string }): Promise<ContentItemResponse[]>`

**Implementation**:

- Call `/api/feed/content-items` with query parameters
- Include `userId` from Supabase auth session if available
- Handle errors gracefully (return empty array on failure)
- Return typed array matching API response structure

---

### Step 5: Integrate into Feed Loading Logic

**File**: `src/pages/Feed.tsx`

**Purpose**: Merge content_items into existing feed, interleaved by published_at.

**Changes in `loadGists` function**:

1. After fetching category content (or in parallel), also call `fetchContentItems()`
2. Merge content_items with gists:

   - Convert content_items to Gist format using `mapContentItemToGist()`
   - Combine both arrays
   - Sort by `published_at` (descending, nulls last)
   - Deduplicate by ID (prevent showing same item twice)

3. Apply existing deduplication and filtering logic to merged array
4. Set merged array to `gists` state

**Key Integration Points**:

- Fetch content_items in parallel with category content (or sequentially after)
- Merge before applying headline-based deduplication
- Maintain existing category filtering logic (content_items categories map to feed categories)
- Ensure content_items respect `selectedCategory` filter (map content_item categories to feed categories: "Sports", "Entertainment" → feed categories)

**Category Mapping Strategy**:

- Map `content_categories.name` to feed categories:
  - "Sports" → "Sports"
  - "Entertainment" → "Music" (or create mapping logic)
  - "Technology", "Business", "World", "Health", "Science" → "News"
  - Default unmapped categories → "News"

---

### Step 6: Handle User Content Seen Tracking

**File**: `src/pages/Feed.tsx` or new utility file

**Purpose**: Mark content_items as seen when user views them in feed.

**Implementation**:

- When feed loads, content_items are already filtered by API (if `excludeSeen=true`)
- When user clicks/interacts with a content_item card, mark as seen:
  - Call Supabase: `INSERT INTO user_content_seen (user_id, content_item_id) VALUES (...) ON CONFLICT DO NOTHING`
  - Or create API endpoint to handle this (for consistency)
- Optional: Add seen tracking on scroll/view (mark as seen when card enters viewport)

**Note**: For Phase 6, basic implementation is sufficient - mark as seen on click/interaction. Advanced viewport tracking can be added later.

---

### Step 7: Add Category Mapping Configuration

**File**: `src/lib/feedData.ts` or new `src/lib/contentCategoryMapping.ts`

**Purpose**: Map content_item categories to feed categories for filtering.

**Function**: `mapContentCategoryToFeedCategory(categoryName: string): ContentCategory | null`

**Mapping**:

- "Sports" → "sports"
- "Entertainment" → "music" (or "news" if more appropriate)
- "Technology", "Business", "World", "Health", "Science", "Politics" → "news"
- Unknown categories → "news" (default)
- Return `null` if category should be excluded

**Usage**: Filter content_items by `selectedCategory` in feed loading logic.

---

### Step 8: Testing & Safety Configuration

**File**: `supabase/migrations/YYYYMMDDHHMMSS_feed_config.sql` (optional)

**Purpose**: Add configuration flags for feed visibility control.

**Optional Config Entries**:

- `feed.content_items_enabled` (boolean, default: true)
- `feed.content_items_max_age_hours` (number, default: 168)
- `feed.content_items_limit` (number, default: 50)
- `feed.content_items_category_mapping` (JSONB, mapping rules)

**Usage**: Query `content_config` in API endpoint to override defaults.

---

## File Changes Summary

### New Files

1. `api/feed/content-items.ts` - Vercel Serverless Function endpoint
2. `supabase/migrations/YYYYMMDDHHMMSS_feed_rls_policies.sql` - RLS policies for user access

### Modified Files

1. `src/lib/feedData.ts` - Add `fetchContentItems()` and `mapContentItemToGist()` functions
2. `src/pages/Feed.tsx` - Integrate content_items fetching and merging in `loadGists()`
3. `src/pages/Feed.tsx` - Update `Gist` interface `source` type if needed (or reuse existing)

### Optional Files

1. `src/lib/contentCategoryMapping.ts` - Category mapping utility (if logic is complex)
2. `supabase/migrations/YYYYMMDDHHMMSS_feed_config.sql` - Feed configuration migration

---

## Safety & Rollback Strategy

### Source-Level Control

- Content visibility controlled by `content_sources.is_active` flag
- Set `is_active = false` to immediately hide all items from a source (no code deploy needed)
- API endpoint respects this flag (filtered in SQL query)

### Config-Level Control

- Optional `feed.content_items_enabled` config can disable content_items entirely
- API endpoint checks this config before querying (returns empty array if disabled)

### Testing Override

- Support `?source=tmdb` query param to test specific sources even if others are inactive
- Support `?excludeSeen=false` to test with seen items included

### Rollback Plan

1. **Immediate**: Set all sources to `is_active = false` in database
2. **Code-level**: Comment out content_items fetching in `loadGists()` function
3. **Config-level**: Set `feed.content_items_enabled = false` (if implemented)

---

## Data Flow

```
Feed.tsx loadGists()
  ├─> fetchCategoryContent() [existing]
  ├─> fetchContentItems() [new]
  │     └─> GET /api/feed/content-items?limit=50&maxAgeHours=168
  │           └─> Query content_items + content_sources (is_active=true)
  │           └─> Filter user_content_seen (if userId provided)
  │           └─> Return JSON array
  │
  ├─> mapContentItemToGist() [new mapper]
  ├─> Merge arrays + sort by published_at
  ├─> Deduplicate by ID
  └─> setGists(mergedArray)
```

---

## Acceptance Criteria

1. ✅ Content_items appear in feed when sources are active
2. ✅ Content_items interleaved chronologically with gists
3. ✅ User_content_seen filtering works (items user has seen are excluded)
4. ✅ Category filtering respects selectedCategory tab
5. ✅ Setting `content_sources.is_active = false` hides items immediately
6. ✅ Feed cards render correctly (reuse existing FeedCard components)
7. ✅ No breaking changes to existing gists feed behavior
8. ✅ API endpoint returns proper error responses (not crashes)

---

## Testing Checklist

- [ ] Test with TMDB source active (`is_active = true`)
- [ ] Test with source inactive (`is_active = false`) - items should not appear
- [ ] Test user_content_seen filtering (mark item as seen, verify it doesn't reappear)
- [ ] Test category filtering (select "Sports" tab, verify only sports items show)
- [ ] Test chronological ordering (newest items first)
- [ ] Test deduplication (same content_item shouldn't appear twice)
- [ ] Test fallback behavior (if API fails, existing feed still works)
- [ ] Test with unauthenticated users (feed still works, no seen filtering)