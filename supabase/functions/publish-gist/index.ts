import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const publishSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long (max 500 characters)'),
  imageUrl: z.string().url('Invalid URL format').optional(),
  topicCategory: z.enum(['Celebrity Gossip', 'Sports', 'Memes', 'Fashion', 'Gaming', 'Tech', 'Music']).optional()
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate input
    const body = await req.json()
    const validated = publishSchema.parse(body)
    const { topic, imageUrl, topicCategory } = validated

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
