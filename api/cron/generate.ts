/**
 * Vercel cron endpoint for content generation
 * 
 * CRITICAL ARCHITECTURE:
 * - APIs are the ONLY content source
 * - OpenAI is for SUMMARIZATION ONLY, never content generation
 * - Posts are rejected if no API content is found
 * 
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/generate",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface Article {
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string | null;
  source?: string;
  published_at?: string | null;
}

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
 * Fetch articles from Mediastack via RapidAPI (PRIORITY 1)
 */
async function fetchMediastackRapidApiArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log(`[API Fetch] Mediastack RapidAPI: RAPIDAPI_KEY not configured`);
    return [];
  }

  try {
    const host = 'mediastack.p.rapidapi.com';
    const url = `https://mediastack.p.rapidapi.com/v1/news?keywords=${encodeURIComponent(topic)}&languages=en&limit=5&sort=published_desc`;
    
    // Debug log before fetch
    console.log(`[RapidAPI Debug] adapter=mediastack url=${url} host=${host} hasKey=${!!apiKey}`);
    console.log(`[API Fetch] Using adapter: mediastack (rapidapi)`);
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      console.log(`[API Fetch] Mediastack RapidAPI error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.data || []).map((article: any) => ({
      title: article.title,
      description: article.description,
      content: article.description,
      url: article.url,
      image: article.image || null,
      source: article.source || 'Mediastack (RapidAPI)',
      published_at: article.published_at || null,
    }));
  } catch (error) {
    console.error("[API Fetch] Mediastack RapidAPI error:", error);
    return [];
  }
}

/**
 * Fetch articles from NewsAPI via RapidAPI (PRIORITY 2)
 */
async function fetchNewsApiRapidApiArticles(topic: string): Promise<Article[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log(`[API Fetch] NewsAPI RapidAPI: RAPIDAPI_KEY not configured`);
    return [];
  }

  try {
    const host = 'newsapi.org';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&sortBy=publishedAt&pageSize=5`;
    
    // Debug log before fetch
    console.log(`[RapidAPI Debug] adapter=newsapi url=${url} host=${host} hasKey=${!!apiKey}`);
    console.log(`[API Fetch] Using adapter: newsapi (rapidapi)`);
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!response.ok) {
      console.log(`[API Fetch] NewsAPI RapidAPI error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.articles || []).map((article: any) => ({
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      image: article.urlToImage || null,
      source: article.source?.name || 'NewsAPI (RapidAPI)',
      published_at: article.publishedAt || null,
    }));
  } catch (error) {
    console.error("[API Fetch] NewsAPI RapidAPI error:", error);
    return [];
  }
}

/**
 * Fetch articles from all APIs (sequential: Mediastack RapidAPI → NewsAPI RapidAPI)
 * MANDATORY: Must return at least one article, otherwise generation fails
 * NOTE: Guardian and expired adapters are removed - only active RapidAPI sources are used
 */
async function fetchArticlesFromApis(topic: string): Promise<Article[]> {
  let articles: Article[] = [];

  // Try Mediastack RapidAPI first (PRIORITY 1)
  console.log(`[API Fetch] Fetching from Mediastack RapidAPI for: ${topic}`);
  const mediastack = await fetchMediastackRapidApiArticles(topic);
  if (mediastack.length > 0) {
    console.log(`[API Fetch] ✅ Found ${mediastack.length} articles from Mediastack RapidAPI`);
    articles = [...articles, ...mediastack];
    return articles;
  }

  // Try NewsAPI RapidAPI if Mediastack returned nothing (PRIORITY 2)
  console.log(`[API Fetch] ⚠️ No articles from Mediastack RapidAPI, trying NewsAPI RapidAPI...`);
  const newsapi = await fetchNewsApiRapidApiArticles(topic);
  if (newsapi.length > 0) {
    console.log(`[API Fetch] ✅ Found ${newsapi.length} articles from NewsAPI RapidAPI`);
    articles = [...articles, ...newsapi];
    return articles;
  }

  console.log(`[API Fetch] ❌ No articles from any external API for: ${topic}`);
  return [];
}

/**
 * Validate article freshness - reject articles older than 7 days
 */
function isValidFreshArticle(article: Article): boolean {
  if (!article.published_at) return false;

  const publishedDate = new Date(article.published_at);
  const now = new Date();
  const daysSincePublished = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSincePublished > 7) {
    console.log(`[Validation] ❌ Article too old: ${daysSincePublished.toFixed(1)} days`);
    return false;
  }

  return true;
}

/**
 * Summarize fetched article content using OpenAI
 * CRITICAL: OpenAI is ONLY for summarization, not content generation
 */
async function summarizeArticleWithAI(article: Article, topic: string): Promise<{
  headline: string;
  summary: string;
  context: string;
  narration: string;
} | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Build article text for summarization
  const articleText = [
    `Title: ${article.title}`,
    article.description ? `Description: ${article.description}` : '',
    article.content ? `Content: ${article.content.substring(0, 2000)}` : '',
  ].filter(Boolean).join('\n\n');

  const systemPrompt = `You are Fluxa, a social gist assistant. Your job is to SUMMARIZE real news articles in a casual, friendly tone.

CRITICAL RULES:
- You are SUMMARIZING existing content, NOT creating new content
- Use ONLY information from the provided article
- Do NOT invent facts, dates, names, or details not in the article
- Keep the friendly, conversational tone like you're texting a friend
- Headline MUST include relevant emojis (1-2 emojis max)
- Summary must be very concise and friendly (max 150 chars)
- Context should be brief but informative (max 250 chars)
- Narration should be conversational and friendly (50-70 words)

Return valid JSON with this structure:
{
  "headline": "string with emojis (max 100 chars, catchy and clear)",
  "summary": "string (max 150 chars, very brief and friendly overview)",
  "context": "string (max 250 chars, key details from article)",
  "narration": "string (50-70 words, friendly conversational summary)"
}`;

  const userPrompt = `Summarize this real news article about: ${topic}

ARTICLE TO SUMMARIZE:
${articleText}

Remember: You are SUMMARIZING this article, not creating new content. Use only facts from the article above.`;

  try {
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
          { role: "user", content: userPrompt },
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
  } catch (error) {
    console.error("[AI Summary] Error summarizing article:", error);
    return null;
  }
}

/**
 * Generate image using OpenAI DALL-E (LAST RESORT ONLY)
 * Only called if source article has no image
 */
async function generateOpenAIImage(headline: string, context: string): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return null;
  }

  try {
    const imagePrompt = `High-quality realistic editorial style image for news article: ${headline}. Context: ${context}. Cinematic lighting, magazine cover aesthetic, professional photography, vibrant colors.`;

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
        console.log("[AI Image] Generated fallback image with DALL-E");
        return imageUrl;
      }
    }
  } catch (error) {
    console.error("[AI Image] Error generating image:", error);
  }

  return null;
}

async function insertGist(gistData: GistData): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing Supabase credentials");
  }

  const { createClient } = await import("@supabase/supabase-js");

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error, data } = await supabase.from("gists").insert(gistData).select();

  if (error) {
    console.error('[insertGist] Insert failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Database insert failed: ${error.message} (code: ${error.code})`);
  }

  const insertedId = data?.[0]?.id || null;
  if (!insertedId) {
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
  console.log("[Content Pipeline] Starting generation with API-first approach...");

  const errors: string[] = [];
  const insertedIds: string[] = [];
  let generated = 0;
  let skipped = 0;

  try {
    const topics = getTrendingTopics();
    console.log(`[Content Pipeline] Processing ${topics.length} topics`);

    const topicsToProcess = topics.slice(0, 30);

    for (const topic of topicsToProcess) {
      try {
        console.log(`\n[Content Pipeline] Processing: ${topic}`);

        // STEP 1: Fetch from APIs (MANDATORY)
        const articles = await fetchArticlesFromApis(topic);

        // GUARD: Reject if no API content found
        if (articles.length === 0) {
          const errorMsg = `No API content found for topic: ${topic}`;
          console.log(`[Content Pipeline] ❌ ${errorMsg} - SKIPPING`);
          errors.push(errorMsg);
          skipped++;
          continue;
        }

        // STEP 2: Select and validate the freshest article
        const validArticles = articles.filter(isValidFreshArticle);
        if (validArticles.length === 0) {
          const errorMsg = `No fresh articles (< 7 days) found for topic: ${topic}`;
          console.log(`[Content Pipeline] ❌ ${errorMsg} - SKIPPING`);
          errors.push(errorMsg);
          skipped++;
          continue;
        }

        // Use the freshest article
        const selectedArticle = validArticles[0];
        console.log(`[Content Pipeline] ✅ Selected article: "${selectedArticle.title}" from ${selectedArticle.source}`);

        // STEP 3: Summarize with OpenAI (ONLY if we have API content)
        console.log(`[Content Pipeline] Summarizing article with OpenAI...`);
        const aiSummary = await summarizeArticleWithAI(selectedArticle, topic);

        if (!aiSummary) {
          const errorMsg = `Failed to summarize article for topic: ${topic}`;
          console.log(`[Content Pipeline] ❌ ${errorMsg} - SKIPPING`);
          errors.push(errorMsg);
          skipped++;
          continue;
        }

        // STEP 4: Determine image (source FIRST, AI as fallback)
        let finalImageUrl: string | null = selectedArticle.image || null;

        if (!finalImageUrl) {
          console.log(`[Content Pipeline] ⚠️ No source image, using AI image as last resort...`);
          finalImageUrl = await generateOpenAIImage(aiSummary.headline, aiSummary.context);
        } else {
          console.log(`[Content Pipeline] ✅ Using source image from article`);
        }

        // STEP 5: Prepare gist data with source metadata
        const now = new Date().toISOString();
        const articlePublishedAt = selectedArticle.published_at || now;

        const gistData: GistData = {
          topic,
          topic_category: "Trending",
          headline: aiSummary.headline,
          context: aiSummary.summary,
          narration: aiSummary.narration,
          script: aiSummary.narration,
          image_url: finalImageUrl,
          source_url: selectedArticle.url,
          audio_url: "",
          status: "published",
          published_at: articlePublishedAt,
          created_at: now,
          meta: {
            generated_by: "content_pipeline",
            generated_at: now,
            source_name: selectedArticle.source || 'Unknown',
            source_title: selectedArticle.title,
            image_source: selectedArticle.image ? "source_article" : "openai_dalle",
            summary: aiSummary.summary,
          },
        };

        // STEP 6: Insert into database
        const insertedId = await insertGist(gistData);
        if (insertedId) {
          insertedIds.push(insertedId);
          generated++;
          console.log(`[Content Pipeline] ✅ Successfully generated: ${aiSummary.headline}`);
        } else {
          console.error(`[Content Pipeline] Insert returned no ID for: ${topic}`);
          errors.push(`${topic}: Insert completed but no ID returned`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[Content Pipeline] Error processing topic "${topic}":`, errorMsg);
        errors.push(`${topic}: ${errorMsg}`);
      }
    }

    console.log(`\n[Content Pipeline] Complete. Generated: ${generated}, Skipped: ${skipped}, Errors: ${errors.length}`);

    return {
      success: errors.length === 0 || generated > 0,
      generated,
      errors,
      insertedIds,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Content Pipeline] Fatal error:", errorMsg);
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
  // Verify cron secret if configured
  // Vercel cron jobs can send secret via query param or Authorization header
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const requestSecret = authHeader?.replace('Bearer ', '') || req.query.secret as string | undefined;
  
  // Also check for Vercel cron header (if present)
  const vercelCronSecret = req.headers['x-vercel-cron-secret'] as string | undefined;

  // Allow if no secret is configured (for development) OR if secret matches
  if (cronSecret) {
    const providedSecret = requestSecret || vercelCronSecret;
    if (!providedSecret || providedSecret !== cronSecret) {
      console.warn('[Cron Generate] Unauthorized - missing or invalid secret', {
        hasQuerySecret: !!req.query.secret,
        hasAuthHeader: !!authHeader,
        hasVercelHeader: !!vercelCronSecret,
      });
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    const result = await runContentPipeline();

    return res.status(200).json({
      success: result.success,
      generated: result.generated,
      inserted: result.insertedIds?.length || 0,
      insertedIds: result.insertedIds || [],
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
