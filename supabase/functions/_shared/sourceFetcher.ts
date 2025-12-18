// Shared source fetching utilities with proper error handling and graceful degradation

export interface SourceResult {
  ok: boolean
  source: string
  items: Array<{
    title: string
    url?: string
    summary?: string
    image_url?: string
    description?: string
    content?: string
    source?: string
    published_at?: string
  }>
  status?: number
  error?: string
  details?: any
}

/**
 * Safe fetch with timeout - never throws, always returns structured result
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<{ ok: boolean; status: number; json?: any; text?: string; error?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const text = await response.text()
    let json: any = null

    try {
      json = JSON.parse(text)
    } catch {
      // Not JSON, that's OK
    }

    return {
      ok: response.ok,
      status: response.status,
      json,
      text: text.substring(0, 500), // Limit text length for logging
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        status: 408,
        error: 'Request timeout',
      }
    }
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Fetch articles from NewsAPI
 */
export async function fetchNewsApiArticles(topic: string): Promise<SourceResult> {
  const apiKey = Deno.env.get('NEWSAPI_KEY')
  
  if (!apiKey) {
    console.log('[sources] SKIP newsapi (missing NEWSAPI_KEY)')
    return {
      ok: false,
      source: 'newsapi',
      items: [],
      error: 'Missing NEWSAPI_KEY',
    }
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`
    
    console.log('[sources] FETCH newsapi', { topic })
    const result = await fetchWithTimeout(url, {}, 10000)

    if (!result.ok) {
      const errorMsg = result.json?.message || result.error || `HTTP ${result.status}`
      console.error(`[sources] FAIL newsapi status=${result.status} error="${errorMsg}"`)
      return {
        ok: false,
        source: 'newsapi',
        items: [],
        status: result.status,
        error: errorMsg,
        details: result.json,
      }
    }

    const articles = result.json?.articles || []
    const items = articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      image_url: article.urlToImage,
      summary: article.description,
      source: article.source?.name || 'NewsAPI',
      published_at: article.publishedAt,
    })).filter((item: any) => !!item.title)

    console.log(`[sources] OK newsapi items=${items.length}`)
    return {
      ok: true,
      source: 'newsapi',
      items,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[sources] FAIL newsapi exception="${errorMsg}"`)
    return {
      ok: false,
      source: 'newsapi',
      items: [],
      error: errorMsg,
      details: error,
    }
  }
}

/**
 * Fetch articles from The Guardian
 */
export async function fetchGuardianArticles(topic: string): Promise<SourceResult> {
  const apiKey = Deno.env.get('GUARDIAN_API_KEY')
  
  if (!apiKey) {
    console.log('[sources] SKIP guardian (missing GUARDIAN_API_KEY)')
    return {
      ok: false,
      source: 'guardian',
      items: [],
      error: 'Missing GUARDIAN_API_KEY',
    }
  }

  try {
    const url = `https://content.guardianapis.com/search?q=${encodeURIComponent(topic)}&order-by=newest&page-size=5&show-fields=trailText,bodyText,thumbnail&api-key=${apiKey}`
    
    console.log('[sources] FETCH guardian', { topic })
    const result = await fetchWithTimeout(url, {}, 10000)

    if (!result.ok) {
      const errorMsg = result.json?.message || result.error || `HTTP ${result.status}`
      console.error(`[sources] FAIL guardian status=${result.status} error="${errorMsg}"`)
      return {
        ok: false,
        source: 'guardian',
        items: [],
        status: result.status,
        error: errorMsg,
        details: result.json,
      }
    }

    const results = result.json?.response?.results || []
    const items = results.map((article: any) => ({
      title: article.webTitle,
      description: article.fields?.trailText,
      content: article.fields?.bodyText,
      url: article.webUrl,
      image_url: article.fields?.thumbnail,
      summary: article.fields?.trailText,
      source: 'The Guardian',
      published_at: article.webPublicationDate,
    })).filter((item: any) => !!item.title)

    console.log(`[sources] OK guardian items=${items.length}`)
    return {
      ok: true,
      source: 'guardian',
      items,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[sources] FAIL guardian exception="${errorMsg}"`)
    return {
      ok: false,
      source: 'guardian',
      items: [],
      error: errorMsg,
      details: error,
    }
  }
}

/**
 * Fetch articles from Mediastack
 */
export async function fetchMediastackArticles(topic: string): Promise<SourceResult> {
  const apiKey = Deno.env.get('MEDIASTACK_KEY')
  
  if (!apiKey) {
    console.log('[sources] SKIP mediastack (missing MEDIASTACK_KEY)')
    return {
      ok: false,
      source: 'mediastack',
      items: [],
      error: 'Missing MEDIASTACK_KEY',
    }
  }

  try {
    const url = `http://api.mediastack.com/v1/news?access_key=${apiKey}&keywords=${encodeURIComponent(topic)}&languages=en&limit=5&sort=published_desc`
    
    console.log('[sources] FETCH mediastack', { topic })
    const result = await fetchWithTimeout(url, {}, 10000)

    if (!result.ok) {
      const errorMsg = result.json?.message || result.error || `HTTP ${result.status}`
      console.error(`[sources] FAIL mediastack status=${result.status} error="${errorMsg}"`)
      return {
        ok: false,
        source: 'mediastack',
        items: [],
        status: result.status,
        error: errorMsg,
        details: result.json,
      }
    }

    const articles = result.json?.data || []
    const items = articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      content: article.description,
      url: article.url,
      image_url: article.image,
      summary: article.description,
      source: article.source || 'Mediastack',
      published_at: article.published_at,
    })).filter((item: any) => !!item.title)

    console.log(`[sources] OK mediastack items=${items.length}`)
    return {
      ok: true,
      source: 'mediastack',
      items,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[sources] FAIL mediastack exception="${errorMsg}"`)
    return {
      ok: false,
      source: 'mediastack',
      items: [],
      error: errorMsg,
      details: error,
    }
  }
}

/**
 * Gather articles from all available sources in parallel
 * Returns all successful results and failures
 * Note: Guardian and expired adapters are excluded
 */
export async function gatherAllSources(topic: string): Promise<{
  success: boolean
  articles: Array<any>
  failures: Array<{ source: string; status?: number; error: string; details?: any }>
  sourceStats: Array<{ source: string; items: number; ok: boolean }>
}> {
  console.log('[sources] GATHER_START', { topic })
  
  // Fetch from active sources only (Guardian and expired adapters removed)
  // Prioritize RapidAPI sources first
  const [mediastackResult, newsapiResult] = await Promise.all([
    fetchMediastackArticles(topic),
    fetchNewsApiArticles(topic),
  ])

  const allArticles: any[] = []
  const failures: Array<{ source: string; status?: number; error: string; details?: any }> = []
  const sourceStats: Array<{ source: string; items: number; ok: boolean }> = []

  // Process Mediastack first (prioritized)
  if (mediastackResult.ok && mediastackResult.items.length > 0) {
    allArticles.push(...mediastackResult.items)
    sourceStats.push({ source: 'mediastack', items: mediastackResult.items.length, ok: true })
  } else {
    if (mediastackResult.error) {
      failures.push({
        source: 'mediastack',
        status: mediastackResult.status,
        error: mediastackResult.error,
        details: mediastackResult.details,
      })
    }
    sourceStats.push({ source: 'mediastack', items: 0, ok: false })
  }

  // Process NewsAPI
  if (newsapiResult.ok && newsapiResult.items.length > 0) {
    allArticles.push(...newsapiResult.items)
    sourceStats.push({ source: 'newsapi', items: newsapiResult.items.length, ok: true })
  } else {
    if (newsapiResult.error) {
      failures.push({
        source: 'newsapi',
        status: newsapiResult.status,
        error: newsapiResult.error,
        details: newsapiResult.details,
      })
    }
    sourceStats.push({ source: 'newsapi', items: 0, ok: false })
  }

  // Sort by published date
  const sorted = allArticles
    .filter((article) => !!article.title)
    .sort((a, b) => {
      const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
      const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
      return bTime - aTime
    })

  const success = sorted.length > 0

  console.log('[sources] GATHER_COMPLETE', {
    success,
    totalItems: sorted.length,
    stats: sourceStats,
    failures: failures.length,
  })

  return {
    success,
    articles: sorted,
    failures,
    sourceStats,
  }
}

