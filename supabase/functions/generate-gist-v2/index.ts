import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders, createResponse, createErrorResponse, parseBody } from '../_shared/http.ts'
import { getCache, setCache, generateCacheKey } from '../_shared/cache.ts'
import { env, ensureSupabaseEnv } from '../_shared/env.ts'

interface Article {
  title: string
  description?: string
  content?: string
  url?: string
  image?: string
  source?: string
  published_at?: string
}

const MAX_ARTICLE_TEXT_LENGTH = 4000

const sanitizeArticleText = (text?: string) => {
  if (!text) return ''
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const topicSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long')
})

serve(async (req) => {
  console.log('🚀 generate-gist-v2 started')
  
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    const body = await parseBody(req)
    const validated = topicSchema.parse(body)
    const { topic } = validated

    console.log('📝 Topic received:', topic)

    // Check cache first
    const cacheKey = generateCacheKey('gist', topic)
    const cached = await getCache(cacheKey)
    if (cached) {
      console.log('✅ Using cached gist for:', topic)
      return createResponse(cached)
    }

    // Step 1: Gather sources (call gather-sources-v2)
    ensureSupabaseEnv();
    const supabaseUrl = env.SUPABASE_URL
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('📰 Gathering sources...')
    const sourcesResponse = await fetch(`${supabaseUrl}/functions/v1/gather-sources-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ topic }),
    })

    if (!sourcesResponse.ok) {
      throw new Error('Failed to gather sources')
    }

    const sourcesData = await sourcesResponse.json()
    const selectedArticle = sourcesData.selected as Article | null
    const usingApiContent = Boolean(selectedArticle)

    if (usingApiContent) {
      console.log('✅ Using API article from', selectedArticle?.source)
    } else {
      console.log('⚠️ No API article found, using OpenAI for creative generation')
    }

    // Step 2: Generate content with OpenAI (only if no external content OR to enhance it)
    const openaiApiKey = env.OPENAI_API_KEY
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const openaiModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'

    // Detect if topic is about a celebrity
    const isCelebrity = /drake|taylor swift|messi|rihanna|beyonce|kanye|cristiano|ronaldo|lebron|kim kardashian|ariana grande|justin bieber|selena gomez|bad bunny|dua lipa/i.test(topic)
    
    const currentTime = new Date().toLocaleString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })

    const articleText = selectedArticle
      ? sanitizeArticleText([
          selectedArticle.title,
          selectedArticle.description,
          selectedArticle.content,
        ]
          .filter(Boolean)
          .join('\n\n'))
          .slice(0, MAX_ARTICLE_TEXT_LENGTH)
      : ''

    const baseSystemPrompt = `You are Fluxa, my social gist bestie. Write updates like you're texting me directly in a chat, not reporting on TV.

Today's date is ${currentTime}.

CRITICAL RULES:
- ALWAYS respond with valid JSON containing: headline, context, narration, image_keyword.
- Tone: Casual, playful, and friendly. Like you're talking to one person (me), not an audience.
- You can react a bit ("low-key wild", "kinda messy", "this is actually cool") but don't be cringe.
- Narration must be 60-90 words written as if texting a friend:
  * Start with 1 sentence "quick take" (like a DM intro)
  * 2-3 short paragraphs max, each 1-3 sentences
  * No bullet points, no section titles
  * Talk to me as "you", refer to yourself as "I"
  * Include one playful interjection naturally
- Context should be punchy (under 200 characters) and globally understandable.
- If ARTICLE_TEXT is provided, rely strictly on those facts. Do not invent information or mention limitations.
- CRITICAL SPORT CONTEXT RULES:
  * "Premier League" = English soccer/football (teams: Arsenal, Man United, Liverpool, Chelsea, Man City, Tottenham, etc.)
  * "NFL" or "American football" = American football (teams: Giants, Lions, Colts, Chiefs, Jets, Ravens, Patriots, etc.)
  * NEVER mix Premier League (soccer) with American football teams
  * If topic mentions a specific sport/league, ALL team names and context MUST match that sport exactly
  * Double-check team names belong to the correct sport before including them
- Avoid formal phrases like "In a bold move" or "In a statement today". Keep it chatty.
- Never include sensitive accusations or disclaimers about missing data.`

    const messages = usingApiContent
      ? [
          { role: 'system', content: baseSystemPrompt + '\nYou have verified ARTICLE_TEXT from our content APIs. Write this like you\'re DMing me about something cool you just read.' },
          {
            role: 'user',
            content: `TOPIC: ${topic}
SOURCE: ${selectedArticle?.source || 'Unknown'}
PUBLISHED_AT: ${selectedArticle?.published_at || 'Unknown'}
URL: ${selectedArticle?.url || 'Unknown'}

ARTICLE_TEXT:
${articleText}`,
          },
        ]
      : [
          { role: 'system', content: baseSystemPrompt + '\nNo article text is available. Craft a plausible, timely update anyway, written like a friendly DM.' },
          {
            role: 'user',
            content: `Create an engaging gist about: ${topic}. Make it exciting and plausible, focusing on their current season/projects/activity. Write it like you're texting me about something cool you just heard.`,
          },
        ]

    console.log('🤖 Calling OpenAI API (' + openaiModel + ')...')
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        messages,
        response_format: { type: 'json_object' }
      }),
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('[AI] Generation failed:', aiResponse.status, errorText)
      throw new Error(`OpenAI API error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const messageContent = aiData.choices[0].message.content
    
    let content
    try {
      content = JSON.parse(messageContent)
    } catch (parseError) {
      throw new Error('AI returned invalid JSON')
    }

    // Step 3: AI Image Generation - ONLY as emergency fallback (VERY expensive, avoid!)
    let generatedImageUrl = null

    // NEVER generate AI images unless absolutely necessary
    // Check if we have a valid source image URL
    const hasSourceImage = selectedArticle?.image && 
                          selectedArticle.image.trim() !== '' && 
                          selectedArticle.image !== 'null' &&
                          !selectedArticle.image.toLowerCase().includes('placeholder')

    // Only generate AI image if:
    // 1. No API content was found AND
    // 2. No source image exists (or source image is invalid)
    const shouldGenerateImage = !usingApiContent && !hasSourceImage

    if (shouldGenerateImage) {
      console.log('🚨 EMERGENCY: No source content or image available, generating minimal AI image...')
      try {
        const imagePrompt = `Simple ${content.image_keyword || topic} illustration, minimal, clean design`

        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: imagePrompt,
            n: 1,
            size: '512x512', // Smaller size to save costs
            quality: 'standard',
            response_format: 'url'
          }),
        })

        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          const imageUrl = imageData.data?.[0]?.url
          if (imageUrl) {
            generatedImageUrl = imageUrl
            console.log('🧠 Generated emergency AI image (this should be rare!)')
          }
        }
      } catch (error) {
        console.log('⚠️ Failed to generate emergency image:', error instanceof Error ? error.message : 'Unknown error')
      }
    } else {
      if (hasSourceImage) {
        console.log('✅ Source image available - skipping AI image generation')
      } else if (usingApiContent) {
        console.log('✅ Using API content - no AI image generation needed')
      } else {
        console.log('✅ No AI image generation needed')
      }
    }

    // Create different summary lengths
    const fullContext = content.context || "";
    const summary = fullContext.length > 150 ? fullContext.slice(0, 150).trim() + "..." : fullContext;

    const result = {
      headline: content.headline,
      summary: summary, // Short version for Feed cards
      context: fullContext, // Medium version for PostDetail
      narration: content.narration, // Full friendly version for deep dives
      image_keyword: content.image_keyword || 'trending news',
      ai_generated_image: generatedImageUrl,
      is_celebrity: isCelebrity,
      source_url: selectedArticle?.url || null,
      source_title: selectedArticle?.title || null,
      source_excerpt: selectedArticle?.description || null,
      source_name: selectedArticle?.source || null,
      source_published_at: selectedArticle?.published_at || null,
      source_image_url: selectedArticle?.image || null,
      used_api_article: usingApiContent,
    }

    // Cache result for 1 hour
    await setCache(cacheKey, result, 3600)

    return createResponse(result)
  } catch (error) {
    console.error('[ERROR] generate-gist-v2 failed:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to generate gist',
      500
    )
  }
})
