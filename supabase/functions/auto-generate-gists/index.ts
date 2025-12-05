import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-signature',
}

// HMAC signature validation for scheduled functions
async function validateCronSignature(req: Request): Promise<boolean> {
  const cronSecret = Deno.env.get('CRON_SECRET')

  // If no secret is configured we fall back to allowing the invocation.
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured — skipping cron signature validation')
    return true
  }

  // Manual override header for testing or invoking from dashboard.
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
  if (req.method === "OPTIONS") {
    return new Response("OK", { headers: corsHeaders })
  }

  // Validate HMAC signature for scheduled functions (SECURITY FIX)
  const isValid = await validateCronSignature(req)
  if (!isValid) {
    console.error('❌ Invalid or missing HMAC signature')
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
      { status: 401, headers: corsHeaders }
    )
  }

  console.log('🤖 Auto-gist generation triggered with valid HMAC signature');

  try {
    console.log('🤖 Auto-gist generation started at', new Date().toISOString())

    // Use SB_SERVICE_ROLE_KEY (Supabase doesn't allow SUPABASE_ prefix in secret names)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SB_SERVICE_ROLE_KEY')
    
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
    ];

    // Step 3: Generate gists for trending topics from scraper
    const generatedGists = []
    const trendsToProcess = trends.slice(0, 3) // Take 3 from scraper
    
    // Combine scraper trends with predefined topics
    const allTopics = [
      ...trendsToProcess.map((t: any) => ({ topic: t.topic || t.title, category: t.category, source_url: t.url, published_at: t.published_at })),
      ...topicsToGenerate.slice(0, 2) // Add 2 predefined topics
    ];
    
    for (const topicData of allTopics) {
      try {
        console.log(`🎨 Generating gist for: ${topicData.topic}`)
        
        // Directly call publish-gist-v2 which will handle generation (no TTS)
        const publishResponse = await supabase.functions.invoke('publish-gist-v2', {
          body: {
            topic: topicData.topic,
            topicCategory: topicData.category,
            sourceUrl: topicData.source_url,
            newsPublishedAt: topicData.published_at,
          }
        })

        if (!publishResponse.error && publishResponse.data) {
          generatedGists.push(publishResponse.data)
          console.log(`✅ Published gist: ${topicData.topic}`)
          
          // Mark trend as processed if it came from raw_trends
          if (topicData.source_url && trendsToProcess.find((t: any) => t.topic === topicData.topic || t.title === topicData.topic)) {
            await supabase
              .from('raw_trends')
              .update({ processed: true })
              .eq('title', topicData.topic)
          }
        } else {
          console.log(`⚠️ Failed to publish gist for ${topicData.topic}:`, publishResponse.error)
        }
      } catch (error) {
        console.log(`❌ Error processing ${topicData.topic}:`, error instanceof Error ? error.message : 'Unknown error')
      }
    }

    console.log(`🎉 Auto-generation complete! Generated ${generatedGists.length} gists`)

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedGists.length,
        total_trends: trends.length,
        gists: generatedGists,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('❌ Auto-generation error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
