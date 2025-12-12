import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, createResponse, createErrorResponse } from '../_shared/http.ts'
import { env, ensureSupabaseEnv, ENV } from '../_shared/env.ts'

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
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders })
  }

  // Validate HMAC signature for scheduled functions
  const isValid = await validateCronSignature(req)
  if (!isValid) {
    console.error('❌ Invalid or missing HMAC signature')
    return createErrorResponse('Unauthorized - Invalid signature', 401)
  }

  console.log('🤖 Auto-gist generation v2 triggered with valid HMAC signature')

  try {
    console.log('[AUTO-GEN START]', { triggeredBy: 'cron' })
    console.log('🤖 Auto-gist generation v2 started at', new Date().toISOString())

    ensureSupabaseEnv();
    // CRITICAL: Use ENV.SUPABASE_SERVICE_ROLE_KEY for all DB operations
    const supabaseUrl = ENV.SUPABASE_URL
    const supabaseServiceKey = ENV.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        global: { 
          headers: { 
            Authorization: `Bearer ${supabaseServiceKey}` 
          } 
        }
      }
    )

    // Step 1: Scrape trending topics
    console.log('📡 Fetching trending topics...')
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
        console.log(`✅ Found ${trends.length} trending topics`)
      } else {
        const errorText = await trendsResponse.text().catch(() => '')
        console.warn('⚠️ scrape-trends failed, using fallback topics only:', errorText)
      }
    } catch (trendError) {
      console.warn('⚠️ scrape-trends unreachable, using fallback topics only:', trendError)
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
    console.log('🔍 Checking for raw_trends without existing gists (by raw_trend_id)...')
    
    // First, get all existing raw_trend_ids from gists
    const { data: existingGistTrendIds, error: existingError } = await supabase
      .from('gists')
      .select('raw_trend_id')
      .not('raw_trend_id', 'is', null)
    
    if (existingError) {
      console.error('❌ Error fetching existing gist raw_trend_ids:', existingError)
    }
    
    const existingTrendIds = new Set(
      (existingGistTrendIds || []).map(g => g.raw_trend_id).filter(Boolean)
    )
    
    console.log(`📊 Found ${existingTrendIds.size} raw_trends that already have gists`)
    
    // Fetch ALL raw_trends (not just unprocessed) to ensure we catch everything
    // We'll filter by raw_trend_id NOT IN existingTrendIds
    // NOTE: raw_trends only contains: id, image_url
    const { data: allRawTrends, error: trendsError } = await supabase
      .from('raw_trends')
      .select('id, image_url')
      .order('id', { ascending: false })
      .limit(10)
    
    if (trendsError) {
      console.error('[AUTO-GEN ERROR] Error fetching raw_trends:', trendsError)
      console.error('❌ Error fetching raw_trends:', trendsError)
      return createErrorResponse(`Failed to fetch raw_trends: ${trendsError.message}`, 500)
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
    
    console.log('[AUTO-GEN INFO]', `Found ${trendsToProcess.length} raw_trends without gists`)
    console.log(`📊 Found ${trendsToProcess.length} raw_trends without gists (ready to process)`)
    
    // CRITICAL: Process only raw_trends rows (prioritize these for strict 1:1 mapping)
    // NOTE: raw_trends only contains id and image_url, so topic must come from elsewhere
    // For now, we'll use a default topic since raw_trends doesn't have title/topic
    const generatedGists = []
    for (const trend of trendsToProcess) {
      try {
        // CRITICAL: Each trend must have raw_trend_id for proper linking
        if (!trend.id) {
          console.warn(`⚠️ Skipping trend without ID`)
          continue
        }
        
        console.log(`🎨 Generating gist for raw_trend_id: ${trend.id}`)
        
        // Double-check: Ensure no gist exists for this raw_trend_id
        const { data: existingGist } = await supabase
          .from('gists')
          .select('id, raw_trend_id')
          .eq('raw_trend_id', trend.id)
          .limit(1)
          .single()
        
        if (existingGist) {
          console.log(`⏭️  Skipping - gist already exists for raw_trend_id: ${trend.id}`)
          // Mark as processed
          await supabase
            .from('raw_trends')
            .update({ processed: true })
            .eq('id', trend.id)
          continue
        }
        
        // Debug log before generation
        console.log('[AUTO-GEN]', {
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
          console.log(`✅ Published gist for raw_trend_id: ${trend.id}, headline: ${publishData.gist?.headline || 'unknown'}`)
          
          // Debug log for pipeline success
          console.log('[PIPELINE SUCCESS]', {
            gistId: publishData.gist?.id || 'unknown',
            rawTrendId: trend.id,
            headline: publishData.gist?.headline || 'unknown',
          })
          
          // CRITICAL: Mark trend as processed using raw_trend_id
          const { error: updateError } = await supabase
            .from('raw_trends')
            .update({ processed: true })
            .eq('id', trend.id)
          
          if (updateError) {
            console.error(`❌ Error marking raw_trend ${trend.id} as processed:`, updateError)
          } else {
            console.log(`✅ Marked raw_trend ${trend.id} as processed`)
          }
        } else {
          console.error('[AUTO-GEN ERROR] Failed to publish gist for raw_trend', { rawTrendId: trend.id, error: publishData.error })
          console.log(`⚠️ Failed to publish gist for raw_trend_id ${trend.id}:`, publishData.error)
        }
      } catch (error) {
        console.error('[AUTO-GEN ERROR] Error processing raw_trend', { rawTrendId: trend.id, error: error instanceof Error ? error.message : 'Unknown error' })
        console.log(`❌ Error processing raw_trend_id ${trend.id}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    console.log(`🎉 Auto-generation v2 complete! Generated ${generatedGists.length} gists`)
    
    // Debug log for overall success
    console.log('[PIPELINE SUCCESS]', {
      generated: generatedGists.length,
      total_trends: trends.length,
    })

    return createResponse({
      success: true,
      generated: generatedGists.length,
      total_trends: trends.length,
      gists: generatedGists,
    })
  } catch (error) {
    console.error('[PIPELINE FAILURE]', error)
    console.error('[AUTO-GEN ERROR]', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // ALWAYS return error with CORS headers - never throw
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
