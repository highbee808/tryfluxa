import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema - now flexible to accept any category string
const publishSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long (max 500 characters)'),
  imageUrl: z.string().url('Invalid URL format').optional(),
  topicCategory: z.string().trim().optional(), // Accept any string category
  sourceUrl: z.string().url('Invalid source URL format').optional(), // URL of the original news article
  newsPublishedAt: z.string().optional() // Timestamp when the news was published
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
    
    // Allow both JWT auth and service role key for automated gist generation
    console.log('🔐 Checking authentication...')
    const authHeader = req.headers.get('Authorization')
    
    // Check if using service role key (for auto-generation)
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const isServiceRole = authHeader?.includes(serviceKey || 'never-match')
    
    if (isServiceRole) {
      console.log('✅ Service role authentication detected (auto-generation)')
    } else {
      // Validate JWT for user-initiated requests
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader! } } }
      )

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        console.error('❌ Authentication failed:', authError?.message)
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('✅ User authenticated:', user.id)
    }

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
    
    const { topic, imageUrl, topicCategory, sourceUrl, newsPublishedAt } = validated

    console.log('✅ Input validated')
    console.log('📝 Topic:', topic)
    console.log('🖼️ Image URL:', imageUrl || 'auto-generate')
    console.log('🏷️ Category:', topicCategory || 'Trending')
    console.log('🔗 Source URL:', sourceUrl || 'N/A')
    console.log('📅 News Published:', newsPublishedAt || 'N/A')

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    const missingVars = []
    if (!supabaseUrl) missingVars.push('SUPABASE_URL')
    if (!openaiApiKey) missingVars.push('OPENAI_API_KEY')
    
    if (missingVars.length > 0) {
      console.error('[CONFIG] Missing required environment variables')
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use service role key for database operations
    const supabase = createClient(supabaseUrl ?? '', serviceKey ?? '')

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
        console.error('[PIPELINE] Content generation failed:', generateResponse.error)
        throw new Error('Content generation failed')
      }

      if (!generateResponse.data) {
        console.log('❌ Generate-gist returned no data')
        throw new Error('Content generation returned no data')
      }

      console.log('✅ Gist content generated successfully')
      console.log('📄 Data keys:', Object.keys(generateResponse.data))
      const {
        headline,
        context,
        narration,
        image_keyword,
        ai_generated_image,
        is_celebrity,
        source_url: generatedSourceUrl,
        source_title: generatedSourceTitle,
        source_excerpt: generatedSourceExcerpt,
        source_name: generatedSourceName,
        source_published_at: generatedSourcePublishedAt,
        source_image_url: generatedSourceImageUrl,
        used_api_article,
      } = generateResponse.data
      console.log('📋 Headline:', headline?.slice(0, 50))
      console.log('📋 Context:', context?.slice(0, 50))
      console.log('📋 Narration length:', narration?.length, 'chars')
      console.log('📋 Image keyword:', image_keyword)
      console.log('👤 Is celebrity:', is_celebrity)
      console.log('📰 Used API article:', used_api_article ? 'Yes' : 'No')
      console.log('🖼️ Fluxa created custom image:', ai_generated_image ? 'Yes' : 'No')

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
      console.log('📨 TTS response data:', ttsResponse.data ? JSON.stringify(ttsResponse.data) : 'No data')
      
      if (ttsResponse.error) {
        console.error('[PIPELINE] Audio generation failed:', ttsResponse.error)
        throw new Error('Audio generation failed')
      }

      if (!ttsResponse.data) {
        console.log('❌ Text-to-speech returned no data')
        throw new Error('Audio generation returned no data')
      }

      if (!ttsResponse.data.audioUrl) {
        console.log('❌ Text-to-speech data:', JSON.stringify(ttsResponse.data))
        throw new Error('Audio generation returned no URL')
      }

      console.log('✅ Audio generated and uploaded')
      console.log('🔗 Audio URL:', ttsResponse.data.audioUrl)
      const { audioUrl } = ttsResponse.data

      const metaPayload: Record<string, unknown> = {}
      if (generatedSourceTitle) metaPayload.source_title = generatedSourceTitle
      if (generatedSourceExcerpt) metaPayload.source_excerpt = generatedSourceExcerpt
      if (generatedSourceName) metaPayload.source_name = generatedSourceName
      if (generatedSourceImageUrl) metaPayload.source_image_url = generatedSourceImageUrl
      if (used_api_article) metaPayload.used_api_article = true

      // Step 3: Get image URL (AI-generated with local placeholder fallback)
      console.log('🖼️ Step 3/4: Preparing image URL...')
      let finalImageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800' // Default placeholder

      if (ai_generated_image) {
        // Download and re-upload Fluxa-generated image to our storage
        console.log('📤 Downloading and uploading AI-generated image to storage...')
        try {
          // Download the image from OpenAI URL
          const imageResponse = await fetch(ai_generated_image)
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image: ${imageResponse.status}`)
          }
          
          const imageBlob = await imageResponse.arrayBuffer()
          const imageBuffer = new Uint8Array(imageBlob)
          
          // Generate unique filename
          const filename = `gist-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
          
          // Upload to storage bucket
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('gist-audio')
            .upload(filename, imageBuffer, {
              contentType: 'image/png',
              upsert: false
            })
          
          if (uploadError) {
            console.log('⚠️ Failed to upload AI image to storage:', uploadError.message)
            // Keep using placeholder
            finalImageUrl = ai_generated_image
            console.log('🖼️ Using OpenAI URL directly:', ai_generated_image)
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('gist-audio')
              .getPublicUrl(filename)
            
            finalImageUrl = urlData.publicUrl
            console.log('🧠 Fluxa custom image uploaded and URL generated:', finalImageUrl)
          }
        } catch (uploadError) {
          console.log('⚠️ Error processing custom image:', uploadError instanceof Error ? uploadError.message : 'Unknown error')
          // Use the OpenAI URL directly as fallback
          finalImageUrl = ai_generated_image
          console.log('🖼️ Using OpenAI URL as fallback:', ai_generated_image)
        }
      } else if (imageUrl) {
        // Use provided image URL
        finalImageUrl = imageUrl
        console.log('📌 Using provided image URL')
      } else if (generatedSourceImageUrl) {
        finalImageUrl = generatedSourceImageUrl
        console.log('📌 Using source article image URL')
      } else {
        // Use local placeholder - no Unsplash fallback
        finalImageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'
        console.log('📌 No AI image available, using placeholder')
      }
      
      console.log('✅ Final image URL:', finalImageUrl)

      // Step 4: Save to database
      console.log('💾 Step 4/4: Saving to database...')
      const gistData: Record<string, any> = {
        headline,
        context,
        script: narration,
        narration,
        audio_url: audioUrl,
        topic,
        topic_category: topicCategory || 'Trending',
        image_url: finalImageUrl,
        source_url: sourceUrl || generatedSourceUrl || null,
        news_published_at: newsPublishedAt || generatedSourcePublishedAt || null,
        status: 'published',
        published_at: new Date().toISOString(),
      }

      if (Object.keys(metaPayload).length > 0) {
        gistData.meta = metaPayload
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
      console.error('[PIPELINE] Step failed:', stepError)
      
      // Determine which stage failed
      const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error'
      let failedStage = 'unknown'
      if (errorMessage.includes('generate-gist') || errorMessage.includes('Content generation')) failedStage = 'generate-gist'
      else if (errorMessage.includes('text-to-speech') || errorMessage.includes('Audio generation')) failedStage = 'text-to-speech'
      else if (errorMessage.includes('Database') || errorMessage.includes('save')) failedStage = 'database'
      
      // If any step fails, mark gist as failed if we created one
      if (gistId) {
        await supabase
          .from('gists')
          .update({
            status: 'failed',
            meta: { stage: failedStage }
          })
          .eq('id', gistId)
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process request',
          stage: failedStage
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }
  } catch (error) {
    console.error('[ERROR] Fatal error in publish-gist:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred processing your request'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
