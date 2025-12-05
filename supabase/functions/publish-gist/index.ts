import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/http.ts";

// Input validation schema - flexible to accept any category string
const publishSchema = z.object({
  topic: z.string().trim().min(1, 'Topic is required').max(500, 'Topic too long (max 500 characters)'),
  imageUrl: z.string().url('Invalid URL format').optional(),
  topicCategory: z.string().trim().optional(), // Accept any string category
  sourceUrl: z.string().url('Invalid source URL format').optional(),
  newsPublishedAt: z.string().optional()
})

serve(async (req) => {
  console.log('🚀 publish-gist started - method:', req.method)
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}))
    console.log('📦 Request body:', JSON.stringify(body))
    
    const authHeader = req.headers.get('Authorization')
    
    // Check if request uses service role key (for internal/cron calls)
    const serviceKey = Deno.env.get('SB_SERVICE_ROLE_KEY')
    const isServiceRole = serviceKey && authHeader?.includes(serviceKey)
    
    // Check if request uses publishable/anon key (for frontend admin calls)
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const isPublishableKey = anonKey && authHeader?.includes(anonKey)
    
    // Allow either service role key OR publishable key for admin operations
    if (!isServiceRole && !isPublishableKey) {
      // If neither matches, try JWT validation for user-initiated requests
      if (!anonKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'SUPABASE_ANON_KEY missing' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        anonKey,
        { global: { headers: { Authorization: authHeader! } } }
      )

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Use service role key for database operations (if available, otherwise use anon key)
    const dbKey = serviceKey || anonKey

    // Validate input
    let validated
    try {
      validated = publishSchema.parse(body)
    } catch (validationError: any) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid input: ${validationError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { topic, imageUrl, topicCategory, sourceUrl, newsPublishedAt } = validated

    // Check env variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    const missingVars = []
    if (!supabaseUrl) missingVars.push('SUPABASE_URL')
    if (!openaiApiKey) missingVars.push('OPENAI_API_KEY')
    if (!anonKey) missingVars.push('SUPABASE_ANON_KEY')
    
    if (missingVars.length > 0) {
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}. Please set these secrets in Supabase Dashboard → Settings → Edge Functions → Secrets.`
      console.error('❌ Environment check failed:', errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg, missing: missingVars }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!dbKey) {
      const errorMsg = 'Either SB_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set.'
      console.error('❌ No database key available:', errorMsg)
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl ?? '', dbKey ?? '')

    // -------- Parse body --------
    console.log("📥 Parsing request body...");
    const body = await req.json().catch(() => ({}));
    console.log("📦 Request body:", JSON.stringify(body));

    // -------- Auth --------
    // We allow auto-generation / internal calls if:
    // - apikey header matches service role key
    // - OR Authorization Bearer matches service role key
    // Otherwise, require user JWT.
    const authHeader = req.headers.get("Authorization") || "";
    const apiKeyHeader = req.headers.get("apikey") || "";

    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    const isServiceRoleCall =
      apiKeyHeader === serviceKey || bearerToken === serviceKey;

    if (isServiceRoleCall) {
      console.log("✅ Service-role/internal call detected (auto-generation).");
    } else {
      console.log("🔐 User call detected, validating JWT...");

      if (!authHeader) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authentication required",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const supabaseUserClient = createClient(supabaseUrl!, anonKey!, {
        global: { headers: { Authorization: authHeader } },
      });

      const {
        data: { user },
        error: authError,
      } = await supabaseUserClient.auth.getUser();

      if (authError || !user) {
        console.error("❌ JWT auth failed:", authError?.message);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authentication required",
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("✅ User authenticated:", user.id);
    }

    // -------- Validate input --------
    console.log("📝 Validating input...");
    let validated;
    try {
      validated = publishSchema.parse(body);
    } catch (validationError: any) {
      console.error("❌ Validation failed:", validationError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid input: ${validationError.message}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { topic, imageUrl, topicCategory, sourceUrl, newsPublishedAt } =
      validated;

    console.log("✅ Input validated:", {
      topic,
      imageUrl: imageUrl || "auto-generate",
      topicCategory: topicCategory || "Trending",
      sourceUrl: sourceUrl || "N/A",
      newsPublishedAt: newsPublishedAt || "N/A",
    });

    let gistId: string | null = null;

    try {
      //
      // STEP 1 — CALL generate-gist
      //
      const generateUrl = `${supabaseUrl}/functions/v1/generate-gist`
      
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
          generateResponse = { error: { message: responseData.error || `HTTP ${httpResponse.status}`, name: 'FunctionsHttpError' }, data: null }
        } else {
          generateResponse = { error: null, data: responseData }
        }
      } catch (fetchError) {
        generateResponse = { error: { message: fetchError instanceof Error ? fetchError.message : 'Network error', name: 'FunctionsHttpError' }, data: null }
      }

      if (generateResponse.error) {
        throw new Error(`Content generation failed: ${generateResponse.error.message}`)
      }

      const {
        headline,
        context,
        narration,
        ai_generated_image,
        source_url: generatedSourceUrl,
        source_title: generatedSourceTitle,
        source_excerpt: generatedSourceExcerpt,
        source_name: generatedSourceName,
        source_published_at: generatedSourcePublishedAt,
        source_image_url: generatedSourceImageUrl,
        used_api_article,
      } = generateResponse.data

      //
      // STEP 2 — IMAGE PREP
      //
      let finalImageUrl = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'

      if (ai_generated_image) {
        try {
          const imageResponse = await fetch(ai_generated_image)
          if (!imageResponse.ok) throw new Error(`Failed to download AI image: ${imageResponse.status}`)
          
          const imageBlob = await imageResponse.arrayBuffer()
          const imageBuffer = new Uint8Array(imageBlob)
          
          const filename = `gist-images/${Date.now()}-${Math.random().toString(36).substring(7)}.png`
          
          const { error: uploadError } = await supabase.storage
            .from('gist-audio')
            .upload(filename, imageBuffer, { contentType: 'image/png', upsert: false })
          
          if (uploadError) {
            finalImageUrl = ai_generated_image
          } else {
            const { data: urlData } = supabase.storage
              .from('gist-audio')
              .getPublicUrl(filename)
            finalImageUrl = urlData.publicUrl
          }
        } catch (err) {
          finalImageUrl = ai_generated_image
        }
      } 
      else if (imageUrl) {
        finalImageUrl = imageUrl
      } 
      else if (generatedSourceImageUrl) {
        finalImageUrl = generatedSourceImageUrl
      }

      //
      // STEP 3 — SAVE TO DATABASE (AUDIO REMOVED ✔)
      //
      const metaPayload: Record<string, unknown> = {}
      if (generatedSourceTitle) metaPayload.source_title = generatedSourceTitle
      if (generatedSourceExcerpt) metaPayload.source_excerpt = generatedSourceExcerpt
      if (generatedSourceName) metaPayload.source_name = generatedSourceName
      if (generatedSourceImageUrl) metaPayload.source_image_url = generatedSourceImageUrl
      if (used_api_article !== undefined) metaPayload.used_api_article = used_api_article
      if (is_celebrity !== undefined) metaPayload.is_celebrity = is_celebrity
      if (ai_generated_image) metaPayload.ai_generated_image = ai_generated_image

      // **THIS BLOCK IS NOW FIXED — audio_url set to empty string (NOT NULL constraint)**
      const gistData: Record<string, any> = {
        topic,
        topic_category: topicCategory || 'Trending',
        headline,
        context,
        narration,
        script: narration,
        image_url: finalImageUrl,
        audio_url: '', // Empty string since audio is removed (NOT NULL constraint)
        source_url: sourceUrl || generatedSourceUrl || null,
        news_published_at:
          newsPublishedAt || generatedSourcePublishedAt || null,
        status: "published",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        meta: metaPayload,
      }

      const { data: gist, error: dbError } = await supabase
        .from('gists')
        .insert(gistData)
        .select()
        .single();

      if (dbError) {
        throw new Error('Failed to save content: ' + dbError.message)
      }

      if (!gist) throw new Error('Failed to retrieve saved content')

      gistId = gist.id

      return new Response(
        JSON.stringify({ success: true, gist }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )

    } catch (stepError) {
      const message = stepError instanceof Error ? stepError.message : 'Unknown error'

      if (gistId) {
        await supabase
          .from('gists')
          .update({ status: 'failed', meta: { error: message } })
          .eq('id', gistId)
      }

      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
});