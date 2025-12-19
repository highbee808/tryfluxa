/**
 * AI Summary Service for Content Ingestion Pipeline
 *
 * Generates AI summaries for content items using OpenAI API.
 * Designed to be called after content item insertion in the ingestion runner.
 *
 * Features:
 * - Quality enforcement (2-4 paragraphs, no one-liners)
 * - Graceful failure handling (returns null on error)
 * - Structured logging for observability
 * - Cost-aware model selection (gpt-4o-mini)
 */

import type { AISummaryResult, AISummaryStats } from "./types.js";

// Re-export types for convenience
export type { AISummaryResult, AISummaryStats };

const AI_SUMMARY_MODEL = "gpt-4o-mini";
const MIN_SUMMARY_LENGTH = 100; // Minimum characters for a valid summary
const MAX_SUMMARY_LENGTH = 2000; // Maximum characters to prevent runaway responses

/**
 * System prompt for factual, high-quality summaries
 */
const SYSTEM_PROMPT = `You are a factual news summarizer. Summarize the following article in 2-4 short paragraphs.

Rules:
- Only include information that is explicitly stated in the article
- Do not add opinions, speculation, or external information
- Minimum 3 sentences, maximum 8 sentences
- Be informative and objective
- Do not start with phrases like "This article discusses" or "The article reports"
- Write in a clear, engaging news style`;

/**
 * Get OpenAI API key from environment
 */
function getOpenAIKey(): string | null {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.VITE_OPENAI_API_KEY ||
    null
  );
}

/**
 * Check if a source should skip AI summarization
 * Sources marked as ai_generated in their config should not be summarized
 */
export function shouldSkipSummarization(sourceConfig: Record<string, any> | null): boolean {
  if (!sourceConfig) return false;
  return sourceConfig.ai_generated === true;
}

/**
 * Validate that a summary meets quality requirements
 */
function validateSummary(summary: string): boolean {
  if (!summary || typeof summary !== "string") {
    return false;
  }

  const trimmed = summary.trim();

  // Check minimum length
  if (trimmed.length < MIN_SUMMARY_LENGTH) {
    console.warn(`[AI Summary] Summary too short: ${trimmed.length} chars`);
    return false;
  }

  // Check maximum length
  if (trimmed.length > MAX_SUMMARY_LENGTH) {
    console.warn(`[AI Summary] Summary too long: ${trimmed.length} chars`);
    return false;
  }

  // Check for minimum sentence count (rough heuristic)
  const sentenceCount = (trimmed.match(/[.!?]+/g) || []).length;
  if (sentenceCount < 2) {
    console.warn(`[AI Summary] Summary has too few sentences: ${sentenceCount}`);
    return false;
  }

  return true;
}

/**
 * Generate an AI summary for a content item
 *
 * @param title - Article title
 * @param excerpt - Article excerpt/content
 * @param itemId - Optional item ID for logging
 * @returns AISummaryResult or null if generation fails
 */
export async function generateAISummary(
  title: string,
  excerpt: string,
  itemId?: string
): Promise<AISummaryResult | null> {
  const startTime = Date.now();
  const logPrefix = itemId ? `[AI Summary ${itemId}]` : "[AI Summary]";

  // Check for API key
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    console.warn(`${logPrefix} OPENAI_API_KEY not configured, skipping summarization`);
    return null;
  }

  // Check for sufficient input content
  if (!title && !excerpt) {
    console.warn(`${logPrefix} Skipped: no title or excerpt provided`);
    return null;
  }

  // Build the user prompt
  const userPrompt = `Article Title: ${title}\n\nArticle Content: ${excerpt || "(No additional content available)"}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_SUMMARY_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent, factual output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`${logPrefix} OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      console.error(`${logPrefix} Failed: empty response from OpenAI`);
      return null;
    }

    // Validate summary quality
    if (!validateSummary(summary)) {
      console.warn(`${logPrefix} Failed quality validation, discarding`);
      return null;
    }

    const duration = Date.now() - startTime;
    const result: AISummaryResult = {
      summary,
      model: AI_SUMMARY_MODEL,
      generatedAt: new Date().toISOString(),
      length: summary.length,
    };

    console.log(`${logPrefix} Generated in ${duration}ms, length=${result.length}`);

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Failed after ${duration}ms:`, error?.message || error);
    return null;
  }
}

/**
 * Create a new stats tracker for a run
 */
export function createSummaryStats(): AISummaryStats {
  return {
    generated: 0,
    skipped: 0,
    failed: 0,
  };
}
