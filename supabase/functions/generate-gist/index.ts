import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import "https://deno.land/x/xhr@0.1.0/mod.ts"

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sanitizeArticleText = (text?: string) => {
  if (!text) return ''
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchNewsApiArticles(topic: string): Promise<Article[]> {
  const apiKey = Deno.env.get('NEWSAPI_KEY')
  if (!apiKey) return []

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) {
      console.log('⚠️ NewsAPI error:', response.status)
      return []
    }

    const data = await response.json()
    return (data.articles || []).map((article: any) => ({
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      image: article.urlToImage,
      source: article.source?.name || 'NewsAPI',
      published_at: article.publishedAt,
    }))
  } catch (error) {
    console.error('NewsAPI fetch failed:', error)
    return []
  }
}

async function fetchGuardianArticles(topic: string): Promise<Article[]> {
  const apiKey = Deno.env.get('GUARDIAN_API_KEY')
  if (!apiKey) return []

  try {
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(topic)}&order-by=newest&page-size=5&show-fields=trailText,bodyText,thumbnail&api-key=${apiKey}`
    const response = await fetch(url)
    if (!response.ok) {
      console.log('⚠️ Guardian API error:', response.status)
      return []
    }

    const data = await response.json()
    const results = data.response?.results || []
    return results.map((article: any) => ({
      title: article.webTitle,
      description: article.fields?.trailText,
      content: article.fields?.bodyText,
      url: article.webUrl,
      image: article.fields?.thumbnail,
      source: 'The Guardian',
      published_at: article.webPublicationDate,
    }))
  } catch (error) {
    console.error('Guardian fetch failed:', error)
    return []
  }
}

async function fetchMediastackArticles(topic: string): Promise<Article[]> {
  const apiKey = Deno.env.get('MEDIASTACK_KEY')
  if (!apiKey) return []

  try {
    const url = `http://api.mediastack.com/v1/news?access_key=${apiKey}&keywords=${encodeURIComponent(topic)}&languages=en&limit=5&sort=published_desc`
    const response = await fetch(url)
    if (!response.ok) {
      console.log('⚠️ Mediastack error:', response.status)
      return []
    }

    const data = await response.json()
    return (data.data || []).map((article: any) => ({
      title: article.title,
      description: article.description,
      content: article.description,
      url: article.url,
      image: article.image,
      source: article.source || 'Mediastack',
      published_at: article.published_at,
    }))
  } catch (error) {
    console.error('Mediastack fetch failed:', error)
    return []
  }
}

async function fetchArticlesFromApis(topic: string): Promise<Article[]> {
  const [newsapi, guardian, mediastack] = await Promise.all([
    fetchNewsApiArticles(topic),
    fetchGuardianArticles(topic),
    fetchMediastackArticles(topic),
  ])

  return [...newsapi, ...guardian, ...mediastack]
    .filter((article) => !!article.title)
    .sort((a, b) => {
      const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
      const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
      return bTime - aTime
    })
}

// Input validation schema
const topicSchema = z.object({
  topic: z.string()
    .trim()
    .min(1, 'Topic is required')
    .max(500, 'Topic too long (max 500 characters)')
    .regex(/^[a-zA-Z0-9\s.,!?'"@#$%&*()\-+=_\[\]{}:;/\\<>|~`]+$/, 'Topic contains invalid characters')
})

serve(async (req) => {
  console.log('🚀 generate-gist started')
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🚀 generate-gist started')
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('📦 Request body keys:', Object.keys(body))
    
    // Validate input
    console.log('📝 Validating input...')
    let validated
    try {
      validated = topicSchema.parse(body)
    } catch (validationError: any) {
      console.log('❌ Validation failed:', validationError.message)
      return new Response(
        JSON.stringify({ error: 'Invalid input provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
    
    const { topic } = validated

    console.log('📝 Topic received:', topic)
    console.log('📏 Topic length:', topic.length, 'chars')

    console.log('📰 Fetching existing coverage from APIs...')
    const articles = await fetchArticlesFromApis(topic)
    const selectedArticle = articles[0]
    const usingApiContent = Boolean(selectedArticle)

    if (usingApiContent) {
      console.log('✅ Using API article from', selectedArticle?.source)
    } else {
      console.log('⚠️ No API article found, falling back to creative generation')
    }

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
    
    // Check API key
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      console.error('[CONFIG] Missing OPENAI_API_KEY')
      throw new Error('Service configuration error')
    }

    // Detect if topic is about a celebrity or public figure
    const isCelebrity = /drake|taylor swift|messi|rihanna|beyonce|kanye|cristiano|ronaldo|lebron|kim kardashian|ariana grande|justin bieber|selena gomez|bad bunny|dua lipa/i.test(topic)
    console.log('👤 Celebrity detected:', isCelebrity)

    // Get current date for context
    const currentDate = new Date().toISOString().split('T')[0]
    const currentTime = new Date().toLocaleString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })
    console.log('📅 Current date:', currentDate, '/', currentTime)

    const baseSystemPrompt = `You are Fluxa, a witty gossip companion who turns real articles into short, confident updates.
Today's date is ${currentTime}.

CRITICAL RULES:
- ALWAYS respond with valid JSON containing: headline, context, narration, image_keyword.
- Narration must be a 60-90 word energetic script with one playful interjection (e.g., "Haha!") and a natural mention of "Fluxa".
- If ARTICLE_TEXT is provided, rely strictly on those facts. Do not invent information or mention limitations.
- Keep context punchy (under 200 characters) and globally understandable.
- Never include sensitive accusations or disclaimers about missing data.`

    const articleNarrative = usingApiContent
      ? (articleText || sanitizeArticleText(selectedArticle?.description || selectedArticle?.title || ''))
      : ''

    const messages = usingApiContent
      ? [
          { role: 'system', content: baseSystemPrompt + '\nYou have verified ARTICLE_TEXT from our content APIs. Summarize it like a premium news anchor.' },
          {
            role: 'user',
            content: `TOPIC: ${topic}
SOURCE: ${selectedArticle?.source || 'Unknown'}
PUBLISHED_AT: ${selectedArticle?.published_at || 'Unknown'}
URL: ${selectedArticle?.url || 'Unknown'}

ARTICLE_TEXT:
${articleNarrative}`,
          },
        ]
      : [
          { role: 'system', content: baseSystemPrompt + '\nNo article text is available. Craft a plausible, timely update anyway.' },
          {
            role: 'user',
            content: `Create an engaging gist about: ${topic}. Make it exciting and plausible, focusing on their current season/projects/activity. Be confident and specific.`,
          },
        ]

    // Use OpenAI gpt-4o-mini for more current and accurate news
    console.log('🤖 Calling OpenAI API (gpt-4o-mini)...')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' }
      }),
    })

    console.log('📨 AI response status:', response.status)
    
    if (!response.ok) {
      console.error('[AI] Generation failed:', response.status)
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded')
      }
      if (response.status === 402) {
        throw new Error('Service credits exhausted')
      }
      
      throw new Error('Content generation failed')
    }

    console.log('✅ AI responded successfully')
    const data = await response.json()
    console.log('📄 AI response structure:', Object.keys(data))
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.log('❌ Invalid AI response structure')
      throw new Error('Invalid response from AI')
    }
    
    const messageContent = data.choices[0].message.content
    console.log('📝 AI message content (first 200 chars):', messageContent.slice(0, 200))
    
    let content
    try {
      content = JSON.parse(messageContent)
      console.log('✅ Gist content parsed successfully')
      console.log('📋 Content keys:', Object.keys(content))
    } catch (parseError) {
      console.log('❌ Failed to parse AI response as JSON:', parseError)
      throw new Error('AI returned invalid JSON')
    }

    // Generate image using OpenAI DALL-E for all topics
    let generatedImageUrl = null
    console.log('🧠 Fluxa is creating a custom image for topic...')
    try {
      const imagePrompt = `High-quality realistic ${isCelebrity ? 'portrait style' : 'editorial style'} image of ${content.image_keyword || topic}, cinematic lighting, magazine cover aesthetic, professional photography, vibrant colors`
      console.log('🎨 Image prompt:', imagePrompt)
      
      const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
      })

      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        const imageUrl = imageData.data?.[0]?.url
        if (imageUrl) {
          generatedImageUrl = imageUrl
          console.log('🧠 Fluxa created a custom image:', imageUrl)
        } else {
          console.log('⚠️ No image URL in response')
        }
      } else {
        const error = await imageResponse.text()
        console.log('⚠️ Fluxa image generation failed:', imageResponse.status, error)
      }
    } catch (error) {
      console.log('⚠️ Error generating custom image:', error instanceof Error ? error.message : 'Unknown error')
    }

    return new Response(
      JSON.stringify({
        headline: content.headline,
        context: content.context,
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
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[ERROR] generate-gist failed:', error)
    
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
