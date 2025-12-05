import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders, createResponse, createErrorResponse, parseBody } from '../_shared/http.ts'
import { ENV } from '../_shared/env.ts'

const publishSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long'),
  imageUrl: z.string().url('Invalid URL format').optional(),
  topicCategory: z.string().trim().optional(),
  sourceUrl: z.string().url('Invalid source URL format').optional(),
  newsPublishedAt: z.string().optional()
})

serve(async (req) => {
  console.log('🚀 publish-gist-v2 started - method:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders })
  }

  try {
    const body = await parseBody(req)
    const validated = publishSchema.parse(body)
    const { topic, imageUrl, topicCategory, sourceUrl, newsPublishedAt } = validated

    console.log('📦 Request:', { topic, topicCategory, sourceUrl })

    // Auth check: Accept valid JWT tokens, service role key, or cron secret
    const authHeader = req.headers.get('authorization') ?? ''
    const cronHeader = req.headers.get('x-cron-secret') ?? ''
    const apiKeyHeader = req.headers.get('apikey') ?? ''
    const hasJwt = authHeader.toLowerCase().startsWith('bearer ')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const isCron = cronSecret && cronHeader === cronSecret
    const serviceRoleKey = ENV.VITE_SUPABASE_SERVICE_ROLE_KEY
    
    // Extract token from Bearer header
    const bearerToken = hasJwt ? authHeader.substring(7).trim() : ''
    
    // Check if it's a service role key (internal call from auto-generate-gists-v2)
    // Service role keys are JWT tokens, so we compare the full token
    const isServiceRole = (hasJwt && bearerToken === serviceRoleKey) || 
                          apiKeyHeader === serviceRoleKey
    
    if (!hasJwt && !isCron && !isServiceRole) {
      return createErrorResponse('Authentication required', 401)
    }

    // If JWT is present and it's not a service role key, validate as user
    if (hasJwt && !isServiceRole) {
      const anonKey = ENV.VITE_SUPABASE_ANON_KEY
      const supabaseClient = createClient(
        ENV.VITE_SUPABASE_URL ?? '',
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        return createErrorResponse('Authentication required', 401)
      }
      console.log('✅ Authenticated user:', user.id)
    } else if (isCron) {
      console.log('✅ Authenticated via cron secret')
    } else if (isServiceRole) {
      console.log('✅ Authenticated via service role key (internal call)')
    }
    
    const supabaseUrl = ENV.VITE_SUPABASE_URL
    const dbKey = ENV.VITE_SUPABASE_SERVICE_ROLE_KEY // Always use service key for DB operations and internal calls
    
    if (!supabaseUrl || !dbKey) {
      return createErrorResponse('Missing SUPABASE_URL or authentication key', 500)
    }

    const supabase = createClient(supabaseUrl, dbKey)

    // Step 1: Generate gist content (call generate-gist-v2)
    console.log('📝 Step 1/3: Generating gist content...')
    const generateUrl = `${supabaseUrl}/functions/v1/generate-gist-v2`
    
    let generateResponse
    try {
      const httpResponse = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${dbKey}`,
          'apikey': dbKey
        },
        body: JSON.stringify({ topic })
      })
      
      const responseData = await httpResponse.json().catch(() => ({}))
      
      if (!httpResponse.ok) {
        generateResponse = { error: { message: responseData.error || `HTTP ${httpResponse.status}` }, data: null }
      } else {
        generateResponse = { error: null, data: responseData }
      }
    } catch (fetchError) {
      console.error('[PIPELINE] Fetch error calling generate-gist-v2:', fetchError)
      generateResponse = { error: { message: fetchError instanceof Error ? fetchError.message : 'Network error' }, data: null }
    }

    if (generateResponse.error) {
      throw new Error(`Content generation failed: ${generateResponse.error.message}`)
    }

    if (!generateResponse.data) {
      throw new Error('Content generation returned no data')
    }

    const {
      headline,
      summary,
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

    console.log('✅ Gist content generated')

    // Step 2: Prepare image URL
    // Strategy: Source image → Provided imageUrl → AI-generated image → Placeholder
    console.log('🖼️ Step 2/3: Preparing image URL...')
    let finalImageUrl: string | null = null

    // Helper function to validate image URL
    const isValidImageUrl = (url: string | null | undefined): boolean => {
      if (!url || url.trim() === '' || url === 'null') return false
      try {
        const parsedUrl = new URL(url)
        // Check if it's a valid HTTP/HTTPS URL
        return ['http:', 'https:'].includes(parsedUrl.protocol)
      } catch {
        return false
      }
    }

    // Priority 1: Use source image from API article if available and valid
    if (isValidImageUrl(generatedSourceImageUrl)) {
      finalImageUrl = generatedSourceImageUrl!
      console.log('🖼️ Using source image from API article')
    }
    // Priority 2: Use provided imageUrl if source image not available
    else if (isValidImageUrl(imageUrl)) {
      finalImageUrl = imageUrl!
      console.log('🖼️ Using provided imageUrl')
    }
    // Priority 3: Use AI-generated image ONLY if no source/provided images exist
    else if (isValidImageUrl(ai_generated_image)) {
      // Only use AI image if we truly have no other option
      console.log('⚠️ No source images available, using AI-generated image as last resort')
      try {
        const imageResponse = await fetch(ai_generated_image!)
        if (!imageResponse.ok) throw new Error(`Failed to download AI image: ${imageResponse.status}`)
        
        const imageBlob = await imageResponse.arrayBuffer()
        const imageBuffer = new Uint8Array(imageBlob)
        const filename = `gist-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
        
        const { error: uploadError } = await supabase.storage
          .from('gist-audio')
          .upload(filename, imageBuffer, { contentType: 'image/png', upsert: false })
        
        if (uploadError) {
          finalImageUrl = ai_generated_image!
          console.log('🖼️ Using AI-generated image (direct URL)')
        } else {
          const { data: urlData } = supabase.storage
            .from('gist-audio')
            .getPublicUrl(filename)
          finalImageUrl = urlData.publicUrl
          console.log('🖼️ Using AI-generated image (uploaded to storage)')
        }
      } catch (err) {
        console.log('⚠️ Error processing AI image, using fallback')
        finalImageUrl = ai_generated_image!
      }
    }
    // Priority 4: Fallback placeholder if all else fails
    else {
      finalImageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'
      console.log('🖼️ Using fallback placeholder image (no valid images found)')
    }

    // Step 3: Save to database
    console.log('💾 Step 3/3: Saving to database...')
    
    const metaPayload: Record<string, unknown> = {}
    if (summary) metaPayload.summary = summary
    if (generatedSourceTitle) metaPayload.source_title = generatedSourceTitle
    if (generatedSourceExcerpt) metaPayload.source_excerpt = generatedSourceExcerpt
    if (generatedSourceName) metaPayload.source_name = generatedSourceName
    if (generatedSourceImageUrl) metaPayload.source_image_url = generatedSourceImageUrl
    if (used_api_article !== undefined) metaPayload.used_api_article = used_api_article
    if (is_celebrity !== undefined) metaPayload.is_celebrity = is_celebrity
    if (ai_generated_image) metaPayload.ai_generated_image = ai_generated_image
    
    // Strictly match the schema
    const gistData = {
      topic,
      topic_category: topicCategory || 'Trending',
      headline,
      context,
      narration,
      script: narration,
      image_url: finalImageUrl,
      source_url: sourceUrl || generatedSourceUrl || null,
      news_published_at: newsPublishedAt || generatedSourcePublishedAt || null,
      audio_url: '', // Default empty string
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      meta: metaPayload,
    }

    const { data: gist, error: dbError } = await supabase
      .from('gists')
      .insert(gistData)
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error('Failed to save content: ' + dbError.message + ' (' + dbError.code + ')')
    }

    if (!gist) {
      throw new Error('Failed to retrieve saved content')
    }

    console.log('✅ Gist saved to DB with ID:', gist.id)

    return createResponse({
      success: true,
      gist
    })

  } catch (error) {
    console.error('[ERROR] publish-gist-v2 failed:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500,
      error instanceof Error ? { name: error.name, stack: error.stack } : undefined
    )
  }
})
