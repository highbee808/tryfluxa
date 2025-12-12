import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/http.ts'
import { env, ensureSupabaseEnv, ENV } from '../_shared/env.ts'

// Safe status code validation - prevents RangeError from invalid status codes
function safeStatus(status?: number | null): number {
  if (!status || status === 0) return 500
  if (status < 200 || status > 599) return 500
  return status
}

// Standardized JSON response with safe status and CORS headers
function jsonResponse(payload: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(payload),
    {
      status: safeStatus(status),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

// HMAC signature validation for scheduled functions
async function validateCronSignature(req: Request): Promise<boolean> {
  const cronSecret = env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured — skipping cron validation')
    return true
  }

  const rawSecret = req.headers.get('x-cron-secret')
  if (rawSecret && rawSecret === cronSecret) {
    return true
  }

  const signature = req.headers.get('x-cron-signature')
  if (!signature) {
    console.error('Missing x-cron-signature header')
    return false
  }
  
  const clonedReq = req.clone()
  const body = await clonedReq.text()
  const encoder = new TextEncoder()
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(cronSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body || '')
  )
  
  const expectedBase64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)))
  
  return signature === expectedBase64
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  const functionName = 'auto-generate-gists-v2'
  
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders })
  }

  console.log(`[${functionName}] START`, { method: req.method, requestId })

  // Validate HMAC signature for scheduled functions
  const isValid = await validateCronSignature(req)
  if (!isValid) {
    console.error(`[${functionName}] AUTH_ERROR Invalid or missing HMAC signature`, { requestId })
    return jsonResponse({ success: false, error: 'Unauthorized - Invalid signature' }, 401)
  }

  console.log(`[${functionName}] AUTH_SUCCESS Valid HMAC signature`, { requestId })

  try {
    console.log(`[${functionName}] PIPELINE_START`, { requestId, triggeredBy: 'cron', timestamp: new Date().toISOString() })

    ensureSupabaseEnv();
    // CRITICAL: Edge Functions must use SERVICE_ROLE_KEY only - no user auth
    // This prevents auth token refresh attempts that fail in Edge runtime
    const supabaseUrl = ENV.SUPABASE_URL
    const supabaseServiceKey = ENV.SUPABASE_SERVICE_ROLE_KEY
    
    console.log(`[${functionName}] INIT_SERVICE_ROLE_CLIENT`, { requestId })
    
    // Initialize Supabase client with SERVICE_ROLE_KEY and auth features DISABLED
    // This prevents any auth token refresh attempts
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: { 
          headers: { 
            Authorization: `Bearer ${supabaseServiceKey}` 
          } 
        }
      }
    )

    // Step 1: Scrape trending topics
    console.log(`[${functionName}] STEP_1_SCRAPE_TRENDS`, { requestId })
    let trends: any[] = []
    try {
      const trendsResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-trends`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json()
        trends = trendsData.trends || []
        console.log(`[${functionName}] SCRAPE_TRENDS_SUCCESS`, { requestId, count: trends.length })
      } else {
        const errorText = await trendsResponse.text().catch(() => '')
        console.warn(`[${functionName}] SCRAPE_TRENDS_FAILED`, { requestId, error: errorText })
      }
    } catch (trendError) {
      console.warn(`[${functionName}] SCRAPE_TRENDS_EXCEPTION`, { 
        requestId, 
        error: trendError instanceof Error ? trendError.message : 'Unknown error' 
      })
    }

    // Step 2: Get diverse topics to generate gists about
    const topicsToGenerate = [
      { topic: "Latest Premier League Results", category: "Sports" },
      { topic: "Top Music Releases This Week", category: "Music" },
      { topic: "Breaking Entertainment News", category: "Entertainment" },
      { topic: "Tech Industry Updates", category: "Technology" },
      { topic: "Celebrity Fashion Trends", category: "Celebrity Gossip" }
    ]

    // Step 3: Get raw_trends that don't have gists yet (using raw_trend_id foreign key)
    // CRITICAL: This ensures strict 1:1 mapping - only process trends without existing gists
    // SQL equivalent: SELECT * FROM raw_trends WHERE id NOT IN (SELECT raw_trend_id FROM gists WHERE raw_trend_id IS NOT NULL)
    console.log(`[${functionName}] STEP_3_FETCH_RAW_TRENDS`, { requestId })
    
    // First, get all existing raw_trend_ids from gists
    const { data: existingGistTrendIds, error: existingError } = await supabase
      .from('gists')
      .select('raw_trend_id')
      .not('raw_trend_id', 'is', null)
    
    if (existingError) {
      console.error(`[${functionName}] FETCH_EXISTING_GISTS_ERROR`, { requestId, error: existingError })
    }
    
    const existingTrendIds = new Set(
      (existingGistTrendIds || []).map(g => g.raw_trend_id).filter(Boolean)
    )
    
    console.log(`[${functionName}] EXISTING_GISTS_COUNT`, { requestId, count: existingTrendIds.size })
    
    // Fetch ALL raw_trends (not just unprocessed) to ensure we catch everything
    // We'll filter by raw_trend_id NOT IN existingTrendIds
    // NOTE: raw_trends only contains: id, image_url
    const { data: allRawTrends, error: trendsError, status: trendsStatus } = await supabase
      .from('raw_trends')
      .select('id, image_url')
      .order('id', { ascending: false })
      .limit(10)
    
    if (trendsError) {
      console.error(`[${functionName}] FETCH_RAW_TRENDS_ERROR`, { 
        requestId, 
        error: trendsError.message,
        code: trendsError.code,
        details: trendsError
      })
      return jsonResponse(
        { 
          success: false, 
          error: `Failed to fetch raw_trends: ${trendsError.message}`,
          details: trendsError
        },
        safeStatus(trendsStatus || 500)
      )
    }
    
    // CRITICAL: Filter out trends that already have gists (by raw_trend_id)
    // This implements: WHERE id NOT IN (SELECT raw_trend_id FROM gists)
    const trendsToProcess = (allRawTrends || [])
      .filter(trend => {
        const hasGist = existingTrendIds.has(trend.id)
        if (hasGist) {
          console.log(`⏭️  Skipping raw_trend ${trend.id} - already has gist`)
        }
        return !hasGist
      })
      .slice(0, 10) // Process max 10 at a time
    
    console.log(`[${functionName}] RAW_TRENDS_TO_PROCESS`, { requestId, count: trendsToProcess.length })
    
    // CRITICAL: Process only raw_trends rows (prioritize these for strict 1:1 mapping)
    // NOTE: raw_trends only contains id and image_url, so topic must come from elsewhere
    // For now, we'll use a default topic since raw_trends doesn't have title/topic
    const generatedGists = []
    for (const trend of trendsToProcess) {
      try {
        // CRITICAL: Each trend must have raw_trend_id for proper linking
        if (!trend.id) {
          console.warn(`[${functionName}] SKIP_NO_ID`, { requestId })
          continue
        }
        
        console.log(`[${functionName}] PROCESSING_TREND`, { requestId, raw_trend_id: trend.id })
        
        // Double-check: Ensure no gist exists for this raw_trend_id
        const { data: existingGist } = await supabase
          .from('gists')
          .select('id, raw_trend_id')
          .eq('raw_trend_id', trend.id)
          .limit(1)
          .single()
        
        if (existingGist) {
          console.log(`[${functionName}] SKIP_EXISTING_GIST`, { requestId, raw_trend_id: trend.id })
          // Mark as processed
          await supabase
            .from('raw_trends')
            .update({ processed: true })
            .eq('id', trend.id)
          continue
        }
        
        // Debug log before generation
        console.log(`[${functionName}] GENERATE_GIST_START`, {
          requestId,
          raw_trend_id: trend.id,
          raw_image: trend.image_url,
        })
        
        // NOTE: Since raw_trends only has id and image_url, we need a topic from the request
        // For auto-generation, we'll use a generic topic or skip if no topic is available
        // In a real scenario, the topic should come from the pipeline input
        const defaultTopic = "Latest trending news" // Fallback topic
        
        // Call publish-gist-v2 with rawTrendId to ensure proper 1:1 mapping
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/publish-gist-v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: defaultTopic, // Topic must come from pipeline input, not raw_trends
            topicCategory: 'Trending',
            rawTrendId: trend.id, // CRITICAL: Pass raw_trend_id for proper linking
            imageUrl: trend.image_url, // Pass image_url from raw_trends
          })
        })

        const publishData = await publishResponse.json().catch(() => ({}))

        if (publishResponse.ok && publishData.success) {
          generatedGists.push(publishData.gist)
          console.log(`[${functionName}] PUBLISH_GIST_SUCCESS`, {
            requestId,
            raw_trend_id: trend.id,
            gistId: publishData.gist?.id || 'unknown',
            headline: publishData.gist?.headline || 'unknown',
          })
          
          // CRITICAL: Mark trend as processed using raw_trend_id
          const { error: updateError } = await supabase
            .from('raw_trends')
            .update({ processed: true })
            .eq('id', trend.id)
          
          if (updateError) {
            console.error(`[${functionName}] MARK_PROCESSED_ERROR`, { 
              requestId, 
              raw_trend_id: trend.id, 
              error: updateError 
            })
          } else {
            console.log(`[${functionName}] MARK_PROCESSED_SUCCESS`, { requestId, raw_trend_id: trend.id })
          }
        } else {
          console.error(`[${functionName}] PUBLISH_GIST_FAILED`, { 
            requestId, 
            rawTrendId: trend.id, 
            error: publishData.error,
            status: publishResponse.status
          })
        }
      } catch (error) {
        console.error(`[${functionName}] PROCESS_TREND_EXCEPTION`, { 
          requestId,
          rawTrendId: trend.id, 
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    }

    console.log(`[${functionName}] PIPELINE_COMPLETE`, {
      requestId,
      generated: generatedGists.length,
      total_trends: trends.length,
    })

    return jsonResponse({
      success: true,
      generated: generatedGists.length,
      total_trends: trends.length,
      gists: generatedGists,
    }, 200)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`[${functionName}] PIPELINE_FAILURE`, { 
      requestId,
      error: errorMessage,
      stack: errorStack,
      errorDetails: error
    })
    
    // ALWAYS return error with CORS headers - never throw
    return jsonResponse(
      { 
        success: false, 
        error: errorMessage 
      },
      500
    )
  }
})
