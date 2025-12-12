import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { corsHeaders, parseBody } from '../_shared/http.ts'
import { env, ensureSupabaseEnv, ENV } from '../_shared/env.ts'

// Safe status code validation - prevents RangeError from invalid status codes
function safeStatus(status?: number | null): number {
  if (!status || status === 0) return 500
  if (status < 200 || status > 599) return 500
  return status
}

// Standardized JSON response with safe status and CORS headers
function jsonResponse(payload: unknown, status: number = 200): Response {
  return new Response(
    JSON.stringify(payload),
    {
      status: safeStatus(status),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

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
  const requestId = crypto.randomUUID()
  const functionName = 'publish-gist-v2'
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response("ok", { headers: corsHeaders })
  }

  console.log(`[${functionName}] START`, { method: req.method, requestId })

  // Admin secret validation (for admin dashboard calls)
  try {
    const adminSecret = req.headers.get("x-admin-secret");
    if (adminSecret) {
      // Only validate if header is provided (allows backward compatibility)
      if (adminSecret !== ENV.ADMIN_SECRET) {
        console.error(`[${functionName}] ADMIN_AUTH_ERROR Invalid admin secret`, { requestId });
        return jsonResponse({ success: false, error: 'Unauthorized - Invalid admin secret' }, 401);
      }
      console.log(`[${functionName}] ADMIN_AUTH Valid admin secret`, { requestId });
    }
  } catch (err) {
    // ADMIN_SECRET might not be set, allow request to continue (for backward compatibility)
    console.warn(`[${functionName}] AUTH_WARN ADMIN_SECRET not configured, skipping admin validation`, { requestId });
  }

  try {
    // Parse and validate request body
    const body = await parseBody(req)
    
    // Handle Zod validation errors with better error messages
    let validated
    try {
      validated = publishSchema.parse(body)
      console.log(`[${functionName}] VALIDATION_SUCCESS`, { requestId, topic: validated.topic })
    } catch (zodError: any) {
      console.error(`[${functionName}] VALIDATION_ERROR`, { requestId, error: zodError });
      return jsonResponse(
        {
          success: false,
          error: `Invalid request: ${zodError.errors?.[0]?.message || zodError.message || 'Validation failed'}`,
          validationErrors: zodError.errors
        },
        400
      )
    }
    
    const { topic, imageUrl, topicCategory, sourceUrl, newsPublishedAt, rawTrendId } = validated

    console.log(`[${functionName}] PIPELINE_START`, { requestId, topic, topicCategory, rawTrendId, sourceUrl })

    // CRITICAL: Edge Functions must use SERVICE_ROLE_KEY only - no user auth
    // This prevents auth token refresh attempts that fail in Edge runtime
    ensureSupabaseEnv();
    const supabaseUrl = ENV.SUPABASE_URL
    const dbKey = ENV.SUPABASE_SERVICE_ROLE_KEY

    console.log(`[${functionName}] INIT_SERVICE_ROLE_CLIENT`, { requestId })

    // Initialize Supabase client with SERVICE_ROLE_KEY and auth features DISABLED
    // This prevents any auth token refresh attempts
    const supabase = createClient(
      supabaseUrl,
      dbKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
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
    // NOTE: raw_trends only contains: id, image_url
    let rawTrendImageUrl: string | null = null
    let rawTrendIdValid: string | null = null
    
    if (rawTrendId) {
      console.log(`🔗 Fetching raw_trend row for ID: ${rawTrendId}`)
      const { data: rawTrend, error: rawTrendError } = await supabase
        .from('raw_trends')
        .select('id, image_url')
        .eq('id', rawTrendId)
        .single()
      
      if (rawTrendError || !rawTrend) {
        console.error(`[${functionName}] RAW_TREND_FETCH_ERROR`, { requestId, rawTrendId, error: rawTrendError });
        return jsonResponse(
          { success: false, error: `Invalid rawTrendId: ${rawTrendId}. Raw trend not found.` },
          400
        )
      }
      
      // STRICT VALIDATION: Ensure we have valid data
      if (!rawTrend.id) {
        console.error(`[${functionName}] RAW_TREND_INVALID_ID`, { requestId, rawTrendId });
        return jsonResponse(
          { success: false, error: `Invalid rawTrendId: ${rawTrendId}. Raw trend has no ID.` },
          400
        )
      }
      
      rawTrendIdValid = rawTrend.id
      rawTrendImageUrl = rawTrend.image_url || null
      
      console.log(`[${functionName}] RAW_TREND_FETCHED`, {
        requestId,
        raw_trend_id: rawTrend.id,
        raw_image: rawTrend.image_url,
        topic: topic,
      })
    }

    // Step 1: Generate gist content (call generate-gist-v2)
    console.log(`[${functionName}] STEP_1_GENERATE_GIST`, { requestId, topic })

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
        console.error(`[${functionName}] GENERATE_GIST_ERROR`, { requestId, error: error.message });
        generateResponse = { data: null, error: { message: error.message ?? 'Unknown error from generate-gist-v2' } }
      } else if (!data) {
        console.error(`[${functionName}] GENERATE_GIST_NO_DATA`, { requestId });
        generateResponse = { data: null, error: { message: 'No data returned from generate-gist-v2' } }
      } else {
        generateResponse = { data, error: null }
        console.log(`[${functionName}] GENERATE_GIST_SUCCESS`, { requestId, headline: data.headline })
      }
    } catch (invokeError) {
      console.error(`[${functionName}] GENERATE_GIST_EXCEPTION`, { 
        requestId, 
        error: invokeError instanceof Error ? invokeError.message : 'Unknown error',
        stack: invokeError instanceof Error ? invokeError.stack : undefined
      });
      generateResponse = {
        data: null,
        error: {
          message:
            invokeError instanceof Error ? invokeError.message : 'Unknown error invoking generate-gist-v2',
        },
      }
    }

    if (generateResponse?.error) {
      console.error(`[${functionName}] GENERATE_GIST_FAILED`, { requestId, error: generateResponse.error });
      return jsonResponse(
        {
          success: false,
          error: 'Content generation failed',
          stage: 'generate-gist-v2',
          details: generateResponse.error,
        },
        500
      )
    }

    if (!generateResponse?.data) {
      console.error(`[${functionName}] GENERATE_GIST_NO_DATA_FINAL`, { requestId });
      return jsonResponse(
        { success: false, error: 'Content generation returned no data' },
        500
      )
    }

    const generatedGistData = generateResponse.data
    console.log(`[${functionName}] GENERATE_GIST_COMPLETE`, {
      requestId,
      headline: generatedGistData.headline,
      hasImage: !!generatedGistData.source_image_url || !!generatedGistData.ai_generated_image,
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
    } = generatedGistData

    console.log(`[${functionName}] STEP_2_PREPARE_IMAGE`, { requestId })

    // Step 2: Prepare image URL
    // CRITICAL: Priority order ensures we use the correct image from raw_trends
    // Strategy: raw_trend.image_url → Source image from API → Provided imageUrl → AI-generated → null (frontend fallback)
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
    console.log(`[${functionName}] STEP_3_SAVE_DB`, { requestId })
    
    const metaPayload: Record<string, unknown> = {}
    if (summary) metaPayload.summary = summary
    if (generatedSourceTitle) metaPayload.source_title = generatedSourceTitle
    if (generatedSourceExcerpt) metaPayload.source_excerpt = generatedSourceExcerpt
    if (generatedSourceName) metaPayload.source_name = generatedSourceName
    if (generatedSourceImageUrl) metaPayload.source_image_url = generatedSourceImageUrl
    if (used_api_article !== undefined) metaPayload.used_api_article = used_api_article
    if (is_celebrity !== undefined) metaPayload.is_celebrity = is_celebrity
    if (ai_generated_image) metaPayload.ai_generated_image = ai_generated_image
    
    // Use sourceUrl from request or generated content
    // NOTE: raw_trends does not contain url, so we use provided sourceUrl or generatedSourceUrl
    const finalSourceUrl = sourceUrl || generatedSourceUrl || null
    
    // STRICT VALIDATION: Ensure raw_trend_id is set when rawTrendId provided
    if (rawTrendId && !rawTrendIdValid) {
      console.error(`[${functionName}] RAW_TREND_ID_VALIDATION_FAILED`, { requestId, rawTrendId });
      return jsonResponse(
        { success: false, error: `Invalid rawTrendId: ${rawTrendId}. Cannot proceed without valid raw_trend row.` },
        400
      )
    }
    
    // Strictly match the schema
    // NOTE: topic comes from pipeline input, not from raw_trends (which only has id, image_url)
    const gistData = {
      topic: topic, // Topic comes from request, not from raw_trends
      topic_category: topicCategory || 'Trending',
      headline,
      context,
      narration,
      script: narration,
      image_url: finalImageUrl, // CRITICAL: This comes from raw_trends.image_url when rawTrendId is provided
      source_url: finalSourceUrl,
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
        console.error(`[${functionName}] CRITICAL_VALIDATION_FAILED`, { requestId, rawTrendId });
        return jsonResponse(
          { success: false, error: 'CRITICAL: raw_trend_id must be set when rawTrendId provided' },
          500
        )
      }
      if (gistData.image_url !== rawTrendImageUrl) {
        console.warn(`[${functionName}] IMAGE_URL_MISMATCH`, { 
          requestId, 
          expected: rawTrendImageUrl, 
          got: gistData.image_url 
        });
        // Force correct image_url
        gistData.image_url = rawTrendImageUrl
      }
    }
    
    // Debug log before insert
    console.log(`[${functionName}] DB_INSERT_PREPARE`, {
      requestId,
      raw_trend_id: gistData.raw_trend_id || 'none',
      headline: headline,
      image_url: gistData.image_url,
      source_url: gistData.source_url,
      topic: gistData.topic,
      raw_trend_image: rawTrendImageUrl || 'none',
    })

    const { data: gist, error: dbError, status: dbStatus } = await supabase
      .from('gists')
      .insert(gistData)
      .select()
      .single()

    if (dbError) {
      console.error(`[${functionName}] DB_INSERT_ERROR`, { 
        requestId, 
        error: dbError.message, 
        code: dbError.code,
        details: dbError 
      });
      return jsonResponse(
        { 
          success: false, 
          error: 'Failed to save content: ' + dbError.message + ' (' + dbError.code + ')',
          details: dbError
        },
        safeStatus(dbStatus || 500)
      )
    }

    if (!gist) {
      console.error(`[${functionName}] DB_INSERT_NO_DATA`, { requestId });
      return jsonResponse(
        { success: false, error: 'Failed to retrieve saved content' },
        500
      )
    }

    console.log(`[${functionName}] DB_INSERT_SUCCESS`, { requestId, gistId: gist.id })
    
    // Debug log for pipeline success
    console.log(`[${functionName}] PIPELINE_SUCCESS`, {
      requestId,
      gistId: gist.id,
      rawTrendId: gistData.raw_trend_id || 'none',
      headline: gist.headline,
    })

    return jsonResponse({
      success: true,
      message: "Gist generated successfully",
      gistData: gist
    }, 200)

  } catch (error) {
    // Improved error logging with prefix for easy filtering
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error(`[${functionName}] PIPELINE_FAILURE`, { 
      requestId, 
      error: errorMessage,
      stack: errorStack,
      errorDetails: error
    })
    
    // ALWAYS return error with CORS headers - never throw
    return jsonResponse(
      { 
        success: false, 
        error: errorMessage 
      },
      500
    )
  }
})
