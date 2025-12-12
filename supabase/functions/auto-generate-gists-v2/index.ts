import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, createResponse, createErrorResponse } from '../_shared/http.ts'
import { env, ensureSupabaseEnv } from '../_shared/env.ts'

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
    console.log('🤖 Auto-gist generation v2 started at', new Date().toISOString())

    ensureSupabaseEnv();
    const supabaseUrl = env.SUPABASE_URL
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Step 3: Get unprocessed raw_trends that don't have gists yet
    console.log('🔍 Checking for raw_trends without existing gists...')
    
    // Fetch raw_trends that are not processed and don't have associated gists
    const { data: unprocessedTrends, error: trendsError } = await supabase
      .from('raw_trends')
      .select('id, title, category, url, published_at')
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (trendsError) {
      console.warn('⚠️ Error fetching raw_trends:', trendsError)
    }
    
    // Check which raw_trends already have gists (by source_url matching url)
    const trendsToProcess: any[] = []
    if (unprocessedTrends && unprocessedTrends.length > 0) {
      const trendUrls = unprocessedTrends.map(t => t.url).filter(Boolean)
      
      if (trendUrls.length > 0) {
        const { data: existingGists } = await supabase
          .from('gists')
          .select('source_url')
          .in('source_url', trendUrls)
        
        const existingGistUrls = new Set(
          (existingGists || []).map(g => g.source_url?.toLowerCase().trim()).filter(Boolean)
        )
        
        // Only process trends that don't have gists yet
        for (const trend of unprocessedTrends) {
          const trendUrl = trend.url?.toLowerCase().trim()
          if (!trendUrl || !existingGistUrls.has(trendUrl)) {
            trendsToProcess.push({
              topic: trend.title,
              category: trend.category,
              source_url: trend.url,
              published_at: trend.published_at,
              raw_trend_id: trend.id,
            })
          } else {
            console.log(`⏭️  Skipping ${trend.title} - gist already exists`)
            // Mark as processed since gist exists
            await supabase
              .from('raw_trends')
              .update({ processed: true })
              .eq('id', trend.id)
          }
        }
      } else {
        // No URLs, process by title
        trendsToProcess.push(...unprocessedTrends.map(t => ({
          topic: t.title,
          category: t.category,
          source_url: t.url,
          published_at: t.published_at,
          raw_trend_id: t.id,
        })))
      }
    }
    
    console.log(`📊 Found ${trendsToProcess.length} raw_trends without gists`)
    
    // Combine scraper trends (from API) with unprocessed raw_trends and predefined topics
    const trendsFromScraper = trends.slice(0, Math.max(0, 3 - trendsToProcess.length)).map((t: any) => ({
      topic: t.topic || t.title,
      category: t.category,
      source_url: t.url || t.source_url,
      published_at: t.published_at,
    }))
    
    const allTopics = [
      ...trendsToProcess.slice(0, 5), // Prioritize unprocessed raw_trends
      ...trendsFromScraper,
      ...topicsToGenerate.slice(0, 2) // Add 2 predefined topics
    ]
    
    const generatedGists = []
    for (const topicData of allTopics) {
      try {
        console.log(`🎨 Generating gist for: ${topicData.topic}`)
        
        // Skip if this is from raw_trends and already has a gist (double-check)
        if (topicData.source_url && topicData.raw_trend_id) {
          const { data: existingGist } = await supabase
            .from('gists')
            .select('id')
            .eq('source_url', topicData.source_url)
            .limit(1)
            .single()
          
          if (existingGist) {
            console.log(`⏭️  Skipping ${topicData.topic} - gist already exists`)
            // Mark as processed
            await supabase
              .from('raw_trends')
              .update({ processed: true })
              .eq('id', topicData.raw_trend_id)
            continue
          }
        }
        
        // Call publish-gist-v2 which handles the full pipeline
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/publish-gist-v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: topicData.topic,
            topicCategory: topicData.category,
            sourceUrl: topicData.source_url,
            newsPublishedAt: topicData.published_at,
          })
        })

        const publishData = await publishResponse.json().catch(() => ({}))

        if (publishResponse.ok && publishData.success) {
          generatedGists.push(publishData.gist)
          console.log(`✅ Published gist: ${topicData.topic}`)
          
          // Mark trend as processed if it came from raw_trends
          if (topicData.raw_trend_id) {
            await supabase
              .from('raw_trends')
              .update({ processed: true })
              .eq('id', topicData.raw_trend_id)
          } else if (topicData.source_url) {
            // Fallback: mark by source_url match
            await supabase
              .from('raw_trends')
              .update({ processed: true })
              .eq('url', topicData.source_url)
          }
        } else {
          console.log(`⚠️ Failed to publish gist for ${topicData.topic}:`, publishData.error)
        }
      } catch (error) {
        console.log(`❌ Error processing ${topicData.topic}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    console.log(`🎉 Auto-generation v2 complete! Generated ${generatedGists.length} gists`)

    return createResponse({
      success: true,
      generated: generatedGists.length,
      total_trends: trends.length,
      gists: generatedGists,
    })
  } catch (error) {
    console.error('❌ Auto-generation v2 error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500
    )
  }
})
