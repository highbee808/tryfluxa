import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { topic, imageUrl, topicCategory } = await req.json()

    if (!topic) {
      throw new Error('Topic is required')
    }

    console.log('Publishing gist for topic:', topic)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let gistId: string | null = null

    try {
      // Step 1: Generate gist content
      console.log('Step 1: Generating gist content...')
      const generateResponse = await supabase.functions.invoke('generate-gist', {
        body: { topic }
      })

      if (generateResponse.error) {
        throw new Error(`Failed to generate gist: ${generateResponse.error.message}`)
      }

      const { headline, context, narration, suggested_image } = generateResponse.data

      // Step 2: Convert narration to speech
      console.log('Step 2: Converting to speech...')
      const ttsResponse = await supabase.functions.invoke('text-to-speech', {
        body: { text: narration, voice: 'shimmer', speed: 0.94 }
      })

      if (ttsResponse.error) {
        throw new Error(`Failed to generate audio: ${ttsResponse.error.message}`)
      }

      const { audioUrl } = ttsResponse.data

      // Step 3: Get image URL from Unsplash
      const finalImageUrl = imageUrl || `https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8${encodeURIComponent(suggested_image)}%7Cen%7C0%7C%7C0%7Cfm%3Dpng`

      // Step 4: Save to database
      console.log('Step 3: Saving to database...')
      const { data: gist, error: dbError } = await supabase
        .from('gists')
        .insert({
          headline,
          context,
          script: narration,
          narration,
          audio_url: audioUrl,
          topic,
          topic_category: topicCategory || 'Trending',
          image_url: finalImageUrl,
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Failed to save gist: ${dbError.message}`)
      }

      gistId = gist.id
      console.log('Gist published successfully:', gist.id)

      return new Response(
        JSON.stringify({ gist }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    } catch (stepError) {
      // If any step fails, mark gist as failed if we created one
      if (gistId) {
        await supabase
          .from('gists')
          .update({
            status: 'failed',
            meta: { error: stepError instanceof Error ? stepError.message : 'Unknown error' }
          })
          .eq('id', gistId)
      }
      throw stepError
    }
  } catch (error) {
    console.error('Error in publish-gist function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
