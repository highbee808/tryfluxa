import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-signature',
}

// HMAC signature validation for scheduled functions
async function validateCronSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('x-cron-signature')
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return false
  }
  
  if (!signature) {
    console.error('Missing x-cron-signature header')
    return false
  }
  
  const body = await req.text()
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
    return new Response(null, { headers: corsHeaders })
  }

  // Validate HMAC signature for scheduled functions
  const isValid = await validateCronSignature(req)
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid signature' }),
      { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    console.log('🤖 Auto-gist generation started at', new Date().toISOString())

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Scrape trending topics
    console.log('📡 Fetching trending topics...')
    const trendsResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-trends`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!trendsResponse.ok) {
      throw new Error('Failed to fetch trends')
    }

    const trendsData = await trendsResponse.json()
    const trends = trendsData.trends || []
    console.log(`✅ Found ${trends.length} trending topics`)

    // Step 2: Generate gists for each trending topic
    const generatedGists = []
    
    for (const trend of trends) {
      try {
        console.log(`🎨 Generating gist for: ${trend.topic}`)
        
        // Generate gist content
        const gistResponse = await fetch(`${supabaseUrl}/functions/v1/generate-gist`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topic: trend.topic }),
        })

        if (!gistResponse.ok) {
          console.log(`⚠️ Failed to generate gist for ${trend.topic}`)
          continue
        }

        const gistData = await gistResponse.json()
        
        // Publish the gist with source URL and published date
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/publish-gist`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topic: trend.topic,
            topicCategory: trend.category,
            imageUrl: gistData.ai_generated_image,
            sourceUrl: trend.source_url,
            newsPublishedAt: trend.published_at,
          }),
        })

        if (publishResponse.ok) {
          const publishData = await publishResponse.json()
          generatedGists.push(publishData)
          console.log(`✅ Published gist: ${gistData.headline}`)
          
          // Mark trend as processed in raw_trends table
          await supabase
            .from('raw_trends')
            .update({ processed: true })
            .eq('title', trend.topic)
        }
      } catch (error) {
        console.log(`❌ Error processing ${trend.topic}:`, error instanceof Error ? error.message : 'Unknown error')
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
