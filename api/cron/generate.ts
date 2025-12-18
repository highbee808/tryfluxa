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

interface ContentItemData {
  source_id: string;
  external_id: string;
  content_hash: string;
  title: string;
  url: string | null;
  excerpt: string | null;
  published_at: string | null;
  image_url: string | null;
  raw_data: Record<string, any>;
}

// AI Generated content source ID (created in content_sources table)
const AI_GENERATED_SOURCE_ID = 'c28d4e44-862b-4aa8-80b6-a228be1faa39';

// Category mapping from topic keywords to category IDs
const CATEGORY_MAPPINGS: Record<string, string> = {
  // Technology
  'tech': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'ai': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'artificial intelligence': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'iphone': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'gaming': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'cryptocurrency': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'electric vehicle': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'spacex': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  'streaming': 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc',
  // Sports
  'nba': '9957e028-96ff-418d-ae68-f1bb28ac6b04',
  'sports': '9957e028-96ff-418d-ae68-f1bb28ac6b04',
  'olympic': '9957e028-96ff-418d-ae68-f1bb28ac6b04',
  'championship': '9957e028-96ff-418d-ae68-f1bb28ac6b04',
  'trade': '9957e028-96ff-418d-ae68-f1bb28ac6b04',
  'injury': '9957e028-96ff-418d-ae68-f1bb28ac6b04',
  // Entertainment
  'taylor swift': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'hollywood': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'celebrity': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'movie': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'music festival': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'album': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'award': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'fashion': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  'entertainment': '5bc3c4e4-673c-47eb-b2ef-df5e31650525',
  // Business
  'business': '401b13f7-de61-420c-ad37-c4e240d101ed',
  'startup': '401b13f7-de61-420c-ad37-c4e240d101ed',
  'funding': '401b13f7-de61-420c-ad37-c4e240d101ed',
  'merger': '401b13f7-de61-420c-ad37-c4e240d101ed',
  'layoff': '401b13f7-de61-420c-ad37-c4e240d101ed',
  // Science
  'science': 'e1e60d85-f41e-4655-96bc-ed9fbcdac21b',
  'breakthrough': 'e1e60d85-f41e-4655-96bc-ed9fbcdac21b',
  'renewable energy': 'e1e60d85-f41e-4655-96bc-ed9fbcdac21b',
  'climate': 'e1e60d85-f41e-4655-96bc-ed9fbcdac21b',
  // Health
  'health': '40d68808-06b4-4f0c-9c24-48b9ca3434a2',
  'wellness': '40d68808-06b4-4f0c-9c24-48b9ca3434a2',
  // Politics
  'political': 'd46b854c-6855-4ba4-9bc2-701d83f6b21f',
  'summit': 'd46b854c-6855-4ba4-9bc2-701d83f6b21f',
  // World
  'travel': '394390ee-e860-4192-94fc-f28896728ded',
  'food': '394390ee-e860-4192-94fc-f28896728ded',
  'restaurant': '394390ee-e860-4192-94fc-f28896728ded',
};

// Default to Technology category
const DEFAULT_CATEGORY_ID = 'aaeae3ba-08cb-46c9-94aa-30c738cf4adc';

/**
 * Generate a content hash for deduplication
 */
function generateContentHash(title: string, url: string | null): string {
  const input = `${title.toLowerCase().trim()}|${url || ''}`;
  // Simple hash function for deduplication
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `ai_${Math.abs(hash).toString(16)}`;
}

/**
 * Map topic to category ID based on keywords
 */
function mapTopicToCategory(topic: string): string {
  const lowerTopic = topic.toLowerCase();
  for (const [keyword, categoryId] of Object.entries(CATEGORY_MAPPINGS)) {
    if (lowerTopic.includes(keyword)) {
      return categoryId;
    }
  }
  return DEFAULT_CATEGORY_ID;
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
 * Fetch articles from NewsX via RapidAPI (PRIORITY 1)
 * Uses NEWSX_API or RAPIDAPI_KEY env var
 * Host: newsx.p.rapidapi.com
 * Endpoint: /search/?limit=10&skip=0
 */
async function fetchNewsXArticles(topic: string): Promise<Article[]> {
  // Try NEWSX_API first, then fallback to RAPIDAPI_KEY
  const apiKey = process.env.NEWSX_API || process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log(`[API Fetch] NewsX: No API key found (checked NEWSX_API, RAPIDAPI_KEY)`);
    return [];
  }

  try {
    const host = 'newsx.p.rapidapi.com';
    const url = `https://newsx.p.rapidapi.com/search/?q=${encodeURIComponent(topic)}&limit=10&skip=0`;
    
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
      return [];
    }

    const data = await response.json();
    
    // NewsX returns articles as an array directly
    let articles: any[] = [];
    if (Array.isArray(data)) {
      articles = data;
    } else if (Array.isArray(data?.articles)) {
      articles = data.articles;
    } else if (Array.isArray(data?.news)) {
      articles = data.news;
    } else if (Array.isArray(data?.data)) {
      articles = data.data;
    } else if (Array.isArray(data?.results)) {
      articles = data.results;
    } else {
      return [];
    }
    
    return articles.slice(0, 10).map((article: any) => ({
      title: article.title || '',
      description: article.description || article.summary || article.body || '',
      content: article.content || article.description || article.body || '',
      url: article.url || article.link || article.sourceUrl || '',
      image: article.image || article.urlToImage || article.thumbnail || article.img || null,
      source: article.source?.name || article.source || article.publisher || 'NewsX',
      // Try more date field variations
      published_at: article.publishedAt || article.published_at || article.date || article.pubDate || article.time || article.createdAt || null,
    })).filter((a: Article) => a.title && a.url);
  } catch (error) {
    console.error("[API Fetch] NewsX error:", error);
    return [];
  }
}

/**
 * Fetch articles from Webit News Search via RapidAPI (PRIORITY 2)
 * Uses WEBIT_NEWS_API or RAPIDAPI_KEY env var
 * Host: webit-news-search.p.rapidapi.com
 * Endpoint: /search?q=keyword
 */
async function fetchWebitNewsArticles(topic: string): Promise<Article[]> {
  // Try WEBIT_NEWS_API first, then fallback to RAPIDAPI_KEY
  const apiKey = process.env.WEBIT_NEWS_API || process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    console.log(`[API Fetch] Webit News: No API key found (checked WEBIT_NEWS_API, RAPIDAPI_KEY)`);
    return [];
  }

  try {
    const host = 'webit-news-search.p.rapidapi.com';
    const url = `https://webit-news-search.p.rapidapi.com/search?q=${encodeURIComponent(topic)}&language=en`;
    
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
      return [];
    }

    const data = await response.json();
    
    // Extract articles array from various possible response structures
    let articles: any[] = [];
    if (Array.isArray(data)) {
      articles = data;
    } else if (Array.isArray(data?.articles)) {
      articles = data.articles;
    } else if (Array.isArray(data?.data)) {
      articles = data.data;
    } else if (Array.isArray(data?.news)) {
      articles = data.news;
    } else if (Array.isArray(data?.results)) {
      articles = data.results;
    } else if (Array.isArray(data?.value)) {
      articles = data.value;
    } else {
      return [];
    }
    
    return articles.slice(0, 10).map((article: any) => ({
      title: article.title || '',
      description: article.description || article.snippet || article.summary || '',
      content: article.content || article.description || '',
      url: article.url || article.link || '',
      image: article.urlToImage || article.image || article.thumbnail || null,
      source: article.source?.name || article.source || 'Webit News',
      published_at: article.publishedAt || article.published_at || article.date || null,
    })).filter((a: Article) => a.title && a.url);
  } catch (error) {
    console.error("[API Fetch] Webit News error:", error);
    return [];
  }
}

/**
 * Fetch articles from all APIs (sequential: NewsX → Webit News)
 * MANDATORY: Must return at least one article, otherwise generation fails
 * NOTE: Uses RapidAPI adapters that the user has subscribed to (NEWSX_API, WEBIT_NEWS_API)
 */
async function fetchArticlesFromApis(topic: string): Promise<Article[]> {
  let articles: Article[] = [];

  // Try NewsX first (PRIORITY 1) - user has NEWSX_API
  console.log(`[API Fetch] Fetching from NewsX RapidAPI for: ${topic}`);
  const newsx = await fetchNewsXArticles(topic);
  if (newsx.length > 0) {
    console.log(`[API Fetch] ✅ Found ${newsx.length} articles from NewsX`);
    articles = [...articles, ...newsx];
    return articles;
  }

  // Try Webit News if NewsX returned nothing (PRIORITY 2)
  console.log(`[API Fetch] ⚠️ No articles from NewsX, trying Webit News...`);
  const webitNews = await fetchWebitNewsArticles(topic);
  if (webitNews.length > 0) {
    console.log(`[API Fetch] ✅ Found ${webitNews.length} articles from Webit News`);
    articles = [...articles, ...webitNews];
    return articles;
  }

  console.log(`[API Fetch] ❌ No articles from any external API for: ${topic}`);
  return [];
}

/**
 * Validate article freshness - reject articles older than 7 days
 * Accepts articles without dates or with invalid date formats
 */
function isValidFreshArticle(article: Article): boolean {
  // Accept articles without dates
  if (!article.published_at) {
    return true;
  }

  const publishedDate = new Date(article.published_at);
  
  // Accept articles with invalid date formats
  if (isNaN(publishedDate.getTime())) {
    return true;
  }
  
  const now = new Date();
  const daysSincePublished = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

  // Reject articles older than 7 days
  return daysSincePublished <= 7;
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

/**
 * Insert content into content_items table (PRIMARY feed source)
 * Also creates the category mapping in content_item_categories
 */
async function insertContentItem(
  contentData: ContentItemData,
  categoryId: string
): Promise<string | null> {
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

  // Check for existing content with same hash (deduplication)
  const { data: existing } = await supabase
    .from('content_items')
    .select('id')
    .eq('content_hash', contentData.content_hash)
    .maybeSingle();

  if (existing) {
    console.log(`[insertContentItem] Duplicate detected (hash: ${contentData.content_hash}), skipping`);
    return null;
  }

  // Insert into content_items
  const { error, data } = await supabase
    .from("content_items")
    .insert(contentData)
    .select();

  if (error) {
    console.error('[insertContentItem] Insert failed:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Database insert failed: ${error.message} (code: ${error.code})`);
  }

  const insertedId = data?.[0]?.id || null;
  if (!insertedId) {
    console.error('[insertContentItem] Insert succeeded but no ID returned', { data });
    return null;
  }

  // Insert category mapping
  const { error: categoryError } = await supabase
    .from('content_item_categories')
    .insert({
      content_item_id: insertedId,
      category_id: categoryId,
    });

  if (categoryError) {
    console.warn('[insertContentItem] Category mapping failed:', categoryError.message);
    // Don't fail the whole operation for category mapping
  }

  console.log(`[insertContentItem] ✅ Inserted into content_items: ${contentData.title.substring(0, 50)}...`);
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

        // STEP 5: Prepare content_item data (PRIMARY feed source)
        const now = new Date().toISOString();
        // IMPORTANT: Always set published_at to current time if source has no date
        // The feed sorts by published_at DESC, so null values go to the END
        const articlePublishedAt = selectedArticle.published_at || now;
        
        // Map topic to category
        const categoryId = mapTopicToCategory(topic);
        
        // Generate content hash for deduplication
        const contentHash = generateContentHash(aiSummary.headline, selectedArticle.url);
        
        const contentItemData: ContentItemData = {
          source_id: AI_GENERATED_SOURCE_ID,
          external_id: `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          content_hash: contentHash,
          title: aiSummary.headline,
          url: selectedArticle.url,
          excerpt: aiSummary.summary,
          published_at: articlePublishedAt,
          image_url: finalImageUrl,
          raw_data: {
            generated_by: "content_pipeline",
            generated_at: now,
            topic: topic,
            source_name: selectedArticle.source || 'Unknown',
            source_title: selectedArticle.title,
            image_source: selectedArticle.image ? "source_article" : "openai_dalle",
            narration: aiSummary.narration,
            context: aiSummary.context,
          },
        };

        // STEP 6: Insert into content_items (PRIMARY feed source)
        console.log(`[Content Pipeline] Inserting into content_items: title="${contentItemData.title.substring(0,50)}" category=${categoryId}`);
        const insertedId = await insertContentItem(contentItemData, categoryId);
        if (insertedId) {
          insertedIds.push(insertedId);
          generated++;
          console.log(`[Content Pipeline] ✅ Inserted into content_items: id=${insertedId} title="${aiSummary.headline.substring(0,50)}"`);
        } else {
          // Duplicate was detected, count as skipped not error
          console.log(`[Content Pipeline] ⚠️ Skipped duplicate: ${topic}`);
          skipped++;
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
