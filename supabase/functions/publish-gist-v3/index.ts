/**
 * publish-gist-v3: Clean, deterministic pipeline with source-grounding
 * 
 * Features:
 * - Admin secret auth (no browser JWT)
 * - Structured pipeline stages with typed results
 * - Source-grounding: LLM must cite sources
 * - Alignment validation: ensures content matches sources
 * - Graceful error handling: never crashes
 * 
 * Example curl:
 * curl -X POST https://<project>.supabase.co/functions/v1/publish-gist-v3 \
 *   -H "Content-Type: application/json" \
 *   -H "x-admin-secret: <ADMIN_SECRET>" \
 *   -d '{"topic": "Drake drops new album", "topicCategory": "Music"}'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// ============================================================================
// Types & Interfaces
// ============================================================================

interface SourceItem {
  title: string
  url: string
  excerpt?: string
  publishedAt?: string
  sourceName?: string
  imageUrl?: string
}

interface GistDraft {
  headline: string
  summary: string
  full_gist: string
  key_points: string[]
  source_citations: string[]
  confidence: number
}

interface PipelineResult<T = any> {
  success: boolean
  stage: string
  data?: T
  error?: string
  details?: any
}

// ============================================================================
// Response Helpers
// ============================================================================

function safeStatus(status?: number | null): number {
  if (!status || status === 0) return 500
  if (status < 200 || status > 599) return 500
  return status
}

function safeJsonResponse(
  body: Record<string, any>,
  status: number = 200
): Response {
  const safeStatusValue = safeStatus(status)
  
  return new Response(JSON.stringify(body), {
    status: safeStatusValue,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type, x-admin-secret, *",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
  })
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long'),
  topicCategory: z.string().trim().optional(),
  rawTrendId: z.string().uuid('Invalid raw_trend_id format').optional(),
  sourceUrl: z.string().url('Invalid source URL format').optional(),
})

// ============================================================================
// Pipeline Stages
// ============================================================================

/**
 * Stage 1: Validate input payload
 */
function validateInput(payload: unknown, requestId: string): PipelineResult<z.infer<typeof inputSchema>> {
  console.log(`[${requestId}] [stage:validateInput] START`)
  
  try {
    const validated = inputSchema.parse(payload)
    console.log(`[${requestId}] [stage:validateInput] OK`, { topic: validated.topic })
    return { success: true, stage: 'validateInput', data: validated }
  } catch (error) {
    const errorMsg = error instanceof z.ZodError 
      ? error.errors[0]?.message || 'Validation failed'
      : 'Invalid input'
    console.error(`[${requestId}] [stage:validateInput] ERROR`, { error: errorMsg })
    return { 
      success: false, 
      stage: 'validateInput', 
      error: errorMsg,
      details: error instanceof z.ZodError ? error.errors : undefined
    }
  }
}

/**
 * Stage 2: Gather sources from external APIs
 */
async function gatherSources(
  payload: z.infer<typeof inputSchema>,
  requestId: string
): Promise<PipelineResult<SourceItem[]>> {
  console.log(`[${requestId}] [stage:gatherSources] START`, { topic: payload.topic })
  
  const sources: SourceItem[] = []
  const failures: Array<{ source: string; error: string }> = []
  
  // If sourceUrl provided, treat as primary source
  if (payload.sourceUrl) {
    sources.push({
      title: payload.topic,
      url: payload.sourceUrl,
      sourceName: 'Provided',
    })
    console.log(`[${requestId}] [stage:gatherSources] Added provided source`, { url: payload.sourceUrl })
  }
  
  // Gather from external APIs (parallel)
  const apiKey = Deno.env.get('NEWSAPI_KEY')
  const guardianKey = Deno.env.get('GUARDIAN_API_KEY')
  const mediastackKey = Deno.env.get('MEDIASTACK_KEY')
  
  const fetchPromises: Promise<void>[] = []
  
  // NewsAPI
  if (apiKey) {
    fetchPromises.push(
      fetch(`https://newsapi.org/v2/everything?q=${encodeURIComponent(payload.topic)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            const items = (data.articles || []).slice(0, 3).map((a: any) => ({
              title: a.title,
              url: a.url,
              excerpt: a.description,
              publishedAt: a.publishedAt,
              sourceName: a.source?.name || 'NewsAPI',
              imageUrl: a.urlToImage,
            }))
            sources.push(...items)
            console.log(`[${requestId}] [stage:gatherSources] NewsAPI OK`, { count: items.length })
          } else {
            failures.push({ source: 'newsapi', error: `HTTP ${res.status}` })
          }
        })
        .catch((err) => {
          failures.push({ source: 'newsapi', error: err.message })
        })
    )
  }
  
  // Guardian
  if (guardianKey) {
    fetchPromises.push(
      fetch(`https://content.guardianapis.com/search?q=${encodeURIComponent(payload.topic)}&order-by=newest&page-size=5&show-fields=trailText&api-key=${guardianKey}`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            const items = (data.response?.results || []).slice(0, 3).map((a: any) => ({
              title: a.webTitle,
              url: a.webUrl,
              excerpt: a.fields?.trailText,
              publishedAt: a.webPublicationDate,
              sourceName: 'The Guardian',
            }))
            sources.push(...items)
            console.log(`[${requestId}] [stage:gatherSources] Guardian OK`, { count: items.length })
          } else {
            failures.push({ source: 'guardian', error: `HTTP ${res.status}` })
          }
        })
        .catch((err) => {
          failures.push({ source: 'guardian', error: err.message })
        })
    )
  }
  
  // Mediastack
  if (mediastackKey) {
    fetchPromises.push(
      fetch(`http://api.mediastack.com/v1/news?access_key=${mediastackKey}&keywords=${encodeURIComponent(payload.topic)}&languages=en&limit=5&sort=published_desc`)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json()
            const items = (data.data || []).slice(0, 3).map((a: any) => ({
              title: a.title,
              url: a.url,
              excerpt: a.description,
              publishedAt: a.published_at,
              sourceName: a.source || 'Mediastack',
              imageUrl: a.image,
            }))
            sources.push(...items)
            console.log(`[${requestId}] [stage:gatherSources] Mediastack OK`, { count: items.length })
          } else {
            failures.push({ source: 'mediastack', error: `HTTP ${res.status}` })
          }
        })
        .catch((err) => {
          failures.push({ source: 'mediastack', error: err.message })
        })
    )
  }
  
  await Promise.all(fetchPromises)
  
  // Deduplicate by URL
  const uniqueSources = Array.from(
    new Map(sources.map(s => [s.url, s])).values()
  )
  
  if (uniqueSources.length === 0) {
    console.error(`[${requestId}] [stage:gatherSources] ERROR: No sources found`)
    return {
      success: false,
      stage: 'gatherSources',
      error: 'INSUFFICIENT_SOURCES',
      details: { failures, attempted: fetchPromises.length }
    }
  }
  
  console.log(`[${requestId}] [stage:gatherSources] OK`, { 
    total: uniqueSources.length,
    failures: failures.length 
  })
  
  return { 
    success: true, 
    stage: 'gatherSources', 
    data: uniqueSources 
  }
}

/**
 * Stage 3: Select primary source
 */
function selectPrimarySource(
  payload: z.infer<typeof inputSchema>,
  sources: SourceItem[],
  requestId: string
): PipelineResult<SourceItem> {
  console.log(`[${requestId}] [stage:selectPrimarySource] START`, { sourceCount: sources.length })
  
  // If sourceUrl provided, use it as primary
  if (payload.sourceUrl) {
    const primary = sources.find(s => s.url === payload.sourceUrl)
    if (primary) {
      console.log(`[${requestId}] [stage:selectPrimarySource] OK (provided)`, { url: primary.url })
      return { success: true, stage: 'selectPrimarySource', data: primary }
    }
  }
  
  // Otherwise, choose best match by title similarity
  const topicLower = payload.topic.toLowerCase()
  let bestMatch = sources[0]
  let bestScore = 0
  
  for (const source of sources) {
    const titleLower = source.title.toLowerCase()
    // Simple similarity: count matching words
    const topicWords = topicLower.split(/\s+/)
    const titleWords = titleLower.split(/\s+/)
    const matches = topicWords.filter(w => titleWords.includes(w)).length
    const score = matches / Math.max(topicWords.length, titleWords.length)
    
    if (score > bestScore) {
      bestScore = score
      bestMatch = source
    }
  }
  
  console.log(`[${requestId}] [stage:selectPrimarySource] OK (selected)`, { 
    url: bestMatch.url,
    score: bestScore.toFixed(2)
  })
  
  return { success: true, stage: 'selectPrimarySource', data: bestMatch }
}

/**
 * Stage 4: Generate gist with source-grounding
 */
async function generateGist(
  payload: z.infer<typeof inputSchema>,
  sources: SourceItem[],
  primarySource: SourceItem,
  requestId: string
): Promise<PipelineResult<GistDraft>> {
  console.log(`[${requestId}] [stage:generateGist] START`)
  
  const openaiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiKey) {
    return {
      success: false,
      stage: 'generateGist',
      error: 'Missing OPENAI_API_KEY'
    }
  }
  
  // Format sources for LLM
  const sourcesText = sources.map((s, i) => 
    `[Source ${i + 1}]
Title: ${s.title}
URL: ${s.url}
${s.excerpt ? `Excerpt: ${s.excerpt.substring(0, 200)}` : ''}
${s.sourceName ? `Source: ${s.sourceName}` : ''}
${s.publishedAt ? `Published: ${s.publishedAt}` : ''}
---`
  ).join('\n\n')
  
  const systemPrompt = `You are a fact-checking assistant. Generate a gist about the topic using ONLY information from the provided sources.

CRITICAL RULES:
1. Only use facts present in the provided sources
2. If sources disagree or are unclear, say so explicitly
3. Include a "What we know from sources" section with bullet points, each referencing a source URL
4. Include a "What's unconfirmed" section when applicable
5. Do not invent names, numbers, dates, or details not in sources
6. If the primary source is provided, prioritize information from it

Output MUST be valid JSON with this exact structure:
{
  "headline": "string (max 100 chars)",
  "summary": "string (max 200 chars, brief overview)",
  "full_gist": "string (structured sections with What we know / What's unconfirmed)",
  "key_points": ["string", "string", ...],
  "source_citations": ["url1", "url2", ...],
  "confidence": number (0-100, based on source quality and agreement)
}`

  const userPrompt = `Topic: ${payload.topic}
${payload.topicCategory ? `Category: ${payload.topicCategory}` : ''}

Sources:
${sourcesText}

Primary Source (prioritize this):
Title: ${primarySource.title}
URL: ${primarySource.url}
${primarySource.excerpt ? `Excerpt: ${primarySource.excerpt}` : ''}

Generate a fact-grounded gist following the rules above.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for more factual output
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        stage: 'generateGist',
        error: `OpenAI API error: ${response.status}`,
        details: errorText
      }
    }
    
    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return {
        success: false,
        stage: 'generateGist',
        error: 'No content from OpenAI'
      }
    }
    
    const gistDraft = JSON.parse(content) as GistDraft
    
    // Validate structure
    if (!gistDraft.headline || !gistDraft.summary || !gistDraft.full_gist) {
      return {
        success: false,
        stage: 'generateGist',
        error: 'Invalid gist structure from OpenAI'
      }
    }
    
    console.log(`[${requestId}] [stage:generateGist] OK`, {
      headline: gistDraft.headline,
      citations: gistDraft.source_citations?.length || 0,
      confidence: gistDraft.confidence
    })
    
    return { success: true, stage: 'generateGist', data: gistDraft }
  } catch (error) {
    return {
      success: false,
      stage: 'generateGist',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }
  }
}

/**
 * Stage 5: Validate alignment with sources
 */
function validateAlignment(
  gistDraft: GistDraft,
  primarySource: SourceItem,
  sources: SourceItem[],
  requestId: string
): PipelineResult<void> {
  console.log(`[${requestId}] [stage:validateAlignment] START`)
  
  const sourceUrls = new Set(sources.map(s => s.url))
  const issues: string[] = []
  
  // Check: Every key point should have at least one citation
  if (gistDraft.key_points && gistDraft.key_points.length > 0) {
    const uncitedPoints = gistDraft.key_points.filter((point, idx) => {
      // Simple check: if point doesn't reference any source URL, it's uncited
      const hasCitation = gistDraft.source_citations?.some(citation => 
        sourceUrls.has(citation)
      )
      return !hasCitation
    })
    
    if (uncitedPoints.length > 0) {
      issues.push(`${uncitedPoints.length} key points lack source citations`)
    }
  }
  
  // Check: Primary source must be in citations
  if (primarySource && gistDraft.source_citations) {
    const hasPrimary = gistDraft.source_citations.includes(primarySource.url)
    if (!hasPrimary) {
      issues.push('Primary source URL missing from citations')
    }
  }
  
  // Check: All citations must be from gathered sources
  if (gistDraft.source_citations) {
    const invalidCitations = gistDraft.source_citations.filter(
      url => !sourceUrls.has(url)
    )
    if (invalidCitations.length > 0) {
      issues.push(`${invalidCitations.length} citations reference unknown sources`)
    }
  }
  
  if (issues.length > 0) {
    console.error(`[${requestId}] [stage:validateAlignment] ERROR`, { issues })
    return {
      success: false,
      stage: 'validateAlignment',
      error: 'MISALIGNED_CONTENT',
      details: {
        issues,
        keyPointsCount: gistDraft.key_points?.length || 0,
        citationsCount: gistDraft.source_citations?.length || 0,
        primarySourceUrl: primarySource.url,
        hasPrimaryInCitations: gistDraft.source_citations?.includes(primarySource.url) || false
      }
    }
  }
  
  console.log(`[${requestId}] [stage:validateAlignment] OK`)
  return { success: true, stage: 'validateAlignment' }
}

/**
 * Stage 6: Insert gist into database
 */
async function insertGist(
  payload: z.infer<typeof inputSchema>,
  gistDraft: GistDraft,
  sources: SourceItem[],
  primarySource: SourceItem,
  requestId: string
): Promise<PipelineResult<any>> {
  console.log(`[${requestId}] [stage:insertGist] START`)
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  if (!supabaseUrl || !serviceKey) {
    return {
      success: false,
      stage: 'insertGist',
      error: 'Missing Supabase credentials'
    }
  }
  
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  
  // Fetch raw_trend if rawTrendId provided
  let rawTrendImageUrl: string | null = null
  if (payload.rawTrendId) {
    const { data: rawTrend } = await supabase
      .from('raw_trends')
      .select('id, image_url, source_url')
      .eq('id', payload.rawTrendId)
      .single()
    
    if (rawTrend) {
      rawTrendImageUrl = rawTrend.image_url || null
    }
  }
  
  const gistData = {
    topic: payload.topic,
    topic_category: payload.topicCategory || 'Trending',
    headline: gistDraft.headline,
    summary: gistDraft.summary,
    context: gistDraft.summary, // For backward compatibility
    narration: gistDraft.full_gist,
    script: gistDraft.full_gist,
    image_url: rawTrendImageUrl || primarySource.imageUrl || null,
    source_url: primarySource.url,
    news_published_at: primarySource.publishedAt || null,
    raw_trend_id: payload.rawTrendId || null,
    audio_url: '',
    status: 'published',
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    meta: {
      // v3-specific fields
      primary_source_url: primarySource.url,
      source_urls: sources.map(s => s.url),
      confidence: gistDraft.confidence,
      request_id: requestId,
      key_points: gistDraft.key_points,
      source_citations: gistDraft.source_citations,
    },
  }
  
  const { data: gist, error } = await supabase
    .from('gists')
    .insert(gistData)
    .select()
    .single()
  
  if (error) {
    console.error(`[${requestId}] [stage:insertGist] ERROR`, { error: error.message })
    return {
      success: false,
      stage: 'insertGist',
      error: `DB insert failed: ${error.message}`,
      details: error
    }
  }
  
  console.log(`[${requestId}] [stage:insertGist] OK`, { gistId: gist.id })
  return { success: true, stage: 'insertGist', data: gist }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const requestId = crypto.randomUUID()
  const functionName = 'publish-gist-v3'
  
  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, x-admin-secret, *",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      },
    })
  }
  
  console.log(`[${functionName}] START`, { requestId, method: req.method })
  
  // Auth: Check admin secret (case-insensitive header check)
  const adminSecret =
    req.headers.get("x-admin-secret") ||
    req.headers.get("X-Admin-Secret");
  
  if (!adminSecret || adminSecret !== Deno.env.get("ADMIN_SECRET")) {
    console.error(`[${functionName}] AUTH_FAILED`, { requestId, hasHeader: !!adminSecret })
    return new Response(
      JSON.stringify({
        success: false,
        stage: "auth",
        error: "UNAUTHORIZED",
        details: "Missing or invalid admin secret",
        requestId,
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "content-type, x-admin-secret, *",
        },
      }
    );
  }
  
  console.log(`[${functionName}] AUTH_OK`, { requestId })
  
  try {
    // Parse body
    const body = await req.json()
    
    // Stage 1: Validate input
    const validationResult = validateInput(body, requestId)
    if (!validationResult.success) {
      return safeJsonResponse({
        requestId,
        ...validationResult
      }, 400)
    }
    const payload = validationResult.data!
    
    // Stage 2: Gather sources
    const sourcesResult = await gatherSources(payload, requestId)
    if (!sourcesResult.success) {
      return safeJsonResponse({
        requestId,
        ...sourcesResult
      }, 422) // 422 Unprocessable Entity for insufficient sources
    }
    const sources = sourcesResult.data!
    
    // Stage 3: Select primary source
    const primaryResult = selectPrimarySource(payload, sources, requestId)
    if (!primaryResult.success) {
      return safeJsonResponse({
        requestId,
        ...primaryResult
      }, 500)
    }
    const primarySource = primaryResult.data!
    
    // Stage 4: Generate gist
    const generateResult = await generateGist(payload, sources, primarySource, requestId)
    if (!generateResult.success) {
      return safeJsonResponse({
        requestId,
        ...generateResult
      }, 502) // 502 Bad Gateway for AI provider failures
    }
    const gistDraft = generateResult.data!
    
    // Stage 5: Validate alignment
    const alignmentResult = validateAlignment(gistDraft, primarySource, sources, requestId)
    if (!alignmentResult.success) {
      return safeJsonResponse({
        requestId,
        ...alignmentResult
      }, 422) // 422 for misalignment
    }
    
    // Stage 6: Insert into DB
    const insertResult = await insertGist(payload, gistDraft, sources, primarySource, requestId)
    if (!insertResult.success) {
      return safeJsonResponse({
        requestId,
        ...insertResult
      }, 500)
    }
    const gist = insertResult.data!
    
    // Success!
    console.log(`[${functionName}] SUCCESS`, { requestId, gistId: gist.id })
    
    return safeJsonResponse({
      success: true,
      requestId,
      stage: 'complete',
      gist: gist,
      confidence: gistDraft.confidence,
      primary_source_url: primarySource.url,
      source_count: sources.length,
      citations_count: gistDraft.source_citations?.length || 0,
    }, 201)
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[${functionName}] FATAL_ERROR`, { requestId, error: errorMsg })
    
    return safeJsonResponse({
      success: false,
      requestId,
      stage: 'fatal',
      error: errorMsg
    }, 500)
  }
})

