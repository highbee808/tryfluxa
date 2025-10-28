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
    const { topic, imageUrl } = await req.json()

    if (!topic) {
      throw new Error('Topic is required')
    }

    console.log('Publishing gist for topic:', topic)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Generate gist content
    console.log('Step 1: Generating gist content...')
    const generateResponse = await supabase.functions.invoke('generate-gist', {
      body: { topic }
    })

    if (generateResponse.error) {
      throw new Error(`Failed to generate gist: ${generateResponse.error.message}`)
    }

    const { headline, context, script } = generateResponse.data

    // Step 2: Convert script to speech
    console.log('Step 2: Converting to speech...')
    const ttsResponse = await supabase.functions.invoke('text-to-speech', {
      body: { text: script, voice: 'nova' }
    })

    if (ttsResponse.error) {
      throw new Error(`Failed to generate audio: ${ttsResponse.error.message}`)
    }

    const { audioUrl } = ttsResponse.data

    // Step 3: Save to database
    console.log('Step 3: Saving to database...')
    const { data: gist, error: dbError } = await supabase
      .from('gists')
      .insert({
        headline,
        context,
        script,
        audio_url: audioUrl,
        topic,
        image_url: imageUrl || `https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=60`,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      throw new Error(`Failed to save gist: ${dbError.message}`)
    }

    console.log('Gist published successfully:', gist.id)

    return new Response(
      JSON.stringify({ gist }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
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
