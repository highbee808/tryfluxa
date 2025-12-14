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
  // Return 30+ diverse trending topics for fresh content generation
  return [
    "Taylor Swift releases new album",
    "NBA Finals game highlights",
    "Tech industry layoffs",
    "Climate change summit updates",
    "Hollywood award show nominees",
    "SpaceX rocket launch",
    "Cryptocurrency market trends",
    "New iPhone release",
    "Olympic Games updates",
    "Celebrity wedding news",
    "Movie box office records",
    "Electric vehicle innovations",
    "Social media platform updates",
    "Music festival announcements",
    "Sports championship results",
    "Tech startup funding rounds",
    "Climate action initiatives",
    "Entertainment industry news",
    "Gaming console releases",
    "Fashion week highlights",
    "Scientific breakthroughs",
    "Political developments",
    "Travel industry trends",
    "Food and restaurant news",
    "Health and wellness updates",
    "Education technology innovations",
    "Artificial intelligence advancements",
    "Sports trade rumors",
    "Streaming service launches",
    "Renewable energy projects",
    "Celebrity collaborations",
    "Technology product reviews",
    "Sports injury updates",
    "Entertainment award ceremonies",
    "Business mergers and acquisitions",
  ];
}

/**
 * Fetch articles from NewsAPI to get source images
 */
async function fetchArticleWithImage(topic: string): Promise<{ url: string | null; image_url: string | null }> {
  const newsApiKey = process.env.NEWSAPI_KEY;
  if (!newsApiKey) {
    console.log("[Content Pipeline] NEWSAPI_KEY not configured, skipping article fetch");
    return { url: null, image_url: null };
  }

  try {
    // Add cache-busting timestamp to ensure fresh data
    const timestamp = Date.now();
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&sortBy=publishedAt&pageSize=1&apiKey=${newsApiKey}&_t=${timestamp}`;
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.log(`[Content Pipeline] NewsAPI error: ${response.status}`);
      return { url: null, image_url: null };
    }

    const data = await response.json();
    const article = data.articles?.[0];
    
    if (article && article.urlToImage) {
      return {
        url: article.url || null,
        image_url: article.urlToImage || null,
      };
    }
  } catch (error) {
    console.error("[Content Pipeline] Error fetching article:", error);
  }

  return { url: null, image_url: null };
}

/**
 * Generate image using OpenAI DALL-E based on content context
 */
async function generateOpenAIImage(headline: string, context: string, topic: string): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.log("[Content Pipeline] OPENAI_API_KEY not configured, cannot generate image");
    return null;
  }

  try {
    // Create a descriptive image prompt from the content
    const imagePrompt = `High-quality realistic editorial style image for news article: ${headline}. Context: ${context}. Cinematic lighting, magazine cover aesthetic, professional photography, vibrant colors.`;
    
    console.log("[Content Pipeline] Generating image with DALL-E...");
    
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      }),
    });

    if (imageResponse.ok) {
      const imageData = await imageResponse.json();
      const imageUrl = imageData.data?.[0]?.url;
      if (imageUrl) {
        console.log("[Content Pipeline] Successfully generated image with DALL-E");
        return imageUrl;
      }
    } else {
      const error = await imageResponse.text();
      console.error(`[Content Pipeline] DALL-E image generation failed: ${imageResponse.status}`, error);
    }
  } catch (error) {
    console.error("[Content Pipeline] Error generating image:", error);
  }

  return null;
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

IMPORTANT REQUIREMENTS:
- Headline MUST include relevant emojis (1-2 emojis max, choose wisely based on the topic)
- Keep summaries very concise and friendly (max 150 chars)
- Context should be brief but informative (max 250 chars)
- Narration should be conversational and friendly (50-70 words)

Return valid JSON with this structure:
{
  "headline": "string with emojis (max 100 chars, catchy and clear)",
  "summary": "string (max 150 chars, very brief and friendly overview)",
  "context": "string (max 250 chars, key details)",
  "narration": "string (50-70 words, friendly conversational style)"
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

    // Generate content for 30 topics each cycle
    const topicsToProcess = topics.slice(0, 30);

    for (const topic of topicsToProcess) {
      try {
        console.log(`[Content Pipeline] Generating content for: ${topic}`);

        // Generate AI summary
        const aiContent = await generateAISummary(topic);

        // Fetch article to get source image
        const articleData = await fetchArticleWithImage(topic);
        
        // Determine image URL: prioritize source image, then generate with OpenAI
        let finalImageUrl: string | null = articleData.image_url;
        
        if (!finalImageUrl) {
          console.log(`[Content Pipeline] No source image found, generating with DALL-E...`);
          finalImageUrl = await generateOpenAIImage(aiContent.headline, aiContent.context, topic);
        }

        // Prepare gist data
        const now = new Date().toISOString();
        const gistData: GistData = {
          topic,
          topic_category: "Trending",
          headline: aiContent.headline,
          context: aiContent.context,
          narration: aiContent.narration,
          script: aiContent.narration, // Use narration as script
          image_url: finalImageUrl,
          source_url: articleData.url,
          audio_url: "", // Empty string as default (required field)
          status: "published",
          published_at: now,
          created_at: now,
          meta: {
            generated_by: "content_pipeline",
            generated_at: now,
            summary: aiContent.summary, // Store summary in meta for reference
            image_source: articleData.image_url ? "source_article" : "openai_dalle",
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

