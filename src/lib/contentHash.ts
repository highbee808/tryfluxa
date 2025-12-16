/**
 * Content Hashing & Normalization Utilities
 * 
 * Provides deterministic utilities for content deduplication:
 * - Title normalization (clean, consistent format for hashing)
 * - Canonical published time (UTC + hour precision)
 * - Content hash generation (SHA-256)
 * 
 * These utilities enforce the global deduplication strategy defined in Phase 1.
 */

/**
 * Type definition for generateContentHash parameters
 */
export interface GenerateContentHashParams {
  title: string;
  sourceKey: string;
  publishedAt: string | null;
  fetchedAt?: Date;
}

/**
 * Normalize a title for consistent hashing
 * 
 * Transforms raw title into normalized form by:
 * 1. Converting to lowercase
 * 2. Trimming whitespace
 * 3. Removing common prefixes (BEFORE punctuation removal)
 * 4. Removing emojis
 * 5. Removing punctuation
 * 6. Collapsing whitespace
 * 7. Removing trailing source suffixes
 * 
 * This function is idempotent: calling it twice yields the same result.
 * 
 * @param title - Raw title from source
 * @returns Normalized title string
 */
export function normalizeTitle(title: string): string {
  if (!title) return '';

  // Step 1: Convert to lowercase
  let normalized = title.toLowerCase();

  // Step 2: Trim leading/trailing whitespace
  normalized = normalized.trim();

  // Step 3: Remove common prefixes (BEFORE punctuation removal)
  // Match prefixes at the start, case-insensitive (already lowercased)
  normalized = normalized.replace(/^(breaking|exclusive|watch|live|update):\s*/i, '');

  // Step 4: Remove emojis (Unicode emoji ranges)
  // This regex covers most emoji ranges
  normalized = normalized.replace(
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu,
    ''
  );

  // Step 5: Remove punctuation
  normalized = normalized.replace(/[.,!?:;"'()[\]{}]/g, '');

  // Step 6: Collapse multiple whitespace to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Step 7: Remove trailing source suffixes
  // Match various dash types: - (hyphen), – (en dash), — (em dash), | (pipe)
  // Pattern: space + dash/pipe + space + word(s) at the end
  normalized = normalized.replace(/\s+[-–—|]\s+[a-z0-9\s]+$/i, '');
  // Also handle cases without space before dash: "Story-BBC"
  normalized = normalized.replace(/[-–—|][a-z0-9\s]+$/i, '');

  // Final trim to remove any remaining whitespace
  normalized = normalized.trim();

  return normalized;
}

/**
 * Convert published timestamp to canonical UTC hour-precision format
 * 
 * If publishedAt is provided and valid, parses it and truncates to hour precision.
 * If publishedAt is null or Invalid Date, falls back to fetchedAt (or current time).
 * 
 * @param publishedAt - ISO timestamp string or null
 * @param fetchedAt - Optional fallback timestamp (defaults to now)
 * @returns Date object truncated to hour precision in UTC
 */
export function canonicalPublishedTime(
  publishedAt: string | null,
  fetchedAt?: Date
): Date {
  let date: Date;

  if (publishedAt) {
    date = new Date(publishedAt);
    // Check if result is Invalid Date
    if (isNaN(date.getTime())) {
      // Treat Invalid Date as null, fall back to fetchedAt
      date = fetchedAt || new Date();
    }
  } else {
    // publishedAt is null, use fetchedAt or now
    date = fetchedAt || new Date();
  }

  // Truncate to hour precision in UTC
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const hour = date.getUTCHours();

  // Create new Date with hour precision (minutes, seconds, milliseconds = 0)
  return new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
}

/**
 * Generate SHA-256 content hash for deduplication
 * 
 * Combines normalized title, source key, and canonical published time
 * to generate a deterministic hash for content deduplication.
 * 
 * Hash input format: `normalized_title|source_key|2025-12-14T10:00:00.000Z`
 * 
 * @param params - Hash generation parameters
 * @returns Promise resolving to 64-character lowercase hex hash string
 */
export async function generateContentHash(
  params: GenerateContentHashParams
): Promise<string> {
  const { title, sourceKey, publishedAt, fetchedAt } = params;

  // Step 1: Normalize title
  const normalizedTitle = normalizeTitle(title);

  // Step 2: Get canonical time
  const canonicalTime = canonicalPublishedTime(publishedAt, fetchedAt);

  // Step 3: Format time to ISO string
  const timeString = canonicalTime.toISOString();

  // Step 4: Build hash input
  const hashInput = `${normalizedTitle}|${sourceKey}|${timeString}`;

  // Step 5: Generate SHA-256 hash using Web Crypto API
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const digest = await crypto.subtle.digest('SHA-256', data);

  // Step 6: Convert ArrayBuffer to hex string
  const hashArray = new Uint8Array(digest);
  const hexString = Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return hexString;
}
