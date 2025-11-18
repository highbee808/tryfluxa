import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { createHash } from 'https://deno.land/std@0.168.0/hash/mod.ts'
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

interface NormalizedArticle {
  id: string
  headline: string
  context: string
  script: string
  topic: string
  topic_category: string
  image_url: string | null
  source: string
  source_url: string | null
  published_at: string | null
}

const MAX_ARTICLE_TEXT_LENGTH = 6000
const CACHE_DURATION_MS = 30 * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseKey)

const sanitizeArticleText = (text?: string) => {
  if (!text) return ''
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const stableArticleId = (article: Article) => {
  const hash = createHash('sha256')
  hash.update(`${article.source || 'fluxa'}-${article.title || 'untitled'}-${article.published_at || ''}`)
  return hash.toString().slice(0, 24)
}

const inferCategory = (topic: string) => {
  const value = topic.toLowerCase()
  if (/(ai|tech|software|app|data|startup)/.test(value)) return 'Technology'
  if (/(music|celebrity|fashion|film|tv|culture)/.test(value)) return 'Lifestyle'
  if (/(science|space|health|research|lab)/.test(value)) return 'Science'
  if (/(sports|match|league|tournament|nba|fifa)/.test(value)) return 'Sports'
  if (/(business|finance|market|economy|stock)/.test(value)) return 'Business'
  return 'Trending'
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

const topicSchema = z.object({
  topic: z.string()
    .trim()
    .min(1, 'Topic is required')
    .max(500, 'Topic too long (max 500 characters)')
})

async function summarizeArticle(article: Article, topic: string, openaiApiKey: string) {
  const articleText = sanitizeArticleText([
    article.title,
    article.description,
    article.content,
  ].filter(Boolean).join('\n\n')).slice(0, MAX_ARTICLE_TEXT_LENGTH)

  if (!articleText) {
    return {
      context: sanitizeArticleText(article.description || article.title || topic).slice(0, 220),
      script: sanitizeArticleText(article.content || article.description || article.title || topic).slice(0, 600)
    }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Fluxa, a concise entertainment and culture editor. Turn article facts into bright, conversational summaries without adding any links.`
        },
        {
          role: 'user',
          content: `Topic: ${topic}\nSource: ${article.source || 'Unknown'}\n\nARTICLE:\n${articleText}\n\nRespond with JSON: {"context":"<=200 characters, single sentence recap without hashtags", "script":"130-160 word spoken explanation referencing Fluxa in first person"}`
        }
      ],
      response_format: { type: 'json_object' }
    })
  })

  if (!response.ok) {
    console.error('⚠️ Summary generation failed:', await response.text())
    return {
      context: sanitizeArticleText(article.description || article.title || topic).slice(0, 220),
      script: sanitizeArticleText(article.content || article.description || article.title || topic).slice(0, 600)
    }
  }

  const data = await response.json()
  try {
    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}')
    return {
      context: sanitizeArticleText(parsed.context || article.description || article.title || topic).slice(0, 220),
      script: sanitizeArticleText(parsed.script || article.content || article.description || article.title || topic)
    }
  } catch (error) {
    console.error('⚠️ Failed to parse summary JSON:', error)
    return {
      context: sanitizeArticleText(article.description || article.title || topic).slice(0, 220),
      script: sanitizeArticleText(article.content || article.description || article.title || topic).slice(0, 600)
    }
  }
}

async function getCachedCoverage(topic: string) {
  const cutoff = new Date(Date.now() - CACHE_DURATION_MS).toISOString()
  const { data } = await supabase
    .from('news_cache')
    .select('*')
    .eq('entity', topic)
    .gte('cached_at', cutoff)
    .order('cached_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function cacheCoverage(topic: string, payload: {
  news_data: NormalizedArticle[]
  raw_payload: Record<string, unknown>
  summary_payload: Record<string, unknown>
}) {
  await supabase
    .from('news_cache')
    .insert({
      entity: topic,
      news_data: payload.news_data,
      raw_payload: payload.raw_payload,
      summary_payload: payload.summary_payload,
      cached_at: new Date().toISOString(),
    })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { topic } = topicSchema.parse(body)

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('[CONFIG] Missing OPENAI_API_KEY')
      throw new Error('Service configuration error')
    }

    let cached = await getCachedCoverage(topic)
    let normalizedArticles: NormalizedArticle[] = Array.isArray(cached?.news_data)
      ? (cached?.news_data as NormalizedArticle[])
      : []
    const usedCache = normalizedArticles.length > 0

    if (!usedCache) {
      console.log('📰 Cache miss, fetching APIs for topic:', topic)
      const [newsapi, guardian, mediastack] = await Promise.all([
        fetchNewsApiArticles(topic),
        fetchGuardianArticles(topic),
        fetchMediastackArticles(topic),
      ])

      const articles = [...newsapi, ...guardian, ...mediastack]
        .filter((article) => !!article.title)
        .sort((a, b) => {
          const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
          const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
          return bTime - aTime
        })

      if (articles.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No coverage found for topic' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const summaries: Record<string, { context: string; script: string }> = {}
      normalizedArticles = []

      for (const article of articles.slice(0, 6)) {
        const id = stableArticleId(article)
        const normalized: NormalizedArticle = {
          id,
          headline: article.title || topic,
          context: '',
          script: '',
          topic,
          topic_category: inferCategory(topic),
          image_url: article.image || null,
          source: article.source || 'Fluxa Wire',
          source_url: article.url || null,
          published_at: article.published_at || null,
        }

        const summary = await summarizeArticle(article, topic, openaiApiKey)
        normalized.context = summary.context
        normalized.script = summary.script
        summaries[id] = summary
        normalizedArticles.push(normalized)
      }

      await cacheCoverage(topic, {
        news_data: normalizedArticles,
        raw_payload: {
          newsapi,
          guardian,
          mediastack,
        },
        summary_payload: summaries,
      })
    } else {
      console.log('✅ Served coverage from cache for topic:', topic)
    }

    if (normalizedArticles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Failed to prepare coverage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const selectedArticle = normalizedArticles[0]

    return new Response(
      JSON.stringify({
        headline: selectedArticle.headline,
        context: selectedArticle.context,
        narration: selectedArticle.script,
        image_keyword: selectedArticle.topic,
        ai_generated_image: null,
        is_celebrity: false,
        source_url: selectedArticle.source_url,
        source_title: selectedArticle.headline,
        source_excerpt: selectedArticle.context,
        source_name: selectedArticle.source,
        source_published_at: selectedArticle.published_at,
        source_image_url: selectedArticle.image_url,
        topic_category: selectedArticle.topic_category,
        used_api_article: true,
        normalized_article: selectedArticle,
        cached: usedCache,
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
