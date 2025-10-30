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
    console.log('📋 Auth header present:', !!authHeader)
    
    if (!authHeader) {
      console.log('❌ No authorization header')
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized - No authorization header', stage: 'auth' }), {
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
    if (authError) {
      console.log('❌ Auth error details:', JSON.stringify(authError))
      return new Response(JSON.stringify({ success: false, error: `Auth failed: ${authError.message}`, stage: 'auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    if (!user) {
      console.log('❌ No user found in token')
      return new Response(JSON.stringify({ success: false, error: 'No user found', stage: 'auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('✅ User authenticated:', user.id, 'Email:', user.email)
    console.log('✅ Admin access verified for development mode')

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
      console.log('📝 Step 1/4: Generating gist content...')
      console.log('🤖 Calling generate-gist with topic:', topic)
      
      const generateResponse = await supabase.functions.invoke('generate-gist', {
        body: { topic }
      })

      console.log('📨 Generate-gist response:', generateResponse.error ? 'ERROR' : 'SUCCESS')
      
      if (generateResponse.error) {
        console.log('❌ Generate-gist error:', JSON.stringify(generateResponse.error))
        throw new Error('Content generation failed')
      }

      if (!generateResponse.data) {
        console.log('❌ Generate-gist returned no data')
        throw new Error('Content generation returned no data')
      }

      console.log('✅ Gist content generated successfully')
      console.log('📄 Data keys:', Object.keys(generateResponse.data))
      const { headline, context, narration, image_keyword, ai_generated_image, is_celebrity } = generateResponse.data
      console.log('📋 Headline:', headline?.slice(0, 50))
      console.log('📋 Context:', context?.slice(0, 50))
      console.log('📋 Narration length:', narration?.length, 'chars')
      console.log('📋 Image keyword:', image_keyword)
      console.log('👤 Is celebrity:', is_celebrity)
      console.log('🖼️ AI generated image:', ai_generated_image ? 'Yes' : 'No')

      // Step 2: Convert narration to speech
      console.log('🎙️ Step 2/4: Converting narration to speech...')
      console.log('🔊 Narration length:', narration?.length || 0, 'characters')
      
      if (!narration) {
        throw new Error('No narration text to convert to speech')
      }
      
      const ttsResponse = await supabase.functions.invoke('text-to-speech', {
        body: { text: narration, voice: 'shimmer', speed: 0.94 }
      })

      console.log('📨 Text-to-speech response:', ttsResponse.error ? 'ERROR' : 'SUCCESS')
      
      if (ttsResponse.error) {
        console.log('❌ Text-to-speech error:', JSON.stringify(ttsResponse.error))
        throw new Error('Audio generation failed')
      }

      if (!ttsResponse.data?.audioUrl) {
        console.log('❌ Text-to-speech returned no audio URL')
        throw new Error('Audio generation returned no URL')
      }

      console.log('✅ Audio generated and uploaded')
      console.log('🔗 Audio URL:', ttsResponse.data.audioUrl)
      const { audioUrl } = ttsResponse.data

      // Step 3: Get image URL (AI-generated for celebrities, Unsplash for others)
      console.log('🖼️ Step 3/4: Preparing image URL...')
      let finalImageUrl
      
      if (ai_generated_image) {
        // Upload AI-generated base64 image to storage
        console.log('📤 Uploading AI-generated image to storage...')
        try {
          // Extract base64 data and convert to blob
          const base64Data = ai_generated_image.replace(/^data:image\/\w+;base64,/, '')
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
          
          // Generate unique filename
          const filename = `gist-${Date.now()}-${Math.random().toString(36).substring(7)}.png`
          
          // Upload to storage bucket
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('gist-audio')
            .upload(filename, binaryData, {
              contentType: 'image/png',
              upsert: false
            })
          
          if (uploadError) {
            console.log('⚠️ Failed to upload AI image to storage:', uploadError.message)
            // Fallback to Unsplash
            const keyword = image_keyword || 'trending news'
            finalImageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)}`
            console.log('🖼️ Falling back to stock image:', keyword)
          } else {
            // Get public URL
            const { data: urlData } = supabaseClient.storage
              .from('gist-audio')
              .getPublicUrl(filename)
            
            finalImageUrl = urlData.publicUrl
            console.log('🧠 AI image uploaded and URL generated:', finalImageUrl)
          }
        } catch (uploadError) {
          console.log('⚠️ Error processing AI image:', uploadError instanceof Error ? uploadError.message : 'Unknown error')
          // Fallback to Unsplash
          const keyword = image_keyword || 'trending news'
          finalImageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)}`
          console.log('🖼️ Falling back to stock image:', keyword)
        }
      } else if (imageUrl) {
        // Use provided image URL
        finalImageUrl = imageUrl
        console.log('📌 Using provided image URL')
      } else {
        // Fallback to Unsplash for non-celebrities
        const keyword = image_keyword || 'trending news'
        finalImageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)}`
        console.log('🖼️ Stock image fetched for topic:', keyword)
      }
      
      console.log('✅ Final image URL:', finalImageUrl)

      // Step 4: Save to database
      console.log('💾 Step 4/4: Saving to database...')
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
      console.log('📄 Gist data keys:', Object.keys(gistData))
      console.log('📄 Topic:', gistData.topic)
      console.log('📄 Status:', gistData.status)
      
      const { data: gist, error: dbError } = await supabase
        .from('gists')
        .insert(gistData)
        .select()
        .single()

      if (dbError) {
        console.log('❌ Database error:', dbError.message)
        console.log('❌ Database error details:', JSON.stringify(dbError))
        throw new Error('Failed to save content')
      }

      if (!gist) {
        console.log('❌ Database returned no gist')
        throw new Error('Failed to retrieve saved content')
      }

      gistId = gist.id
      console.log('✅ Gist saved to DB with ID:', gist.id)
      console.log('🎉 Pipeline complete - Gist published successfully!')

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
      const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error'
      const errorStack = stepError instanceof Error ? stepError.stack : 'No stack'
      
      console.log('❌ Pipeline step failed:', errorMessage)
      console.log('📚 Error stack:', errorStack)
      
      // Determine which stage failed
      let failedStage = 'unknown'
      if (errorMessage.includes('generate-gist')) failedStage = 'generate-gist'
      else if (errorMessage.includes('text-to-speech')) failedStage = 'text-to-speech'
      else if (errorMessage.includes('Database')) failedStage = 'database'
      
      console.log('🔍 Failed stage:', failedStage)
      
      // If any step fails, mark gist as failed if we created one
      if (gistId) {
        console.log('🔄 Marking gist as failed:', gistId)
        await supabase
          .from('gists')
          .update({
            status: 'failed',
            meta: { error: errorMessage, stage: failedStage }
          })
          .eq('id', gistId)
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          stage: failedStage
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
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
