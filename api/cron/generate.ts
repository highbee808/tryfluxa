/**
 * Vercel cron endpoint for content generation
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate",
 *     "schedule": "0 0,6,12,18 * * *"  // Every 6 hours (at 0, 6, 12, 18)
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GistData {
  topic: string;
  topic_category: string;
  headline: string;
  context: string;
  narration: string;
  script: string;
  image_url: string | null;
  source_url: string | null;
  status: string;
  published_at: string;
  created_at: string;
  meta: Record<string, any>;
  audio_url?: string;
}

function getTrendingTopics(): string[] {
  return [
    "Taylor Swift releases new album",
    "NBA Finals game highlights",
    "Tech industry layoffs",
    "Climate change summit updates",
    "Hollywood award show nominees",
  ];
}

async function generateAISummary(topic: string): Promise<{
  headline: string;
  summary: string;
  context: string;
  narration: string;
}> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate.ts:41',message:'generateAISummary called',data:{topic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const openaiKey = process.env.OPENAI_API_KEY;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate.ts:47',message:'OpenAI key check',data:{hasOpenAIKey:!!openaiKey,keyLength:openaiKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const systemPrompt = `You are Fluxa, a social gist assistant. Write updates in a casual, friendly tone like you're texting a friend.

Generate a concise, engaging gist about: ${topic}

Return valid JSON with this structure:
{
  "headline": "string (max 100 chars, catchy and clear)",
  "summary": "string (max 200 chars, brief overview)",
  "context": "string (max 300 chars, key details)",
  "narration": "string (60-90 words, friendly conversational style)"
}`;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate.ts:65',message:'Calling OpenAI API',data:{topic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a gist about: ${topic}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate.ts:82',message:'OpenAI response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate.ts:90',message:'OpenAI content parsed',data:{hasContent:!!content,contentLength:content?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!content) {
    throw new Error("No content from OpenAI");
  }

  return JSON.parse(content);
}

async function insertGist(gistData: GistData): Promise<string | null> {
  console.log('[insertGist] Called', { topic: gistData.topic, headline: gistData.headline });
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[insertGist] Env vars check', {
    hasSupabaseUrl: !!supabaseUrl,
    hasServiceKey: !!serviceKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: serviceKey?.length || 0,
  });

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials");
  }

  const { createClient } = await import("@supabase/supabase-js");
  
  console.log('[insertGist] Creating Supabase client', { url: supabaseUrl?.substring(0, 30) + '...' });
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('[insertGist] Executing database insert', { 
    table: 'gists',
    dataKeys: Object.keys(gistData),
    audioUrl: gistData.audio_url,
  });
  
  const { error, data } = await supabase.from("gists").insert(gistData).select();

  console.log('[insertGist] Database insert result', {
    hasError: !!error,
    errorMessage: error?.message,
    errorCode: error?.code,
    errorDetails: error?.details,
    errorHint: error?.hint,
    hasData: !!data,
    dataCount: data?.length || 0,
    insertedId: data?.[0]?.id,
  });

  if (error) {
    console.error('[insertGist] Insert failed with error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Database insert failed: ${error.message} (code: ${error.code})`);
  }
  
  const insertedId = data?.[0]?.id || null;
  if (insertedId) {
    console.log('[insertGist] Successfully inserted gist', { id: insertedId });
  } else {
    console.error('[insertGist] Insert succeeded but no ID returned', { data });
  }
  
  return insertedId;
}

async function runContentPipeline(): Promise<{
  success: boolean;
  generated: number;
  errors: string[];
  insertedIds?: string[];
}> {
  console.log("[Content Pipeline] Starting generation...");
  
  const errors: string[] = [];
  const insertedIds: string[] = [];
  let generated = 0;

  try {
    const topics = getTrendingTopics();
    console.log(`[Content Pipeline] Processing ${topics.length} topics`);

    const topicsToProcess = topics.slice(0, 3);

    for (const topic of topicsToProcess) {
      try {
        console.log(`[Content Pipeline] Generating content for: ${topic}`);

        const aiContent = await generateAISummary(topic);
        console.log(`[Content Pipeline] AI content received`, { 
          hasHeadline: !!aiContent.headline,
          hasNarration: !!aiContent.narration,
          headline: aiContent.headline?.substring(0, 50) + '...'
        });

        const now = new Date().toISOString();
        const gistData: GistData = {
          topic,
          topic_category: "Trending",
          headline: aiContent.headline,
          context: aiContent.context,
          narration: aiContent.narration,
          script: aiContent.narration,
          image_url: null,
          source_url: null,
          audio_url: "",
          status: "published",
          published_at: now,
          created_at: now,
          meta: {
            generated_by: "content_pipeline",
            generated_at: now,
            summary: aiContent.summary,
          },
        };

        console.log(`[Content Pipeline] Attempting to insert gist`, {
          topic: gistData.topic,
          headline: gistData.headline?.substring(0, 50),
          hasAudioUrl: !!gistData.audio_url,
        });

        const insertedId = await insertGist(gistData);
        if (insertedId) {
          insertedIds.push(insertedId);
          generated++;
          console.log(`[Content Pipeline] Successfully generated and inserted: ${aiContent.headline} (ID: ${insertedId})`);
        } else {
          console.error(`[Content Pipeline] Insert returned no ID for: ${topic}`);
          errors.push(`${topic}: Insert completed but no ID returned`);
        }
        
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`[Content Pipeline] Error processing topic "${topic}":`, {
          message: errorMsg,
          stack: errorStack,
        });
        errors.push(`${topic}: ${errorMsg}`);
      }
    }

    console.log(`[Content Pipeline] Complete. Generated: ${generated}, Inserted: ${insertedIds.length}, Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0 && insertedIds.length === generated,
      generated,
      errors,
      insertedIds,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[Content Pipeline] Fatal error:", {
      message: errorMsg,
      stack: errorStack,
    });
    return {
      success: false,
      generated,
      errors: [errorMsg],
      insertedIds,
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const debugInfo: any = {
    handlerInvoked: true,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    envVars: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
    },
  };

  console.log('[Cron Generate] Handler invoked', debugInfo);
  
  // Verify cron secret if configured (Vercel adds ?secret=xxx to cron requests)
  const cronSecret = process.env.CRON_SECRET;
  const requestSecret = req.query.secret as string | undefined;

  debugInfo.cronSecretCheck = {
    hasCronSecret: !!cronSecret,
    hasRequestSecret: !!requestSecret,
    matches: cronSecret && requestSecret === cronSecret,
  };
  console.log('[Cron Generate] Secret check', debugInfo.cronSecretCheck);

  if (cronSecret && requestSecret !== cronSecret) {
    debugInfo.unauthorized = true;
    console.log('[Cron Generate] Unauthorized', debugInfo);
    return res.status(401).json({ error: "Unauthorized", debug: debugInfo });
  }

  try {
    console.log('[Cron Generate] Calling runContentPipeline');
    const result = await runContentPipeline();
    
    debugInfo.pipelineResult = {
      success: result.success,
      generated: result.generated,
      insertedCount: result.insertedIds?.length || 0,
      insertedIds: result.insertedIds || [],
      errorCount: result.errors.length,
      errors: result.errors,
    };
    console.log('[Cron Generate] Pipeline completed', debugInfo.pipelineResult);
    
    return res.status(200).json({
      success: result.success,
      generated: result.generated,
      inserted: result.insertedIds?.length || 0,
      insertedIds: result.insertedIds || [],
      errors: result.errors,
      timestamp: new Date().toISOString(),
      debug: debugInfo,
    });
  } catch (error: any) {
    debugInfo.error = {
      message: error?.message || String(error),
      name: error?.name,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    };
    console.error('[Cron Generate] Error:', debugInfo.error);
    return res.status(500).json({
      error: "Pipeline failed",
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      debug: debugInfo,
    });
  }
}
