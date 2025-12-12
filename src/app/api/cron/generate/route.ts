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

import { runContentPipeline } from "@/jobs/generateContent";

export async function GET(req: Request) {
  // Verify cron secret if configured (Vercel adds ?secret=xxx to cron requests)
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const requestSecret = url.searchParams.get("secret");

  if (cronSecret && requestSecret !== cronSecret) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await runContentPipeline();
    
    return new Response(
      JSON.stringify({
        success: result.success,
        generated: result.generated,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: "Pipeline failed",
        details: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Also support POST for manual triggering
export async function POST(req: Request) {
  return GET(req);
}

