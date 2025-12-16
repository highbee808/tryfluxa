---
name: Content Hashing & Normalization Utilities
overview: Implement deterministic, unit-testable utilities for title normalization, canonical published time handling, and SHA-256 content hash generation. These utilities will be used by ingestion adapters to generate content_hash consistently across the application.
todos: []
---

# Phase 2: Hashing & Normalization Utilities - Fluxa Content System

## Overview

Implement deterministic, side-effect-free utility functions for content deduplication:

- Title normalization (clean, consistent format for hashing)
- Canonical published time (UTC + hour precision)
- Content hash generation (SHA-256)

These utilities will be used by ingestion adapters to generate `content_hash` consistently, enforcing the global deduplication strategy defined in Phase 1.

---

## Files to Create

### 1. Core Utility Module

**File:** `src/lib/contentHash.ts`

Contains three exported functions:

- `normalizeTitle(title: string): string`
- `canonicalPublishedTime(publishedAt: string | null, fetchedAt?: Date): Date`
- `generateContentHash(params: { title: string; sourceKey: string; publishedAt: string | null; fetchedAt?: Date }): Promise<string>`

**Note:** `generateContentHash` is async because it uses Web Crypto API (same pattern as `src/lib/pkce.ts`).

---

## Implementation Details

### Function 1: normalizeTitle

**Purpose:** Transform raw title into normalized form for consistent hashing

**Rules (in order):**

1. Convert to lowercase
2. Trim leading/trailing whitespace
3. Remove common prefixes: `breaking:`, `exclusive:`, `watch:`, `live:`, `update:` (BEFORE punctuation removal)
4. Remove emojis (Unicode emoji ranges)
5. Remove punctuation: `. , ! ? : ; " ' ( ) [ ] { }`
6. Collapse multiple whitespace to single space
7. Remove trailing source suffixes:  `- bbc`,  `| cnn`,  `– espn` (various dash types: `-`, `–`, `—`)

**Edge Cases:**

- Empty string → return empty string
- Whitespace-only → return empty string
- Titles with only emojis → return empty string
- Multiple consecutive dashes → handled by punctuation removal
- Mixed case prefixes/suffixes → handled by lowercase conversion first
- **Idempotency:** Calling `normalizeTitle(normalizeTitle(title))` must yield the same result as `normalizeTitle(title)`

**Implementation Approach:**

- Use regex for pattern matching
- Process in order: lowercase → trim → **prefix removal** → emoji removal → punctuation → whitespace collapse → suffix removal
- Prefix/suffix matching should be case-insensitive after lowercasing
- Ensure idempotency by ensuring no step can reintroduce patterns removed by earlier steps

---

### Function 2: canonicalPublishedTime

**Purpose:** Convert published timestamp to canonical UTC hour-precision format

**Logic:**

1. If `publishedAt` is provided:

   - Parse using `new Date(publishedAt)` (handles ISO 8601, RFC 2822, etc.)
   - **Check if result is Invalid Date:** `isNaN(date.getTime())`
   - **If Invalid Date:** treat as null and fall back to step 2
   - If valid: Convert to UTC and truncate to hour precision (set minutes, seconds, milliseconds to 0)

2. Else (publishedAt is null OR Invalid Date):

   - Use `fetchedAt` (defaults to `new Date()` if not provided)
   - Convert to UTC
   - Truncate to hour precision

**Examples:**

- `2025-12-14T10:37:22Z` → `2025-12-14T10:00:00.000Z`
- `2025-12-14T10:59:59.999Z` → `2025-12-14T10:00:00.000Z`
- `null` with `fetchedAt = 2025-12-14T15:30:00Z` → `2025-12-14T15:00:00.000Z`
- `"invalid-date-string"` → falls back to `fetchedAt` or `new Date()`

**Edge Cases:**

- Invalid date strings (parse to Invalid Date) → **explicitly check `isNaN(date.getTime())` and treat as null**
- Invalid `fetchedAt` Date object → use `new Date()`
- Timezone-aware strings → convert to UTC correctly

**Implementation Approach:**

- Use `Date` constructor for parsing
- Use `Date.UTC()` or `setUTCHours()` with zeroed minutes/seconds/milliseconds for truncation
- Return new Date object (immutable approach)

---

### Function 3: generateContentHash

**Purpose:** Generate SHA-256 hash for content deduplication

**Input:**

```typescript
{
  title: string;              // Raw title (will be normalized)
  sourceKey: string;          // Source identifier (e.g., 'newsapi')
  publishedAt: string | null; // ISO timestamp or null
  fetchedAt?: Date;           // Optional fallback timestamp
}
```

**Process:**

1. Normalize title: `normalizedTitle = normalizeTitle(title)`
2. Get canonical time: `canonicalTime = canonicalPublishedTime(publishedAt, fetchedAt)`
3. Format time to ISO string: `timeString = canonicalTime.toISOString()`
4. Build hash input: `hashInput = \`${normalizedTitle}|${sourceKey}|${timeString}\``
5. Generate SHA-256 hash: use Web Crypto API (same as `pkce.ts`)
6. Convert to hex string: return lowercase hex digest

**Hash Format:**

- Input: `normalized_title|source_key|2025-12-14T10:00:00.000Z`
- Output: `64-character lowercase hex string` (e.g., `a1b2c3d4...`)

**Implementation Approach:**

- Use `crypto.subtle.digest('SHA-256', ...)` (Web Crypto API)
- Use `TextEncoder` to encode hash input string
- Convert `ArrayBuffer` to hex string manually (no external deps)

---

## Test Harness

**File:** `scripts/test-contentHash.ts`

**Simple Test Harness Approach:**

- Create a standalone TypeScript file in `scripts/` directory
- Export test functions
- Run via Node.js: `node scripts/test-contentHash.js` (or `tsx scripts/test-contentHash.ts` if tsx is available)
- Use simple assertion helpers: `assert(condition, message)`

**Test Cases:**

### normalizeTitle tests:

1. ✅ Basic normalization: `"Hello World"` → `"hello world"`
2. ✅ Lowercase: `"HELLO WORLD"` → `"hello world"`
3. ✅ Trim: `"  Hello  "` → `"hello"`
4. ✅ Remove emojis: `"Hello 🎉 World"` → `"hello world"`
5. ✅ Remove punctuation: `"Hello, World!"` → `"hello world"`
6. ✅ Collapse whitespace: `"Hello    World"` → `"hello world"`
7. ✅ Remove trailing suffix: `"Story - BBC"` → `"story"`
8. ✅ Remove trailing suffix (en dash): `"Story – CNN"` → `"story"`
9. ✅ Remove trailing suffix (em dash): `"Story — ESPN"` → `"story"`
10. ✅ Remove trailing suffix (pipe): `"Story | Reuters"` → `"story"`
11. ✅ Remove prefix: `"Breaking: Story"` → `"story"`
12. ✅ Remove prefix (case insensitive): `"EXCLUSIVE: Story"` → `"story"`
13. ✅ Idempotency: `normalizeTitle(normalizeTitle("BREAKING: Story"))` → `"story"` (same as single call)
14. ✅ Empty string: `""` → `""`
15. ✅ Whitespace only: `"   "` → `""`
16. ✅ Only emojis: `"🎉🎊"` → `""`
17. ✅ Complex: `"BREAKING: Hello, World! 🎉 - BBC"` → `"hello world"`

### canonicalPublishedTime tests:

1. ✅ Parse ISO string: `"2025-12-14T10:37:22Z"` → `2025-12-14T10:00:00.000Z`
2. ✅ Truncate to hour: `"2025-12-14T10:59:59.999Z"` → `2025-12-14T10:00:00.000Z`
3. ✅ Null uses fetchedAt: `null, new Date("2025-12-14T15:30:00Z")` → `2025-12-14T15:00:00.000Z`
4. ✅ Null uses now: `null` (no fetchedAt) → current hour (truncated)
5. ✅ Invalid date string: `"invalid-date"` → parses to Invalid Date, treated as null, uses fetchedAt or now
6. ✅ Invalid Date check: Explicitly verify `isNaN(new Date("invalid").getTime())` → true, falls back
7. ✅ Timezone conversion: `"2025-12-14T10:37:22+05:00"` → correct UTC hour

### generateContentHash tests:

1. ✅ Basic hash: known input → expected hash (deterministic)
2. ✅ Same title + source + time → same hash
3. ✅ Different title → different hash
4. ✅ Different source → different hash
5. ✅ Different time (different hour) → different hash
6. ✅ Same time (same hour) → same hash
7. ✅ Empty title: `""` → valid hash
8. ✅ Null publishedAt: uses fetchedAt → valid hash

---

## Dependencies

**Existing (no install needed):**

- Web Crypto API (`crypto.subtle`) - available in Node.js and modern browsers
- TypeScript types (`@types/node` already in devDependencies)

**No new dependencies required** - uses built-in APIs only.

---

## File Structure

```
src/lib/
  contentHash.ts           # Main utility module (3 functions)
  
scripts/
  test-contentHash.ts      # Simple test harness
```

---

## Running Tests

**Option 1: Node.js directly**

```bash
node --loader ts-node/esm scripts/test-contentHash.ts
# OR if tsx is available:
tsx scripts/test-contentHash.ts
```

**Option 2: Compile then run**

```bash
tsc scripts/test-contentHash.ts --module esnext --target es2020
node scripts/test-contentHash.js
```

**Option 3: Add to package.json** (optional)

```json
{
  "scripts": {
    "test:contentHash": "tsx scripts/test-contentHash.ts"
  }
}
```

---

## Type Definitions

Optional type export for better DX:

```typescript
export interface GenerateContentHashParams {
  title: string;
  sourceKey: string;
  publishedAt: string | null;
  fetchedAt?: Date;
}
```

---

## Integration Notes

These utilities will be imported by:

- Future ingestion adapters (Phase 3+)
- Content sync functions
- Deduplication logic

**Usage Example (future):**

```typescript
import { generateContentHash } from '@/lib/contentHash';

const hash = await generateContentHash({
  title: rawArticle.title,
  sourceKey: 'newsapi',
  publishedAt: rawArticle.publishedAt,
});
```

---

## Validation Checklist

After implementation:

- [ ] `normalizeTitle` handles all edge cases (empty, emoji-only, punctuation, suffixes, prefixes)
- [ ] `normalizeTitle` is idempotent (calling twice yields same result)
- [ ] `normalizeTitle` removes prefixes BEFORE punctuation removal
- [ ] `canonicalPublishedTime` correctly truncates to hour precision in UTC
- [ ] `canonicalPublishedTime` explicitly checks for Invalid Date and treats as null
- [ ] `generateContentHash` produces deterministic hashes (same input → same output)
- [ ] All three functions are side-effect free (pure functions)
- [ ] Functions are async/sync as appropriate (`generateContentHash` is async)
- [ ] Test harness is located in `scripts/test-contentHash.ts`
- [ ] Test harness runs and validates all test cases
- [ ] No external dependencies added (uses built-in Web Crypto API)
- [ ] TypeScript types are correct
- [ ] Functions are exported from module
- [ ] Code follows existing project patterns (similar to `pkce.ts`)