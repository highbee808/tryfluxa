/**
 * Test Harness for Content Hashing & Normalization Utilities
 * 
 * Simple test runner for contentHash.ts functions
 * Run with: tsx scripts/test-contentHash.ts
 * Or: node --loader ts-node/esm scripts/test-contentHash.ts
 */

import {
  normalizeTitle,
  canonicalPublishedTime,
  generateContentHash,
} from '../src/lib/contentHash';

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`❌ ${name}`);
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
  }
}

// ============================================================================
// normalizeTitle Tests
// ============================================================================

console.log('\n=== Testing normalizeTitle ===\n');

runTest('Basic normalization', () => {
  assert(normalizeTitle('Hello World') === 'hello world', 'Should normalize basic title');
});

runTest('Lowercase conversion', () => {
  assert(normalizeTitle('HELLO WORLD') === 'hello world', 'Should convert to lowercase');
});

runTest('Trim whitespace', () => {
  assert(normalizeTitle('  Hello  ') === 'hello', 'Should trim leading/trailing whitespace');
});

runTest('Remove emojis', () => {
  assert(normalizeTitle('Hello 🎉 World') === 'hello world', 'Should remove emojis');
});

runTest('Remove punctuation', () => {
  assert(normalizeTitle('Hello, World!') === 'hello world', 'Should remove punctuation');
});

runTest('Collapse whitespace', () => {
  assert(normalizeTitle('Hello    World') === 'hello world', 'Should collapse multiple spaces');
});

runTest('Remove trailing suffix (hyphen)', () => {
  assert(normalizeTitle('Story - BBC') === 'story', 'Should remove trailing suffix with hyphen');
});

runTest('Remove trailing suffix (en dash)', () => {
  assert(normalizeTitle('Story – CNN') === 'story', 'Should remove trailing suffix with en dash');
});

runTest('Remove trailing suffix (em dash)', () => {
  assert(normalizeTitle('Story — ESPN') === 'story', 'Should remove trailing suffix with em dash');
});

runTest('Remove trailing suffix (pipe)', () => {
  assert(normalizeTitle('Story | Reuters') === 'story', 'Should remove trailing suffix with pipe');
});

runTest('Remove prefix', () => {
  assert(normalizeTitle('Breaking: Story') === 'story', 'Should remove breaking prefix');
});

runTest('Remove prefix (case insensitive)', () => {
  assert(normalizeTitle('EXCLUSIVE: Story') === 'story', 'Should remove exclusive prefix (case insensitive)');
});

runTest('Idempotency', () => {
  const title = 'BREAKING: Story';
  const once = normalizeTitle(title);
  const twice = normalizeTitle(once);
  assert(once === twice, 'Should be idempotent (calling twice yields same result)');
  assert(once === 'story', 'Should normalize correctly');
});

runTest('Empty string', () => {
  assert(normalizeTitle('') === '', 'Should return empty string for empty input');
});

runTest('Whitespace only', () => {
  assert(normalizeTitle('   ') === '', 'Should return empty string for whitespace-only input');
});

runTest('Only emojis', () => {
  assert(normalizeTitle('🎉🎊') === '', 'Should return empty string for emoji-only input');
});

runTest('Complex example', () => {
  const result = normalizeTitle('BREAKING: Hello, World! 🎉 - BBC');
  assert(result === 'hello world', `Should handle complex title. Got: "${result}"`);
});

// ============================================================================
// canonicalPublishedTime Tests
// ============================================================================

console.log('\n=== Testing canonicalPublishedTime ===\n');

runTest('Parse ISO string', () => {
  const result = canonicalPublishedTime('2025-12-14T10:37:22Z');
  const expected = new Date('2025-12-14T10:00:00.000Z');
  assert(
    result.getTime() === expected.getTime(),
    `Should truncate to hour. Got: ${result.toISOString()}, Expected: ${expected.toISOString()}`
  );
});

runTest('Truncate to hour', () => {
  const result = canonicalPublishedTime('2025-12-14T10:59:59.999Z');
  const expected = new Date('2025-12-14T10:00:00.000Z');
  assert(
    result.getTime() === expected.getTime(),
    `Should truncate to hour. Got: ${result.toISOString()}, Expected: ${expected.toISOString()}`
  );
});

runTest('Null uses fetchedAt', () => {
  const fetchedAt = new Date('2025-12-14T15:30:00Z');
  const result = canonicalPublishedTime(null, fetchedAt);
  const expected = new Date('2025-12-14T15:00:00.000Z');
  assert(
    result.getTime() === expected.getTime(),
    `Should use fetchedAt and truncate. Got: ${result.toISOString()}, Expected: ${expected.toISOString()}`
  );
});

runTest('Null uses now', () => {
  const result = canonicalPublishedTime(null);
  const now = new Date();
  const expectedHour = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    0, 0, 0
  ));
  assert(
    result.getTime() === expectedHour.getTime(),
    `Should use current time and truncate. Got: ${result.toISOString()}, Expected: ${expectedHour.toISOString()}`
  );
});

runTest('Invalid date string', () => {
  const fetchedAt = new Date('2025-12-14T15:30:00Z');
  const result = canonicalPublishedTime('invalid-date', fetchedAt);
  const expected = new Date('2025-12-14T15:00:00.000Z');
  assert(
    result.getTime() === expected.getTime(),
    `Should fall back to fetchedAt for invalid date. Got: ${result.toISOString()}, Expected: ${expected.toISOString()}`
  );
});

runTest('Invalid Date check', () => {
  const invalidDate = new Date('invalid');
  assert(isNaN(invalidDate.getTime()), 'Invalid date should have NaN getTime()');
  const fetchedAt = new Date('2025-12-14T15:30:00Z');
  const result = canonicalPublishedTime('invalid', fetchedAt);
  const expected = new Date('2025-12-14T15:00:00.000Z');
  assert(
    result.getTime() === expected.getTime(),
    'Should handle Invalid Date and fall back'
  );
});

runTest('Timezone conversion', () => {
  // Input is +05:00, so 10:37:22 +05:00 = 05:37:22 UTC
  const result = canonicalPublishedTime('2025-12-14T10:37:22+05:00');
  const expected = new Date('2025-12-14T05:00:00.000Z');
  assert(
    result.getTime() === expected.getTime(),
    `Should convert timezone correctly. Got: ${result.toISOString()}, Expected: ${expected.toISOString()}`
  );
});

// ============================================================================
// generateContentHash Tests
// ============================================================================

console.log('\n=== Testing generateContentHash ===\n');

runTest('Basic hash (deterministic)', async () => {
  const hash1 = await generateContentHash({
    title: 'Hello World',
    sourceKey: 'newsapi',
    publishedAt: '2025-12-14T10:00:00Z',
  });
  const hash2 = await generateContentHash({
    title: 'Hello World',
    sourceKey: 'newsapi',
    publishedAt: '2025-12-14T10:00:00Z',
  });
  assert(hash1 === hash2, 'Same input should produce same hash');
  assert(hash1.length === 64, 'Hash should be 64 characters');
  assert(/^[0-9a-f]{64}$/.test(hash1), 'Hash should be lowercase hex');
});

runTest('Same title + source + time → same hash', async () => {
  const params = {
    title: 'Test Article',
    sourceKey: 'guardian',
    publishedAt: '2025-12-14T15:30:00Z',
  };
  const hash1 = await generateContentHash(params);
  const hash2 = await generateContentHash(params);
  assert(hash1 === hash2, 'Identical inputs should produce identical hashes');
});

runTest('Different title → different hash', async () => {
  const baseParams = {
    sourceKey: 'newsapi',
    publishedAt: '2025-12-14T10:00:00Z',
  };
  const hash1 = await generateContentHash({ ...baseParams, title: 'Title A' });
  const hash2 = await generateContentHash({ ...baseParams, title: 'Title B' });
  assert(hash1 !== hash2, 'Different titles should produce different hashes');
});

runTest('Different source → different hash', async () => {
  const baseParams = {
    title: 'Same Title',
    publishedAt: '2025-12-14T10:00:00Z',
  };
  const hash1 = await generateContentHash({ ...baseParams, sourceKey: 'newsapi' });
  const hash2 = await generateContentHash({ ...baseParams, sourceKey: 'guardian' });
  assert(hash1 !== hash2, 'Different sources should produce different hashes');
});

runTest('Different time (different hour) → different hash', async () => {
  const baseParams = {
    title: 'Same Title',
    sourceKey: 'newsapi',
  };
  const hash1 = await generateContentHash({ ...baseParams, publishedAt: '2025-12-14T10:00:00Z' });
  const hash2 = await generateContentHash({ ...baseParams, publishedAt: '2025-12-14T11:00:00Z' });
  assert(hash1 !== hash2, 'Different hours should produce different hashes');
});

runTest('Same time (same hour) → same hash', async () => {
  const baseParams = {
    title: 'Same Title',
    sourceKey: 'newsapi',
  };
  // Different minutes but same hour should produce same hash
  const hash1 = await generateContentHash({ ...baseParams, publishedAt: '2025-12-14T10:30:00Z' });
  const hash2 = await generateContentHash({ ...baseParams, publishedAt: '2025-12-14T10:45:00Z' });
  assert(hash1 === hash2, 'Same hour should produce same hash (truncated to hour)');
});

runTest('Empty title', async () => {
  const hash = await generateContentHash({
    title: '',
    sourceKey: 'newsapi',
    publishedAt: '2025-12-14T10:00:00Z',
  });
  assert(hash.length === 64, 'Empty title should still produce valid hash');
  assert(/^[0-9a-f]{64}$/.test(hash), 'Hash should be valid hex');
});

runTest('Null publishedAt uses fetchedAt', async () => {
  const fetchedAt = new Date('2025-12-14T15:30:00Z');
  const hash1 = await generateContentHash({
    title: 'Test',
    sourceKey: 'newsapi',
    publishedAt: null,
    fetchedAt,
  });
  const hash2 = await generateContentHash({
    title: 'Test',
    sourceKey: 'newsapi',
    publishedAt: '2025-12-14T15:00:00Z', // Same hour as fetchedAt
  });
  assert(hash1 === hash2, 'Null publishedAt with fetchedAt should match same hour');
});

// ============================================================================
// Test Summary
// ============================================================================

console.log('\n=== Test Summary ===\n');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total:  ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.error(`❌ ${testsFailed} test(s) failed`);
  process.exit(1);
}
