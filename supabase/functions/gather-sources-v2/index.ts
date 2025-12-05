import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders, createResponse, createErrorResponse, parseBody } from '../_shared/http.ts'
import { getCache, setCache, generateCacheKey } from '../_shared/cache.ts'
import { ENV } from '../_shared/env.ts'

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

async function fetchNewsApiArticles(topic: string): Promise<Article[]> {
  const apiKey = ENV.NEWSAPI_KEY
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
  const apiKey = ENV.GUARDIAN_API_KEY
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
  const apiKey = ENV.MEDIASTACK_KEY
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

/**
 * Sequential fetch: NewsAPI → Guardian → Mediastack (stops early if articles found)
 */
async function gatherSourcesSequential(topic: string): Promise<Article[]> {
  const cacheKey = generateCacheKey('sources', topic)
  
  // Check cache first (1 hour TTL)
  const cached = await getCache<Article[]>(cacheKey)
  if (cached) {
    console.log('✅ Using cached sources for:', topic)
    return cached
  }

  let articles: Article[] = []
  
  // Try NewsAPI first
  console.log('📡 Fetching from NewsAPI...')
  const newsapi = await fetchNewsApiArticles(topic)
  if (newsapi.length > 0) {
    console.log(`✅ Found ${newsapi.length} articles from NewsAPI`)
    articles = [...articles, ...newsapi]
  } else {
    console.log('⚠️ No articles from NewsAPI, trying Guardian...')
    // Try Guardian if NewsAPI returned nothing
    const guardian = await fetchGuardianArticles(topic)
    if (guardian.length > 0) {
      console.log(`✅ Found ${guardian.length} articles from Guardian`)
      articles = [...articles, ...guardian]
    } else {
      console.log('⚠️ No articles from Guardian, trying Mediastack...')
      // Try Mediastack if Guardian returned nothing
      const mediastack = await fetchMediastackArticles(topic)
      if (mediastack.length > 0) {
        console.log(`✅ Found ${mediastack.length} articles from Mediastack`)
        articles = [...articles, ...mediastack]
      } else {
        console.log('⚠️ No articles from any external API')
      }
    }
  }

  // Sort by published date and cache
  const sorted = articles
    .filter((article) => !!article.title)
    .sort((a, b) => {
      const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
      const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
      return bTime - aTime
    })

  // Cache for 1 hour
  if (sorted.length > 0) {
    await setCache(cacheKey, sorted, 3600)
  }

  return sorted
}

const topicSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long')
})

serve(async (req) => {
  console.log('🚀 gather-sources-v2 started')
  
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    const body = await parseBody(req)
    const validated = topicSchema.parse(body)
    const { topic } = validated

    console.log('📝 Topic received:', topic)

    const articles = await gatherSourcesSequential(topic)
    const selectedArticle = articles[0]

    return createResponse({
      success: true,
      articles,
      selected: selectedArticle || null,
      count: articles.length,
    })
  } catch (error) {
    console.error('[ERROR] gather-sources-v2 failed:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to gather sources',
      500
    )
  }
})
