/**
 * Server-only content generation job
 * Generates AI summaries and inserts them into the gists table
 * 
 * This runs in the background via cron - never accessed by the browser
 */

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
  audio_url?: string; // Required field with default
}

/**
 * Fetch trending topics (simplified - can be enhanced later)
 */
function getTrendingTopics(): string[] {
  // Mock trending topics - replace with actual API calls if needed
  return [
    "Taylor Swift releases new album",
    "NBA Finals game highlights",
    "Tech industry layoffs",
    "Climate change summit updates",
    "Hollywood award show nominees",
  ];
}

/**
 * Generate AI summary for a topic
 */
async function generateAISummary(topic: string): Promise<{
  headline: string;
  summary: string;
  context: string;
  narration: string;
}> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:47',message:'generateAISummary called',data:{topic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const openaiKey = process.env.OPENAI_API_KEY;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:50',message:'OpenAI key check',data:{hasOpenAIKey:!!openaiKey,keyLength:openaiKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:65',message:'Calling OpenAI API',data:{topic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
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
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:82',message:'OpenAI response received',data:{ok:response.ok,status:response.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:90',message:'OpenAI content parsed',data:{hasContent:!!content,contentLength:content?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!content) {
    throw new Error("No content from OpenAI");
  }

  return JSON.parse(content);
}

/**
 * Insert gist into database
 */
async function insertGist(gistData: GistData): Promise<void> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:100',message:'insertGist called',data:{topic:gistData.topic,headline:gistData.headline},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:104',message:'Supabase env vars check',data:{hasSupabaseUrl:!!supabaseUrl,hasServiceKey:!!serviceKey,urlLength:supabaseUrl?.length||0,keyLength:serviceKey?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials");
  }

  // Use dynamic import for Supabase client (server-side only)
  const { createClient } = await import("@supabase/supabase-js");
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:111',message:'Creating Supabase client',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:118',message:'Executing database insert',data:{table:'gists'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  const { error } = await supabase.from("gists").insert(gistData);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:120',message:'Database insert result',data:{hasError:!!error,errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion

  if (error) {
    throw new Error(`Database insert failed: ${error.message}`);
  }
}

/**
 * Main content generation pipeline
 * This function runs via cron scheduler
 */
export async function runContentPipeline(): Promise<{
  success: boolean;
  generated: number;
  errors: string[];
}> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:134',message:'runContentPipeline started',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  console.log("[Content Pipeline] Starting generation...");
  
  const errors: string[] = [];
  let generated = 0;

  try {
    const topics = getTrendingTopics();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:141',message:'Topics retrieved',data:{topicCount:topics.length,topics:topics.slice(0,3)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log(`[Content Pipeline] Processing ${topics.length} topics`);

    // Generate content for each topic (limit to 3 to avoid rate limits)
    const topicsToProcess = topics.slice(0, 3);

    for (const topic of topicsToProcess) {
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:147',message:'Processing topic',data:{topic},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log(`[Content Pipeline] Generating content for: ${topic}`);

        // Generate AI summary
        const aiContent = await generateAISummary(topic);

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:152',message:'AI summary received',data:{hasHeadline:!!aiContent.headline,hasNarration:!!aiContent.narration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        // Prepare gist data
        const now = new Date().toISOString();
        const gistData: GistData = {
          topic,
          topic_category: "Trending",
          headline: aiContent.headline,
          context: aiContent.context,
          narration: aiContent.narration,
          script: aiContent.narration, // Use narration as script
          image_url: null, // Can be enhanced later with image generation
          source_url: null,
          audio_url: "", // Empty string as default (required field)
          status: "published",
          published_at: now,
          created_at: now,
          meta: {
            generated_by: "content_pipeline",
            generated_at: now,
            summary: aiContent.summary, // Store summary in meta for reference
          },
        };

        // Insert into database
        await insertGist(gistData);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:178',message:'Gist inserted successfully',data:{headline:gistData.headline},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        generated++;
        console.log(`[Content Pipeline] Successfully generated: ${aiContent.headline}`);
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:185',message:'Topic processing error',data:{topic,errorMessage:errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.error(`[Content Pipeline] Error processing topic "${topic}":`, errorMsg);
        errors.push(`${topic}: ${errorMsg}`);
      }
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:191',message:'Pipeline complete',data:{generated,errorCount:errors.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    console.log(`[Content Pipeline] Complete. Generated: ${generated}, Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      generated,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/4e847be9-02b3-4671-b7a4-bc34e135c5dc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generateContent.ts:199',message:'Pipeline fatal error',data:{errorMessage:errorMsg},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error("[Content Pipeline] Fatal error:", errorMsg);
    return {
      success: false,
      generated,
      errors: [errorMsg],
    };
  }
}

