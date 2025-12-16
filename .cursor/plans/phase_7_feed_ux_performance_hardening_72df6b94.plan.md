---
name: Phase 7 Feed UX Performance Hardening
overview: Improve feed UX clarity, loading reliability, performance, and observability without changing ingestion or database logic. Add source indicators, progressive loading, client-side caching, stable ordering, and graceful error handling.
todos:
  - id: source-indicators-feedcard
    content: Add sourceType prop and badge indicator to FeedCard component with subtle styling differences
    status: completed
  - id: source-indicators-mapping
    content: Extend Gist interface and mapping functions to include sourceType field
    status: completed
  - id: progressive-loading
    content: Refactor loadGists to support progressive updates as each data source completes
    status: completed
  - id: skeleton-loaders
    content: Add SkeletonFeedCard component and replace full-screen spinner with skeleton loaders
    status: completed
  - id: error-handling-partial
    content: Add sourceErrors tracking and toast notifications for partial failures
    status: completed
  - id: client-cache-memory
    content: Implement in-memory cache using useRef for current session
    status: completed
  - id: client-cache-localstorage
    content: Implement localStorage cache with TTL (15 minutes) and cache key generation
    status: completed
  - id: reduce-refetches
    content: Add lastFetchTime tracking and skip fetch logic to prevent unnecessary re-fetches
    status: completed
  - id: stable-ordering
    content: Add secondary sort by ID and preserve cached order when loading from cache
    status: completed
  - id: observability-logging
    content: Add dev-mode console logging for merge stats, deduplication, and cache hits/misses
    status: completed
  - id: observability-guards
    content: Add validation guards for gists array, published_at dates, and IDs before state updates
    status: completed
---

# Phase 7 Plan — Feed UX, Performance & Confidence Hardening

## Overview

This phase focuses on making the feed feel correct, fast, and trustworthy through incremental UX improvements, progressive loading, client-side caching, stable ordering, and better error handling—without modifying ingestion pipelines or database schema.

## Architecture Changes

### 1. Feed UX Clarity

**1.1 Source Indicators on FeedCard**

- **File**: `src/components/FeedCard.tsx`
- **Changes**:
- Add optional `sourceType` prop to `FeedCardProps` (values: `"gist" | "content_item" | "category_content"`)
- Add small badge in top-right corner of card (near credibility score) showing source type
- Apply subtle styling difference:
- Gists: Blue accent border or badge
- Content items: Green accent border or badge  
- Category content: Purple accent border or badge
- Use existing `Badge` component with variant styling
- Ensure badge is non-intrusive and doesn't break existing layout

**1.2 Pass Source Type from Feed**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Extend `Gist` interface to include `sourceType?: "gist" | "content_item" | "category_content"`
- In `mapContentItemToGist`: Set `sourceType: "category_content"` (from fetch-content API)
- In `mapContentItemResponseToGist`: Set `sourceType: "content_item"` (from content_items table)
- In `mapDbGistToGist`: Set `sourceType: "gist"` (from gists table)
- Pass `sourceType` to `FeedCardWithSocial`, which passes it to `FeedCard`

**1.3 Category Filter Behavior**

- **File**: `src/pages/Feed.tsx` (filteredGists memo)
- **Changes**:
- Ensure category filters work correctly with mixed content sources
- No changes needed (current logic already handles this via `topic_category` and `topic`)

### 2. Feed Loading & Reliability

**2.1 Progressive Loading Implementation**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Refactor `loadGists` to support progressive updates:
- Fetch category content and content_items in parallel (already done)
- Update `gists` state incrementally as each source completes:
- Set initial loading state
- When category content arrives: `setGists(prev => [...prev, ...newItems])`
- When content_items arrive: `setGists(prev => [...prev, ...newItems])`
- Apply deduplication and sorting after each update
- Use `useRef` to track which sources have completed
- Only set `loading: false` when all sources complete or timeout (5s max wait)
- Add `isLoadingPartial` state to show skeleton loaders for remaining items

**2.2 Graceful Error Handling**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Wrap each fetch source in try-catch:
- `fetchCategoryContent`: Catch errors, return empty array, log to console
- `fetchContentItems`: Already returns empty array on error (keep as-is)
- `fetchRecentGists`: Already returns empty array on error (keep as-is)
- Track partial failures:
- Add `sourceErrors` state: `{ categoryContent?: string, contentItems?: string }`
- When a source fails, set error in `sourceErrors` and show toast:
- `toast.warning("Some content couldn't load. Showing available items.")`
- Only show full error banner if ALL sources fail
- Ensure feed never shows blank state if at least one source succeeds

**2.3 Loading State Improvements**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Replace full-screen spinner with:
- Skeleton loaders for first 3-5 cards while loading
- Show existing content immediately if available from cache
- Progressive reveal as new content arrives
- Add `SkeletonFeedCard` component (simple placeholder with shimmer effect)

### 3. Performance & Confidence

**3.1 Client-Side Caching (Memory + localStorage)**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Create cache utility functions:
- `getFeedCacheKey(category: string): string` → `fluxa_feed_cache_${category}`
- `getFeedCache(category: string): Gist[] | null` → Read from localStorage, check TTL (15 minutes)
- `setFeedCache(category: string, gists: Gist[], ttlMinutes: number = 15): void` → Write to localStorage with timestamp
- In `loadGists`:
- Check cache first (if not `forceFresh`):
- If cache valid: Set `gists` immediately, set `loading: false`
- Still fetch fresh data in background, update when ready
- After successful fetch: Update both memory (state) and localStorage cache
- Use `useRef` for in-memory cache (current session, no TTL check needed)
- Cache key includes: category, user interests (for "All" tab)

**3.2 Reduce Unnecessary Re-fetches**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Add `lastFetchTime` ref to track when feed was last fetched
- In `loadGists`: Skip fetch if:
- Not `forceFresh` AND
- `lastFetchTime` < 2 minutes ago AND
- Cache exists and is valid
- Only auto-reload every 30 minutes (already implemented, keep as-is)
- Add dependency check: Only refetch if `selectedCategory` or `userInterests` changed

**3.3 Stable Feed Ordering**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Update sorting logic in `loadGists`:
- Primary sort: `published_at` (descending, nulls last) - keep existing
- Secondary sort: `id` (ascending) - ensures stable order for items with same timestamp
- Apply sorting after deduplication
- When loading from cache:
- Preserve cached order if cache is fresh (< 5 minutes old)
- Otherwise, re-sort with new items merged in
- Store sort order in cache metadata for consistency

### 4. Observability (Lightweight)

**4.1 Minimal Logging & Guards**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Add console logging (dev mode only):
- Log feed merge stats: `[Feed] Merged ${categoryCount} category items + ${contentItemsCount} content_items = ${total} total`
- Log deduplication: `[Feed] Deduplicated ${duplicateCount} duplicates`
- Log cache hits/misses: `[Feed] Cache ${hit ? 'hit' : 'miss'} for category: ${category}`
- Add guards:
- Validate `gists` array before setting state (ensure it's an array)
- Validate `published_at` dates before sorting (handle invalid dates gracefully)
- Check for null/undefined IDs before deduplication

**4.2 Safe Error Surfacing**

- **File**: `src/pages/Feed.tsx`
- **Changes**:
- Ensure errors never crash the feed:
- Wrap all state updates in try-catch
- Use `console.error` for errors (not `throw`)
- Always provide fallback: If error occurs, show cached content or empty state with message
- Error messages:
- Partial failure: Toast (non-blocking)
- Full failure: Error banner (already implemented, keep as-is)
- Never show both toast and banner for same error

## Implementation Order

1. **Source Indicators** (FeedCard + Feed mapping) - Low risk, high visibility
2. **Progressive Loading** - Improves perceived performance
3. **Client-Side Caching** - Reduces unnecessary fetches
4. **Stable Ordering** - Ensures consistency
5. **Error Handling Improvements** - Makes feed more resilient
6. **Observability** - Helps detect issues

## Files to Modify

- `src/components/FeedCard.tsx` - Add source indicator badge
- `src/pages/Feed.tsx` - Progressive loading, caching, error handling, stable ordering
- `src/lib/feedData.ts` - (Optional) Add cache utility functions if we want to extract them

## Testing Considerations

- Test with slow network (throttle in DevTools) to verify progressive loading
- Test with cache: Load feed, refresh, verify cache is used
- Test error scenarios: Disable network, verify graceful degradation
- Test category switching: Verify cache is category-specific
- Test source indicators: Verify all three types show correct badges

## Success Criteria

- Users can visually distinguish content sources (badge + styling)
- Feed loads progressively (content appears as it arrives)
- Feed uses cache to show content immediately on reload
- Feed ordering is stable across reloads (same items in same order)
- Errors are handled gracefully (toasts for partial failures, banner only if all fail)
- No unnecessary re-fetches (respects 2-minute cooldown)
- Console logs help debug merge/deduplication issues (dev mode only)