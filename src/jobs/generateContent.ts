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
  const openaiKey = process.env.OPENAI_API_KEY;
  
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content from OpenAI");
  }

  return JSON.parse(content);
}

/**
 * Insert gist into database
 */
async function insertGist(gistData: GistData): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials");
  }

  // Use dynamic import for Supabase client (server-side only)
  const { createClient } = await import("@supabase/supabase-js");
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase.from("gists").insert(gistData);

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
  console.log("[Content Pipeline] Starting generation...");
  
  const errors: string[] = [];
  let generated = 0;

  try {
    const topics = getTrendingTopics();
    console.log(`[Content Pipeline] Processing ${topics.length} topics`);

    // Generate content for each topic (limit to 3 to avoid rate limits)
    const topicsToProcess = topics.slice(0, 3);

    for (const topic of topicsToProcess) {
      try {
        console.log(`[Content Pipeline] Generating content for: ${topic}`);

        // Generate AI summary
        const aiContent = await generateAISummary(topic);

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
        
        generated++;
        console.log(`[Content Pipeline] Successfully generated: ${aiContent.headline}`);
        
        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Content Pipeline] Error processing topic "${topic}":`, errorMsg);
        errors.push(`${topic}: ${errorMsg}`);
      }
    }

    console.log(`[Content Pipeline] Complete. Generated: ${generated}, Errors: ${errors.length}`);
    
    return {
      success: errors.length === 0,
      generated,
      errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Content Pipeline] Fatal error:", errorMsg);
    return {
      success: false,
      generated,
      errors: [errorMsg],
    };
  }
}

