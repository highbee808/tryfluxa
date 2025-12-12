import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders, createResponse, createErrorResponse, parseBody } from '../_shared/http.ts'
import { env, ensureSupabaseEnv, ENV } from '../_shared/env.ts'

/**
 * DATA FLOW DOCUMENTATION:
 * 
 * This function receives:
 * - topic: The headline/topic to generate content for
 * - rawTrendId: (OPTIONAL) UUID of raw_trends row - CRITICAL for 1:1 mapping
 * 
 * When rawTrendId is provided:
 * 1. Fetches raw_trends row WHERE id = rawTrendId
 * 2. Uses raw_trend.image_url as Priority 1 (ensures image matches headline)
 * 3. Uses raw_trend.url for source_url (ensures URL matches)
 * 4. Stores raw_trend_id in gists.raw_trend_id (enforces 1:1 mapping)
 * 
 * KEY FIELDS:
 * - gists.raw_trend_id: Links to raw_trends.id (foreign key)
 * - gists.image_url: MUST come from raw_trends.image_url when rawTrendId provided
 * - gists.source_url: MUST come from raw_trends.url when rawTrendId provided
 * - gists.headline: Generated from topic, but topic comes from raw_trends.title
 * 
 * This ensures headline, image, and source URL all describe the same story.
 */

const publishSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long'),
  imageUrl: z.string().url('Invalid URL format').optional(),
  topicCategory: z.string().trim().optional(),
  sourceUrl: z.string().url('Invalid source URL format').optional(),
  newsPublishedAt: z.string().optional(),
  rawTrendId: z.string().uuid('Invalid raw_trend_id format').optional(), // Link to raw_trends row
})

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response("OK", { headers: corsHeaders })
  }

  console.log('🚀 publish-gist-v2 started - method:', req.method)

  // Admin secret validation (for admin dashboard calls)
  try {
    const adminSecret = req.headers.get("x-admin-secret");
    if (adminSecret && adminSecret !== ENV.ADMIN_SECRET) {
      console.error('[AUTH ERROR] Invalid admin secret');
      return createErrorResponse('Unauthorized - Invalid admin secret', 401);
    }
  } catch (err) {
    // ADMIN_SECRET might not be set, allow request to continue (for backward compatibility)
    console.warn('[AUTH WARN] ADMIN_SECRET not configured, skipping admin validation');
  }

  try {
    // Parse and validate request body
    const body = await parseBody(req)
    
    // Handle Zod validation errors with better error messages
    let validated
    try {
      validated = publishSchema.parse(body)
    } catch (zodError: any) {
      console.error('[PUBLISH GIST ERROR] Validation error:', zodError)
      return createErrorResponse(
        `Invalid request: ${zodError.errors?.[0]?.message || zodError.message || 'Validation failed'}`,
        400,
        { validationErrors: zodError.errors }
      )
    }
    
    const { topic, imageUrl, topicCategory, sourceUrl, newsPublishedAt, rawTrendId } = validated

    console.log('📦 Request:', { topic, topicCategory, sourceUrl, rawTrendId })

    // Auth check: Accept valid JWT tokens, service role key, cron secret, or allow unauthenticated (for admin testing)
    // Note: verify_jwt = false in config.toml allows requests without JWT validation
    const authHeader = req.headers.get('authorization') ?? ''
    const cronHeader = req.headers.get('x-cron-secret') ?? ''
    const apiKeyHeader = req.headers.get('apikey') ?? ''
    const hasJwt = authHeader.toLowerCase().startsWith('bearer ')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const isCron = cronSecret && cronHeader === cronSecret
    ensureSupabaseEnv();
    
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
    
    // Extract token from Bearer header
    const bearerToken = hasJwt ? authHeader.substring(7).trim() : ''
    
    // Check if it's a service role key (internal call from auto-generate-gists-v2)
    // Service role keys are JWT tokens, so we compare the full token
    const isServiceRole = (hasJwt && bearerToken === serviceRoleKey) || 
                          apiKeyHeader === serviceRoleKey
    
    // With verify_jwt = false, we allow requests without auth for admin testing
    // But we still validate JWT if provided
    let isAuthenticated = false
    
    if (hasJwt && !isServiceRole) {
      // Validate JWT if provided (for admin panel with user session)
      const anonKey = env.SUPABASE_ANON_KEY
      const supabaseClient = createClient(
        env.SUPABASE_URL,
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      )

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (!authError && user) {
        isAuthenticated = true
        console.log('✅ Authenticated user:', user.id)
      } else {
        // JWT provided but invalid - still allow (verify_jwt = false means Supabase allows it)
        // Log warning but don't block
        console.warn('⚠️ JWT provided but invalid, allowing request (verify_jwt = false)')
        isAuthenticated = true
      }
    } else if (isCron) {
      isAuthenticated = true
      console.log('✅ Authenticated via cron secret')
    } else if (isServiceRole) {
      isAuthenticated = true
      console.log('✅ Authenticated via service role key (internal call)')
    } else {
      // No auth provided - allow for admin testing (verify_jwt = false)
      console.log('⚠️ No authentication provided, allowing request (verify_jwt = false for admin testing)')
      isAuthenticated = true
    }
    
    // CRITICAL: Use ENV.SUPABASE_SERVICE_ROLE_KEY for all DB operations
    // This ensures proper authentication for admin dashboard calls
    const supabaseUrl = ENV.SUPABASE_URL
    const dbKey = ENV.SUPABASE_SERVICE_ROLE_KEY

    const supabase = createClient(
      supabaseUrl,
      dbKey,
      {
        global: { 
          headers: { 
            Authorization: `Bearer ${dbKey}` 
          } 
        }
      }
    )

    // CRITICAL: If rawTrendId is provided, fetch the raw_trend row to ensure we use the correct image
    // This must happen BEFORE generating content to ensure image matches headline
    // STRICT VALIDATION: If rawTrendId provided, it MUST be valid
    let rawTrendImageUrl: string | null = null
    let rawTrendUrl: string | null = null
    let rawTrendTitle: string | null = null
    let rawTrendIdValid: string | null = null
    
    if (rawTrendId) {
      console.log(`🔗 Fetching raw_trend row for ID: ${rawTrendId}`)
      const { data: rawTrend, error: rawTrendError } = await supabase
        .from('raw_trends')
        .select('id, title, url, image_url, category')
        .eq('id', rawTrendId)
        .single()
      
      if (rawTrendError || !rawTrend) {
        console.error('❌ Error fetching raw_trend:', rawTrendError)
        throw new Error(`Invalid rawTrendId: ${rawTrendId}. Raw trend not found.`)
      }
      
      // STRICT VALIDATION: Ensure we have valid data
      if (!rawTrend.id) {
        throw new Error(`Invalid rawTrendId: ${rawTrendId}. Raw trend has no ID.`)
      }
      
      rawTrendIdValid = rawTrend.id
      rawTrendImageUrl = rawTrend.image_url || null
      rawTrendUrl = rawTrend.url || null
      rawTrendTitle = rawTrend.title || null
      
      console.log('[GIST GEN]', {
        raw_trend_id: rawTrend.id,
        raw_title: rawTrend.title,
        raw_url: rawTrend.url,
        raw_image: rawTrend.image_url,
        topic: topic,
      })
      
      // Safety check: Ensure sourceUrl matches raw_trend.url if both exist
      if (rawTrendUrl && sourceUrl && rawTrendUrl !== sourceUrl) {
        console.warn(`⚠️ Source URL mismatch! raw_trend.url=${rawTrendUrl}, provided sourceUrl=${sourceUrl}. Using raw_trend.url.`)
      }
      
      // Safety check: Ensure topic matches raw_trend.title if both exist
      if (rawTrendTitle && topic && rawTrendTitle.toLowerCase().trim() !== topic.toLowerCase().trim()) {
        console.warn(`⚠️ Topic mismatch! raw_trend.title=${rawTrendTitle}, provided topic=${topic}. Using raw_trend.title.`)
        // Use raw_trend.title as the authoritative source
        // topic = rawTrendTitle
      }
    }

    // Step 1: Generate gist content (call generate-gist-v2)
    console.log('📝 Step 1/3: Generating gist content...')

    type GenerateGistResponse = {
      headline: string
      summary: string
      context: string
      narration: string
      image_keyword?: string | null
      ai_generated_image?: string | null
      is_celebrity?: boolean | null
      source_url?: string | null
      source_title?: string | null
      source_excerpt?: string | null
      source_name?: string | null
      source_published_at?: string | null
      source_image_url?: string | null
      used_api_article?: boolean | null
      // keep it loose so extra fields don't break anything
      [key: string]: any
    }

    let generateResponse:
      | { data: GenerateGistResponse | null; error: { message: string } | null }
      | null = null

    try {
      const { data, error } = await supabase.functions.invoke<GenerateGistResponse>(
        'generate-gist-v2',
        {
          body: { topic },
        },
      )

      if (error) {
        console.error('[PIPELINE] generate-gist-v2 returned error:', error)
        generateResponse = { data: null, error: { message: error.message ?? 'Unknown error from generate-gist-v2' } }
      } else if (!data) {
        console.error('[PIPELINE] generate-gist-v2 returned no data')
        generateResponse = { data: null, error: { message: 'No data returned from generate-gist-v2' } }
      } else {
        generateResponse = { data, error: null }
      }
    } catch (invokeError) {
      console.error('[PIPELINE] Exception calling generate-gist-v2 via supabase.functions.invoke:', invokeError)
      generateResponse = {
        data: null,
        error: {
          message:
            invokeError instanceof Error ? invokeError.message : 'Unknown error invoking generate-gist-v2',
        },
      }
    }

    if (generateResponse?.error) {
      console.error('[PIPELINE] Error in generate-gist-v2:', generateResponse.error)
      return createErrorResponse(
        'Content generation failed',
        {
          stage: 'generate-gist-v2',
          error: generateResponse.error,
        },
        500,
      )
    }

    if (!generateResponse?.data) {
      throw new Error('Content generation returned no data')
    }

    const gistData = generateResponse.data
    console.log('✅ generate-gist-v2 succeeded:', {
      headline: gistData.headline,
      hasImage: !!gistData.source_image_url || !!gistData.ai_generated_image,
    })

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
    } = gistData

    console.log('✅ Gist content generated')

    // Step 2: Prepare image URL
    // CRITICAL: Priority order ensures we use the correct image from raw_trends
    // Strategy: raw_trend.image_url → Source image from API → Provided imageUrl → AI-generated → null (frontend fallback)
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

    // Priority 1: CRITICAL - ALWAYS use image from raw_trends row if rawTrendId provided
    // This ensures the image matches the headline/content from the same raw_trend
    // DO NOT fall through to other sources if rawTrendId is provided
    if (rawTrendId && rawTrendIdValid) {
      if (isValidImageUrl(rawTrendImageUrl)) {
        finalImageUrl = rawTrendImageUrl!
        console.log('🖼️ Using image from raw_trends row (ensures 1:1 mapping)')
      } else {
        // If rawTrendId provided but image is invalid, set to null (frontend fallback)
        finalImageUrl = null
        console.log('🖼️ raw_trends.image_url is invalid/missing - setting to null (frontend will use /fallback/news.jpg)')
      }
    }
    // Priority 2: Use source image from API article if available and valid
    else if (isValidImageUrl(generatedSourceImageUrl)) {
      finalImageUrl = generatedSourceImageUrl!
      console.log('🖼️ Using source image from API article')
    }
    // Priority 3: Use provided imageUrl if source image not available
    else if (isValidImageUrl(imageUrl)) {
      finalImageUrl = imageUrl!
      console.log('🖼️ Using provided imageUrl')
    }
    // Priority 4: Use AI-generated image ONLY if no source/provided images exist
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
    // Priority 5: Set to null (frontend will use /fallback/news.jpg)
    // DO NOT use random Unsplash images - this causes mismatches
    else {
      finalImageUrl = null
      console.log('🖼️ No valid images found - setting to null (frontend will use /fallback/news.jpg)')
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
    
    // CRITICAL: Use sourceUrl from raw_trend if available to ensure consistency
    // When rawTrendId is provided, raw_trend.url is the authoritative source
    const finalSourceUrl = rawTrendIdValid && rawTrendUrl 
      ? rawTrendUrl 
      : (sourceUrl || generatedSourceUrl || null)
    
    // STRICT VALIDATION: Ensure raw_trend_id is set when rawTrendId provided
    if (rawTrendId && !rawTrendIdValid) {
      throw new Error(`Invalid rawTrendId: ${rawTrendId}. Cannot proceed without valid raw_trend row.`)
    }
    
    // Strictly match the schema
    const gistData = {
      topic: rawTrendTitle || topic, // Use raw_trend.title if available (authoritative)
      topic_category: topicCategory || 'Trending',
      headline,
      context,
      narration,
      script: narration,
      image_url: finalImageUrl, // CRITICAL: This comes from raw_trends.image_url when rawTrendId is provided
      source_url: finalSourceUrl, // CRITICAL: This comes from raw_trends.url when rawTrendId is provided
      news_published_at: newsPublishedAt || generatedSourcePublishedAt || null,
      raw_trend_id: rawTrendIdValid || null, // CRITICAL: Link to raw_trends row for 1:1 mapping
      audio_url: '', // Default empty string
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      meta: metaPayload,
    }
    
    // STRONG VALIDATION: Before writing to DB, verify critical fields
    if (rawTrendIdValid) {
      if (!gistData.raw_trend_id) {
        throw new Error('CRITICAL: raw_trend_id must be set when rawTrendId provided')
      }
      if (gistData.image_url !== rawTrendImageUrl) {
        console.warn(`⚠️ WARNING: image_url mismatch! Expected ${rawTrendImageUrl}, got ${gistData.image_url}`)
        // Force correct image_url
        gistData.image_url = rawTrendImageUrl
      }
      if (gistData.source_url !== rawTrendUrl) {
        console.warn(`⚠️ WARNING: source_url mismatch! Expected ${rawTrendUrl}, got ${gistData.source_url}`)
        // Force correct source_url
        gistData.source_url = rawTrendUrl
      }
    }
    
    // Debug log before insert
    console.log('[FEED MAP]', {
      raw_trend_id: gistData.raw_trend_id || 'none',
      headline: headline,
      image_url: gistData.image_url,
      source_url: gistData.source_url,
      topic: gistData.topic,
      raw_trend_title: rawTrendTitle || 'none',
      raw_trend_url: rawTrendUrl || 'none',
      raw_trend_image: rawTrendImageUrl || 'none',
    })

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
    
    // Debug log for pipeline success
    console.log('[PIPELINE SUCCESS]', {
      gistId: gist.id,
      rawTrendId: gistData.raw_trend_id || 'none',
      headline: gist.headline,
    })

    return createResponse({
      success: true,
      gist
    })

  } catch (error) {
    // Improved error logging with prefix for easy filtering
    console.error('[PIPELINE FAILURE]', error)
    console.error('[PUBLISH GIST ERROR]', error)
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    const errorDetails = error instanceof Error 
      ? { 
          name: error.name, 
          stack: error.stack,
          message: error.message,
        } 
      : {}
    
    // ALWAYS return error with CORS headers using createErrorResponse
    return createErrorResponse(
      errorMessage,
      500,
      errorDetails
    )
  }
})
