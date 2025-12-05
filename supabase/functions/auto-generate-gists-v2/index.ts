import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, createResponse, createErrorResponse } from '../_shared/http.ts'
import { ENV } from '../_shared/env.ts'

// HMAC signature validation for scheduled functions
async function validateCronSignature(req: Request): Promise<boolean> {
  const cronSecret = ENV.CRON_SECRET

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

    const supabaseUrl = ENV.VITE_SUPABASE_URL
    const supabaseServiceKey = ENV.VITE_SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SB_SERVICE_ROLE_KEY')
    }
    
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

    // Step 3: Generate gists for trending topics from scraper
    const generatedGists = []
    const trendsToProcess = trends.slice(0, 3) // Take 3 from scraper
    
    // Combine scraper trends with predefined topics
    const allTopics = [
      ...trendsToProcess.map((t: any) => ({ topic: t.topic || t.title, category: t.category, source_url: t.url, published_at: t.published_at })),
      ...topicsToGenerate.slice(0, 2) // Add 2 predefined topics
    ]
    
    for (const topicData of allTopics) {
      try {
        console.log(`🎨 Generating gist for: ${topicData.topic}`)
        
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
          if (topicData.source_url && trendsToProcess.find((t: any) => t.topic === topicData.topic || t.title === topicData.topic)) {
            await supabase
              .from('raw_trends')
              .update({ processed: true })
              .eq('title', topicData.topic)
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
