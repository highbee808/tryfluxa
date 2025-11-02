import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
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
        
        // Publish the gist
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
          }),
        })

        if (publishResponse.ok) {
          const publishData = await publishResponse.json()
          generatedGists.push(publishData)
          console.log(`✅ Published gist: ${gistData.headline}`)
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
