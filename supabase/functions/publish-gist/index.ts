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
  console.log('🚀 publish-gist started - method:', req.method)
  
  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled')
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json().catch(() => ({}))
    console.log('📦 Request body:', JSON.stringify(body))
    
    // Verify authentication
    console.log('🔐 Checking authentication...')
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ No authorization header')
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized - No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Authorization header found')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    console.log('🔍 Verifying user...')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.log('❌ Auth error:', authError?.message)
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ User authenticated:', user.id)

    // Check admin role
    console.log('👑 Checking admin role...')
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    })

    if (roleError) {
      console.log('❌ Role check error:', roleError.message)
      return new Response(JSON.stringify({ success: false, error: `Role check failed: ${roleError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!isAdmin) {
      console.log('❌ User is not admin')
      return new Response(JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ Admin access confirmed')

    // Validate input
    console.log('📝 Validating input...')
    let validated
    try {
      validated = publishSchema.parse(body)
    } catch (validationError: any) {
      console.log('❌ Validation failed:', validationError.message)
      return new Response(JSON.stringify({ success: false, error: `Invalid input: ${validationError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const { topic, imageUrl, topicCategory } = validated

    console.log('✅ Input validated')
    console.log('📝 Topic:', topic)
    console.log('🖼️ Image URL:', imageUrl || 'auto-generate')
    console.log('🏷️ Category:', topicCategory || 'Trending')

    // Check environment variables
    console.log('🔧 Checking environment variables...')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!supabaseUrl) console.log('⚠️ SUPABASE_URL missing')
    if (!serviceRoleKey) console.log('⚠️ SUPABASE_SERVICE_ROLE_KEY missing')
    if (!lovableApiKey) console.log('⚠️ LOVABLE_API_KEY missing')
    if (!openaiApiKey) console.log('⚠️ OPENAI_API_KEY missing')
    
    console.log('✅ Environment variables checked')

    const supabase = createClient(supabaseUrl ?? '', serviceRoleKey ?? '')

    let gistId: string | null = null

    try {
      // Step 1: Generate gist content
      console.log('📝 Step 1: Generating gist content...')
      console.log('🤖 Calling generate-gist function with topic:', topic)
      
      const generateResponse = await supabase.functions.invoke('generate-gist', {
        body: { topic }
      })

      console.log('📨 Generate response status:', generateResponse.error ? 'ERROR' : 'SUCCESS')
      
      if (generateResponse.error) {
        console.log('❌ Generate-gist error:', generateResponse.error.message)
        throw new Error(`Failed to generate gist: ${generateResponse.error.message}`)
      }

      console.log('✅ Gist content generated:', JSON.stringify(generateResponse.data))
      const { headline, context, narration, suggested_image } = generateResponse.data

      // Step 2: Convert narration to speech
      console.log('🎙️ Step 2: Converting to speech...')
      console.log('🔊 Narration length:', narration.length, 'characters')
      
      const ttsResponse = await supabase.functions.invoke('text-to-speech', {
        body: { text: narration, voice: 'shimmer', speed: 0.94 }
      })

      console.log('📨 TTS response status:', ttsResponse.error ? 'ERROR' : 'SUCCESS')
      
      if (ttsResponse.error) {
        console.log('❌ Text-to-speech error:', ttsResponse.error.message)
        throw new Error(`Failed to generate audio: ${ttsResponse.error.message}`)
      }

      console.log('✅ Audio generated:', ttsResponse.data.audioUrl)
      const { audioUrl } = ttsResponse.data

      // Step 3: Get image URL from Unsplash
      console.log('🖼️ Step 3: Preparing image URL...')
      const finalImageUrl = imageUrl || `https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8${encodeURIComponent(suggested_image)}%7Cen%7C0%7C%7C0%7Cfm%3Dpng`
      console.log('✅ Image URL:', finalImageUrl)

      // Step 4: Save to database
      console.log('💾 Step 4: Saving to database...')
      const gistData = {
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
      }
      console.log('📄 Gist data:', JSON.stringify(gistData))
      
      const { data: gist, error: dbError } = await supabase
        .from('gists')
        .insert(gistData)
        .select()
        .single()

      if (dbError) {
        console.log('❌ Database error:', dbError.message, dbError.details)
        throw new Error(`Failed to save gist: ${dbError.message}`)
      }

      gistId = gist.id
      console.log('✅ Gist saved to DB:', gist.id)
      console.log('🎉 ✅ Done - Gist published successfully!')

      return new Response(
        JSON.stringify({ 
          success: true, 
          gist,
          headline: gist.headline,
          audio_url: gist.audio_url
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    } catch (stepError) {
      console.log('❌ Step failed:', stepError instanceof Error ? stepError.message : 'Unknown error')
      console.log('📚 Error stack:', stepError instanceof Error ? stepError.stack : 'No stack')
      
      // If any step fails, mark gist as failed if we created one
      if (gistId) {
        console.log('🔄 Marking gist as failed:', gistId)
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
    console.log('❌ Fatal error in publish-gist:', error instanceof Error ? error.message : 'Unknown error')
    console.log('📚 Error stack:', error instanceof Error ? error.stack : 'No stack')
    
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
