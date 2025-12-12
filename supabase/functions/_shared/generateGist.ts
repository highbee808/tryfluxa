// Shared gist generation logic - can be called directly without HTTP
// This eliminates auth issues from cross-function HTTP calls

interface Article {
  title: string
  description?: string
  content?: string
  url?: string
  image?: string
  source?: string
  published_at?: string
}

export interface GenerateGistResult {
  headline: string
  summary: string
  context: string
  narration: string
  image_keyword?: string | null
  ai_generated_image?: string | null
  is_celebrity?: boolean | null
  source_url?: string | null
  source_title?: string | null
  source_excerpt?: string | null
  source_name?: string | null
  source_published_at?: string | null
  source_image_url?: string | null
  used_api_article?: boolean | null
}

const MAX_ARTICLE_TEXT_LENGTH = 4000

const sanitizeArticleText = (text?: string) => {
  if (!text) return ''
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Generate gist content using OpenAI and optional article sources
 * This is the core logic extracted from generate-gist-v2 to avoid HTTP calls
 */
export async function generateGistContent(
  topic: string,
  options: {
    supabaseUrl: string
    serviceKey: string
    openaiApiKey: string
    openaiModel?: string
    skipCache?: boolean
  }
): Promise<GenerateGistResult> {
  const { supabaseUrl, serviceKey, openaiApiKey, openaiModel = 'gpt-4o-mini', skipCache = false } = options

  // Step 1: Gather sources (call gather-sources-v2)
  console.log('[generateGist] Gathering sources...', { topic })
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
    const errorText = await sourcesResponse.text()
    throw new Error(`Failed to gather sources: ${sourcesResponse.status} - ${errorText}`)
  }

  const sourcesData = await sourcesResponse.json()
  const selectedArticle = sourcesData.selected as Article | null
  const usingApiContent = Boolean(selectedArticle)

  if (usingApiContent) {
    console.log('[generateGist] Using API article from', selectedArticle?.source)
  } else {
    console.log('[generateGist] No API article found, using OpenAI for creative generation')
  }

  // Step 2: Generate content with OpenAI
  if (!openaiApiKey || openaiApiKey.trim() === '') {
    throw new Error('Missing OPENAI_API_KEY in environment')
  }

  if (!openaiApiKey.startsWith('sk-')) {
    throw new Error('Invalid OPENAI_API_KEY format (should start with sk-)')
  }

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

  console.log('[generateGist] Calling OpenAI API...', { model: openaiModel })
  
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
    let errorDetails: any
    try {
      errorDetails = JSON.parse(errorText)
    } catch {
      errorDetails = { raw: errorText }
    }
    
    console.error('[generateGist] OpenAI API call failed:', {
      status: aiResponse.status,
      statusText: aiResponse.statusText,
      error: errorDetails,
    })
    
    if (aiResponse.status === 401) {
      throw new Error('OpenAI API authentication failed - check OPENAI_API_KEY is valid')
    } else if (aiResponse.status === 429) {
      throw new Error('OpenAI API rate limit exceeded - please try again later')
    } else if (aiResponse.status === 500) {
      throw new Error('OpenAI API server error - please try again later')
    } else {
      throw new Error(`OpenAI API error: ${aiResponse.status} - ${errorDetails.error?.message || errorText}`)
    }
  }

  const aiData = await aiResponse.json()
  
  if (!aiData.choices || !aiData.choices[0] || !aiData.choices[0].message) {
    throw new Error('OpenAI returned invalid response structure')
  }
  
  const messageContent = aiData.choices[0].message.content
  
  if (!messageContent) {
    throw new Error('OpenAI returned no content')
  }

  // Parse JSON content from OpenAI response
  let content: any
  try {
    content = JSON.parse(messageContent)
  } catch (parseError) {
    throw new Error(`AI returned invalid JSON: ${parseError instanceof Error ? parseError.message : 'Parse error'}`)
  }

  // Step 3: AI Image Generation - ONLY as emergency fallback
  let generatedImageUrl = null

  const hasSourceImage = selectedArticle?.image && 
                        selectedArticle.image.trim() !== '' && 
                        selectedArticle.image !== 'null' &&
                        !selectedArticle.image.toLowerCase().includes('placeholder')

  const shouldGenerateImage = !usingApiContent && !hasSourceImage

  if (shouldGenerateImage) {
    console.log('[generateGist] EMERGENCY: Generating minimal AI image...')
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
          size: '512x512',
          quality: 'standard',
          response_format: 'url'
        }),
      })

      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        const imageUrl = imageData.data?.[0]?.url
        if (imageUrl) {
          generatedImageUrl = imageUrl
          console.log('[generateGist] Generated emergency AI image')
        }
      } else {
        console.warn('[generateGist] Image generation failed (non-critical)')
      }
    } catch (error) {
      console.warn('[generateGist] Failed to generate emergency image (non-critical):', error)
    }
  }

  // Create different summary lengths
  const fullContext = content.context || ""
  const summary = fullContext.length > 150 ? fullContext.slice(0, 150).trim() + "..." : fullContext

  return {
    headline: content.headline,
    summary: summary,
    context: fullContext,
    narration: content.narration,
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
}

