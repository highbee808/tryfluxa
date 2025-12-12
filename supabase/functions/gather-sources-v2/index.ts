import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders, createResponse, createErrorResponse, parseBody } from '../_shared/http.ts'
import { getCache, setCache, generateCacheKey } from '../_shared/cache.ts'
import { gatherAllSources } from '../_shared/sourceFetcher.ts'

const topicSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long'),
  debug: z.boolean().optional(),
})

serve(async (req) => {
  const requestId = crypto.randomUUID()
  console.log('[gather-sources-v2] START', { requestId })
  
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    const body = await parseBody(req)
    const validated = topicSchema.parse(body)
    const { topic, debug } = validated

    console.log('[gather-sources-v2] TOPIC_RECEIVED', { requestId, topic })

    // Check cache first (1 hour TTL)
    const cacheKey = generateCacheKey('sources', topic)
    const cached = await getCache(cacheKey)
    if (cached) {
      console.log('[gather-sources-v2] CACHE_HIT', { requestId })
      return createResponse({
        success: true,
        articles: cached.articles || [],
        selected: cached.articles?.[0] || null,
        count: cached.articles?.length || 0,
        cached: true,
        ...(debug ? { sourceStats: cached.sourceStats, failures: cached.failures } : {}),
      })
    }

    // Gather from all sources
    const result = await gatherAllSources(topic)

    if (!result.success && result.articles.length === 0) {
      // All sources failed - return error but don't crash
      console.error('[gather-sources-v2] ALL_SOURCES_FAILED', { requestId, failures: result.failures })
      return createErrorResponse(
        {
          success: false,
          stage: 'gather_sources',
          error: 'No sources available',
          failures: result.failures,
          sourceStats: result.sourceStats,
        },
        502
      )
    }

    // Cache successful results
    if (result.articles.length > 0) {
      await setCache(cacheKey, {
        articles: result.articles,
        sourceStats: result.sourceStats,
        failures: result.failures,
      }, 3600)
    }

    const selectedArticle = result.articles[0] || null

    console.log('[gather-sources-v2] SUCCESS', {
      requestId,
      articles: result.articles.length,
      selected: !!selectedArticle,
    })

    return createResponse({
      success: true,
      articles: result.articles,
      selected: selectedArticle,
      count: result.articles.length,
      ...(debug ? {
        sourceStats: result.sourceStats,
        failures: result.failures,
        envVars: {
          hasNewsApiKey: !!Deno.env.get('NEWSAPI_KEY'),
          hasGuardianKey: !!Deno.env.get('GUARDIAN_API_KEY'),
          hasMediastackKey: !!Deno.env.get('MEDIASTACK_KEY'),
        },
      } : {}),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to gather sources'
    console.error('[gather-sources-v2] ERROR', { requestId, error: errorMsg })
    return createErrorResponse(
      {
        success: false,
        stage: 'gather_sources',
        error: errorMsg,
      },
      500
    )
  }
})
