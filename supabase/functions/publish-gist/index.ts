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
    
    // Optional authentication for internal calls
    console.log('🔐 Checking authentication (optional for internal calls)...')
    const authHeader = req.headers.get('Authorization')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
    )

    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        console.log('✅ User authenticated:', user.id, 'Email:', user.email)
      } else {
        console.log('ℹ️ No user found, proceeding as internal call')
      }
    } else {
      console.log('ℹ️ No auth header, proceeding as internal/automated call')
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    const missingVars = []
    if (!supabaseUrl) missingVars.push('SUPABASE_URL')
    if (!serviceRoleKey) missingVars.push('SERVICE_ROLE_KEY')
    if (!lovableApiKey) missingVars.push('LOVABLE_API_KEY')
    if (!openaiApiKey) missingVars.push('OPENAI_API_KEY')
    
    if (missingVars.length > 0) {
      console.error('[CONFIG] Missing required environment variables')
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        console.error('[PIPELINE] Content generation failed:', generateResponse.error)
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

      // Step 3: Get image URL (AI-generated for celebrities, Unsplash for others)
      console.log('🖼️ Step 3/4: Preparing image URL...')
      let finalImageUrl
      
      if (ai_generated_image) {
        // Upload Fluxa-generated base64 image to storage
        console.log('📤 Uploading Fluxa custom image to storage...')
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
            console.log('🧠 Fluxa custom image uploaded and URL generated:', finalImageUrl)
          }
        } catch (uploadError) {
          console.log('⚠️ Error processing custom image:', uploadError instanceof Error ? uploadError.message : 'Unknown error')
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
        source_url: sourceUrl || null,
        news_published_at: newsPublishedAt || null,
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
