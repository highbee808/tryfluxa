# Content Pipeline Fix - Validation Tests

## Test 1: publish-gist-v2 correctly attaches raw_trend_id, image_url, source_url

### Test Case 1.1: With valid rawTrendId
```typescript
// Expected behavior:
// 1. Fetches raw_trends row WHERE id = rawTrendId
// 2. Validates row exists (throws error if not)
// 3. Uses raw_trends.image_url as primary image
// 4. Uses raw_trends.url as source_url
// 5. Sets gists.raw_trend_id = rawTrendId
// 6. Logs: [GIST GEN] with raw_trend_id, raw_title, raw_url, raw_image

// Test payload:
{
  "topic": "Test Topic",
  "rawTrendId": "<valid-uuid-from-raw_trends>"
}

// Expected logs:
// [GIST GEN] { raw_trend_id: "...", raw_title: "...", raw_url: "...", raw_image: "..." }
// [FEED MAP] { raw_trend_id: "...", headline: "...", image_url: "...", source_url: "..." }
```

### Test Case 1.2: With invalid rawTrendId
```typescript
// Expected behavior:
// 1. Attempts to fetch raw_trends row
// 2. Throws error: "Invalid rawTrendId: <id>. Raw trend not found."
// 3. Returns 500 error with full error details

// Test payload:
{
  "topic": "Test Topic",
  "rawTrendId": "00000000-0000-0000-0000-000000000000"
}

// Expected response:
// { success: false, error: "Invalid rawTrendId: ...", details: { ... } }
```

### Test Case 1.3: Without rawTrendId (manual admin test)
```typescript
// Expected behavior:
// 1. Skips raw_trends fetch
// 2. Uses provided imageUrl or generatedSourceImageUrl
// 3. Sets raw_trend_id = null
// 4. Proceeds normally (for manual admin tests)

// Test payload:
{
  "topic": "Drake drops a surprise song with a twist",
  "topicCategory": "Music"
}

// Expected response:
// { success: true, gist: { ... } }
```

## Test 2: auto-generate-gists-v2 selects only unprocessed raw_trends

### Test Case 2.1: Query logic
```typescript
// Expected behavior:
// 1. Fetches all raw_trend_ids from gists WHERE raw_trend_id IS NOT NULL
// 2. Fetches raw_trends (limit 50, ordered by created_at DESC)
// 3. Filters: WHERE id NOT IN (existing raw_trend_ids)
// 4. Processes max 10 at a time
// 5. Logs: [AUTO-GEN] for each trend processed

// Expected logs:
// 📊 Found X raw_trends that already have gists
// 📊 Found Y raw_trends without gists (ready to process)
// [AUTO-GEN] { raw_trend_id: "...", raw_title: "...", ... }
```

### Test Case 2.2: Deduplication
```typescript
// Expected behavior:
// 1. If raw_trend already has gist (by raw_trend_id), skip it
// 2. Double-check before processing: query gists WHERE raw_trend_id = trend.id
// 3. If gist exists, mark trend as processed and skip
// 4. Log: "⏭️ Skipping ... - gist already exists for raw_trend_id: ..."

// Test scenario:
// - raw_trends.id = "abc-123" already has gist with raw_trend_id = "abc-123"
// - auto-generate-gists-v2 should skip "abc-123"
```

## Test 3: Feed mapping logs verify correct image/headline/content

### Test Case 3.1: Image priority
```typescript
// Expected behavior in feedData.ts:
// 1. Query: SELECT gists.*, raw_trends.* FROM gists LEFT JOIN raw_trends ON raw_trends.id = gists.raw_trend_id
// 2. For each gist:
//    - primaryImage = raw_trends.image_url || gists.image_url || null
//    - primarySourceUrl = raw_trends.url || gists.source_url || null
// 3. Log: [FEED MAP] with gistId, rawTrendId, rawImage, gistImage, primaryImage
// 4. Safety check: Warn if raw_trend.image_url != gist.image_url (when both exist)

// Expected logs:
// [FEED MAP] {
//   gistId: "...",
//   rawTrendId: "...",
//   headline: "...",
//   rawImage: "...",
//   gistImage: "...",
//   primaryImage: "...",
//   rawSourceUrl: "...",
//   gistSourceUrl: "...",
//   primarySourceUrl: "..."
// }
```

### Test Case 3.2: Image mismatch detection
```typescript
// Expected behavior:
// 1. If raw_trend exists and raw_trend.image_url != gist.image_url:
//    - Log warning: "⚠️ Image mismatch detected! ..."
//    - Force correct image_url: mappedGist.image_url = raw_trend.image_url
// 2. Same for source_url

// Test scenario:
// - gist.image_url = "wrong-image.jpg"
// - raw_trend.image_url = "correct-image.jpg"
// - Expected: mappedGist.image_url = "correct-image.jpg" (forced)
```

## Test 4: Admin test endpoint (HTTP 401 fix)

### Test Case 4.1: Without authentication
```typescript
// Expected behavior:
// 1. config.toml: [functions.publish-gist-v2] verify_jwt = false
// 2. Function accepts requests without JWT (for admin testing)
// 3. CORS headers included: Access-Control-Allow-Origin: *
// 4. Returns full error details on failure

// Test payload (no auth):
POST /functions/v1/publish-gist-v2
{
  "topic": "Test Topic"
}

// Expected: Should work (verify_jwt = false)
```

### Test Case 4.2: With JWT token (from admin panel)
```typescript
// Expected behavior:
// 1. Admin panel sends JWT token via invokeAdminFunction
// 2. Function validates JWT (if provided)
// 3. Proceeds normally

// Test: Use Admin panel "Test Pipeline" button
// Expected: Should work without 401 error
```

## Test 5: End-to-end pipeline flow

### Test Case 5.1: Full flow
```typescript
// 1. scrape-trends → inserts into raw_trends with image_url
// 2. auto-generate-gists-v2 → selects unprocessed raw_trends
// 3. publish-gist-v2 → receives rawTrendId, fetches raw_trend, uses correct image_url
// 4. feedData.ts → JOINs gists ↔ raw_trends, uses raw_trends.image_url
// 5. Frontend → displays correct image/headline/content

// Expected result:
// - No image mismatches
// - No headline/content mismatches
// - Every gist maps to exactly one raw_trend
// - All logs show consistent raw_trend_id
```

## Validation Checklist

- [ ] publish-gist-v2 validates rawTrendId and throws error if invalid
- [ ] publish-gist-v2 uses raw_trends.image_url when rawTrendId provided
- [ ] publish-gist-v2 sets gists.raw_trend_id correctly
- [ ] auto-generate-gists-v2 queries raw_trends WHERE id NOT IN (SELECT raw_trend_id FROM gists)
- [ ] auto-generate-gists-v2 passes rawTrendId to publish-gist-v2
- [ ] feedData.ts uses raw_trends.image_url first, then gists.image_url
- [ ] feedData.ts logs [FEED MAP] with correct mapping
- [ ] Admin test endpoint works without 401 error
- [ ] CORS headers are included in all responses
- [ ] Error responses include full error details

