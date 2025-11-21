import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation schema - flexible to accept any category string
const publishSchema = z.object({
  topic: z
    .string()
    .trim()
    .min(1, "Topic is required")
    .max(500, "Topic too long (max 500 characters)"),
  imageUrl: z.string().url("Invalid URL format").optional(),
  topicCategory: z.string().trim().optional(),
  sourceUrl: z.string().url("Invalid source URL format").optional(),
  newsPublishedAt: z.string().optional(),
});

serve(async (req) => {
  console.log("🚀 publish-gist started:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // -------- Env checks --------
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY"); // used downstream in generate-gist / tts

    const missingVars: string[] = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!serviceKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!anonKey) missingVars.push("SUPABASE_ANON_KEY");
    if (!openaiApiKey) missingVars.push("OPENAI_API_KEY");

    if (missingVars.length > 0) {
      console.error("❌ Missing env vars:", missingVars.join(", "));
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing env vars: ${missingVars.join(", ")}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Admin client for DB + internal invokes
    const supabaseAdmin = createClient(supabaseUrl!, serviceKey!);

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
      // -------- Step 1: Generate gist content --------
      console.log("📝 Step 1/4: Generating gist content...");
      const generateResponse = await supabaseAdmin.functions.invoke(
        "generate-gist",
        {
          body: { topic },
        }
      );

      if (generateResponse.error || !generateResponse.data) {
        console.error(
          "❌ generate-gist failed:",
          generateResponse.error || "No data"
        );
        throw new Error("Content generation failed");
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
      } = generateResponse.data;

      if (!headline || !context || !narration) {
        console.error("❌ generate-gist returned incomplete data");
        throw new Error("Content generation returned incomplete data");
      }

      // -------- Step 2: Convert narration to speech --------
      console.log("🎙️ Step 2/4: Generating audio...");
      const ttsResponse = await supabaseAdmin.functions.invoke(
        "text-to-speech",
        {
          body: { text: narration, voice: "shimmer", speed: 0.94 },
        }
      );

      if (ttsResponse.error || !ttsResponse.data?.audioUrl) {
        console.error(
          "❌ text-to-speech failed:",
          ttsResponse.error || "No audioUrl"
        );
        throw new Error("Audio generation failed");
      }

      const { audioUrl } = ttsResponse.data;

      // -------- Step 3: Prepare image URL --------
      console.log("🖼️ Step 3/4: Preparing image...");
      let finalImageUrl =
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800";

      if (ai_generated_image) {
        console.log("📤 Uploading AI-generated image to storage...");
        try {
          const imageResponse = await fetch(ai_generated_image);
          if (!imageResponse.ok) {
            throw new Error(
              `Failed to download AI image: ${imageResponse.status}`
            );
          }

          const imageArrayBuffer = await imageResponse.arrayBuffer();
          const imageBuffer = new Uint8Array(imageArrayBuffer);

          const filename = `gist-images/${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.png`;

          const { error: uploadError } = await supabaseAdmin.storage
            .from("gist-audio")
            .upload(filename, imageBuffer, {
              contentType: "image/png",
              upsert: false,
            });

          if (uploadError) {
            console.warn(
              "⚠️ AI image upload failed, using OpenAI URL:",
              uploadError.message
            );
            finalImageUrl = ai_generated_image;
          } else {
            const { data: urlData } = supabaseAdmin.storage
              .from("gist-audio")
              .getPublicUrl(filename);

            finalImageUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.warn("⚠️ AI image handling failed, using OpenAI URL.");
          finalImageUrl = ai_generated_image;
        }
      } else if (imageUrl) {
        finalImageUrl = imageUrl;
      } else if (generatedSourceImageUrl) {
        finalImageUrl = generatedSourceImageUrl;
      }

      // -------- Step 4: Insert into DB --------
      console.log("💾 Step 4/4: Saving to database...");
      const metaPayload: Record<string, unknown> = {};
      if (generatedSourceTitle) metaPayload.source_title = generatedSourceTitle;
      if (generatedSourceExcerpt)
        metaPayload.source_excerpt = generatedSourceExcerpt;
      if (generatedSourceName) metaPayload.source_name = generatedSourceName;
      if (generatedSourceImageUrl)
        metaPayload.source_image_url = generatedSourceImageUrl;
      if (used_api_article) metaPayload.used_api_article = true;

      const gistData: Record<string, any> = {
        headline,
        context,
        script: narration,
        narration,
        audio_url: audioUrl,
        topic,
        topic_category: topicCategory || "Trending",
        image_url: finalImageUrl,
        source_url: sourceUrl || generatedSourceUrl || null,
        news_published_at:
          newsPublishedAt || generatedSourcePublishedAt || null,
        status: "published",
        published_at: new Date().toISOString(),
        meta: Object.keys(metaPayload).length ? metaPayload : undefined,
      };

      const { data: gist, error: dbError } = await supabaseAdmin
        .from("gists")
        .insert(gistData)
        .select()
        .single();

      if (dbError || !gist) {
        console.error("❌ DB insert failed:", dbError?.message);
        throw new Error("Failed to save content");
      }

      gistId = gist.id;
      console.log("✅ Gist published:", gistId);

      return new Response(
        JSON.stringify({
          success: true,
          gist,
          headline: gist.headline,
          audio_url: gist.audio_url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (stepError) {
      console.error("❌ Pipeline failed:", stepError);

      const msg =
        stepError instanceof Error ? stepError.message : "Unknown error";

      let failedStage = "unknown";
      if (
        msg.includes("generate-gist") ||
        msg.includes("Content generation")
      ) {
        failedStage = "generate-gist";
      } else if (
        msg.includes("text-to-speech") ||
        msg.includes("Audio generation")
      ) {
        failedStage = "text-to-speech";
      } else if (msg.includes("save") || msg.includes("DB")) {
        failedStage = "database";
      }

      if (gistId) {
        await supabaseAdmin
          .from("gists")
          .update({ status: "failed", meta: { stage: failedStage } })
          .eq("id", gistId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to process request",
          stage: failedStage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("❌ Fatal publish-gist error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An error occurred processing your request",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});