/**
 * Vercel cron endpoint for content generation
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate",
 *     "schedule": "0 */6 * * *"  // Every 6 hours
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret if configured (Vercel adds ?secret=xxx to cron requests)
  const cronSecret = process.env.CRON_SECRET;
  const requestSecret = req.query.secret as string | undefined;

  if (cronSecret && requestSecret !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Import the runContentPipeline function using dynamic import
    // Use relative path from api/cron/generate.ts to src/jobs/generateContent.ts
    const { runContentPipeline } = await import('../../src/jobs/generateContent');
    
    const result = await runContentPipeline();
    
    return res.status(200).json({
      success: result.success,
      generated: result.generated,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Cron Generate] Error:', error);
    return res.status(500).json({
      error: "Pipeline failed",
      details: error?.message || String(error),
    });
  }
}

